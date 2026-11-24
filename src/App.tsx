/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ManifestationEvent, UserPreferences, ScanHistoryRecord } from './types';
import { dbService, DEFAULT_PREFERENCES } from './services/db';
import { generateInitialManifestations } from './services/sampleData';
import { mergeAndDeduplicateEvents } from './services/deduplication';
import { runClientSideScan } from './services/standaloneScanner';
import { sanitizeEventUrls } from './utils/eventLinks';
import { classifyEventCategory } from './utils/categories';
import { isValidRemoteImageUrl } from './utils/eventImages';
import { getLocalTodayStr, formatIsoDateLocal } from './utils/dateFormatting';
import { reconcileKnownEventDates } from './utils/knownEventDates';
import { hasPresetCityCoordinates, resolveLocationCoordinates } from './utils/distance';
import { Header } from './components/Header';
import { WeeklyReportView } from './components/WeeklyReportView';
import { TimelineSixMonthsView } from './components/TimelineSixMonthsView';
import { EventsListView } from './components/EventsListView';
import { SettingsView } from './components/SettingsView';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { PurgeConfirmationModal } from './components/PurgeConfirmationModal';
import { ScanProgressNotification } from './components/ScanProgressNotification';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [events, setEvents] = useState<ManifestationEvent[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'report' | 'timeline' | 'all' | 'settings'>('report');
  const [selectedEvent, setSelectedEvent] = useState<ManifestationEvent | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [scanToast, setScanToast] = useState<{
    visible: boolean;
    message: string;
    newCount: number;
    duplicatesCount: number;
  } | null>(null);
  const eventsRef = useRef<ManifestationEvent[]>([]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Silently enrich existing cached events missing promotional/venue visuals in priority batches
  const enrichMissingEventImages = useCallback(async (sourceEvents: ManifestationEvent[]) => {
    const missing = sourceEvents
      .filter((ev) => ev.status !== 'hidden' && !isValidRemoteImageUrl(ev.imageUrl))
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(0, 90);

    if (missing.length === 0) return;

    const batchSize = 45;
    for (let offset = 0; offset < missing.length; offset += batchSize) {
      const chunk = missing.slice(offset, offset + batchSize);
      try {
        const res = await fetch('/api/enrich-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: chunk.map((ev) => ({
              id: ev.id,
              title: ev.title,
              category: ev.category,
              city: ev.city,
              locationDetails: ev.locationDetails,
              sourceUrl: ev.sourceUrl,
            })),
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const imagesMap: Record<string, string> = data?.images || {};
        if (Object.keys(imagesMap).length === 0) continue;

        const baseList = eventsRef.current.length > 0 ? eventsRef.current : sourceEvents;
        let changed = false;
        const nextList = baseList.map((ev) => {
          const newUrl = imagesMap[ev.id];
          if (newUrl && isValidRemoteImageUrl(newUrl) && !isValidRemoteImageUrl(ev.imageUrl)) {
            changed = true;
            return { ...ev, imageUrl: newUrl };
          }
          return ev;
        });

        if (changed) {
          eventsRef.current = nextList;
          setEvents(nextList);
          await dbService.saveEvents(nextList);
        }
      } catch {
        // Ignore network errors silently; thematic illustration fallback covers missing images
      }
    }
  }, []);

  // Silently geocode cached events that lack explicit GPS coordinates and aren't in the preset city dictionary
  const enrichMissingEventCoordinates = useCallback(async (sourceEvents: ManifestationEvent[]) => {
    const candidates = sourceEvents.filter((ev) => {
      if (ev.status === 'hidden') return false;
      const hasCoords =
        typeof ev.latitude === 'number' &&
        typeof ev.longitude === 'number' &&
        Number.isFinite(ev.latitude) &&
        Number.isFinite(ev.longitude) &&
        (ev.latitude !== 0 || ev.longitude !== 0);
      if (hasCoords) return false;
      const cityClean = (ev.city || '').trim();
      if (!cityClean || /^(occitanie|france)$/i.test(cityClean)) return false;
      return !hasPresetCityCoordinates(cityClean);
    });

    if (candidates.length === 0) return;

    // Deduplicate by (city, department) so shared communes only require one API lookup
    const uniqueQueries = new Map<string, string>();
    for (const ev of candidates) {
      const cityClean = ev.city.trim();
      const deptClean = (ev.department || '').replace(/^\d+\s*-\s*/, '').trim();
      const key = `${cityClean.toLowerCase()}__${deptClean.toLowerCase()}`;
      if (!uniqueQueries.has(key)) {
        const query = deptClean && !/^(occitanie|france)$/i.test(deptClean)
          ? `${cityClean} ${deptClean}`
          : cityClean;
        uniqueQueries.set(key, query);
      }
    }

    const entries = Array.from(uniqueQueries.entries()).slice(0, 40);
    const resolvedByKey = new Map<string, { lat: number; lng: number }>();

    const batchSize = 5;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async ([key, query]) => {
          const result = await resolveLocationCoordinates(query);
          if (result?.coordinates) {
            resolvedByKey.set(key, result.coordinates);
          }
        })
      );
    }

    if (resolvedByKey.size === 0) return;

    const baseList = eventsRef.current.length > 0 ? eventsRef.current : sourceEvents;
    let changed = false;
    const nextList = baseList.map((ev) => {
      const hasCoords =
        typeof ev.latitude === 'number' &&
        typeof ev.longitude === 'number' &&
        Number.isFinite(ev.latitude) &&
        Number.isFinite(ev.longitude) &&
        (ev.latitude !== 0 || ev.longitude !== 0);
      if (hasCoords || !ev.city) return ev;

      const deptClean = (ev.department || '').replace(/^\d+\s*-\s*/, '').trim();
      const key = `${ev.city.trim().toLowerCase()}__${deptClean.toLowerCase()}`;
      const coords = resolvedByKey.get(key);
      if (coords) {
        changed = true;
        return { ...ev, latitude: coords.lat, longitude: coords.lng };
      }
      return ev;
    });

    if (changed) {
      eventsRef.current = nextList;
      setEvents(nextList);
      await dbService.saveEvents(nextList);
    }
  }, []);

  // Load initial data from local browser database
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const loadedPrefs = await dbService.getPreferences();
        let loadedEvents = await dbService.getEvents();
        const loadedHistory = await dbService.getScanHistory();

        const horizonMonths = loadedPrefs.timeHorizonMonths || 6;
        // If this is the very first visit, seed initial manifestations into local DB
        if (loadedEvents.length === 0) {
          loadedEvents = generateInitialManifestations(new Date(), horizonMonths);
          await dbService.saveEvents(loadedEvents);
        } else {
          // Auto-repair & sanitize URLs, reconcile known annual event dates, and purge expired events
          let hasModified = false;
          const now = new Date();
          const todayStr = getLocalTodayStr(now);
          const maxHorizonDate = new Date(now.getFullYear(), now.getMonth() + horizonMonths, now.getDate());
          const maxHorizonStr = formatIsoDateLocal(maxHorizonDate);
          const pastYearRegex = /\b(201\d|202[0-5])\b/;

          // Reconcile known annual event dates first (e.g. Open Sud de France -> Jan 31 - Feb 7)
          loadedEvents = loadedEvents.map(ev => {
            const reconciled = reconcileKnownEventDates(ev, now);
            if (reconciled._dateCorrected) {
              hasModified = true;
              const { _dateCorrected, ...cleanEv } = reconciled;
              return cleanEv;
            }
            return ev;
          });

          // Purge expired events, obsolete historical years, or static catalog events now outside horizon
          const initialCount = loadedEvents.length;
          loadedEvents = loadedEvents.filter(ev => {
            if (!ev.startDate) return false;
            const endStr = (ev.endDate || ev.startDate).slice(0, 10);
            const startStr = ev.startDate.slice(0, 10);
            // Event has already passed
            if (endStr < todayStr) return false;
            // Prune non-favorite static catalog events pushed beyond horizon after date reconciliation
            if (
              ev.status !== 'favorite' &&
              ev.sourceType !== 'openagenda' &&
              ev.sourceType !== 'custom_target_site' &&
              startStr > maxHorizonStr
            ) {
              return false;
            }
            // Title or schedule contains an obsolete historical year
            if (pastYearRegex.test(ev.title)) return false;
            if (ev.practicalInfo?.schedule && pastYearRegex.test(ev.practicalInfo.schedule)) {
              return false;
            }
            return true;
          });

          if (loadedEvents.length !== initialCount) {
            hasModified = true;
          }

          // Auto-repair & sanitize URLs, ticketing links, image URLs, and clean up event categories for stored events
          loadedEvents = loadedEvents.map(ev => {
            const repaired = sanitizeEventUrls(ev);
            const cleanCategory = classifyEventCategory(ev.title, ev.description, ev.category);
            const cleanImageUrl = isValidRemoteImageUrl(ev.imageUrl) ? ev.imageUrl : undefined;
            if (
              repaired.sourceUrl !== ev.sourceUrl ||
              repaired.ticketUrl !== ev.ticketUrl ||
              cleanCategory !== ev.category ||
              cleanImageUrl !== ev.imageUrl
            ) {
              hasModified = true;
              return {
                ...repaired,
                category: cleanCategory,
                imageUrl: cleanImageUrl,
              };
            }
            return ev;
          });

          // If the user's local database has no concerts/festivals (e.g. from an earlier sports-only session),
          // merge in the verified major festivals and concerts within horizon so they are immediately visible
          const hasConcertsOrFestivals = loadedEvents.some(
            ev =>
              ev.category?.toLowerCase().includes('musique') ||
              ev.category?.toLowerCase().includes('culture') ||
              ev.category?.toLowerCase().includes('festival') ||
              ev.title?.toLowerCase().includes('concert') ||
              ev.title?.toLowerCase().includes('festival')
          );
          if (!hasConcertsOrFestivals) {
            const sampleWithConcerts = generateInitialManifestations(now, horizonMonths);
            const { mergedEvents } = mergeAndDeduplicateEvents(loadedEvents, sampleWithConcerts);
            loadedEvents = mergedEvents;
            hasModified = true;
          }

          if (hasModified) {
            await dbService.saveEvents(loadedEvents);
          }
        }

        if (isMounted) {
          eventsRef.current = loadedEvents;
          setPreferences(loadedPrefs);
          setEvents(loadedEvents);
          setScanHistory(loadedHistory);
          setIsLoadingInitial(false);

          // Immediately backfill real promotional/venue visuals and missing GPS coordinates for cached events
          void enrichMissingEventImages(loadedEvents);
          void enrichMissingEventCoordinates(loadedEvents);

          // Automated background scan on launch
          // If enabled and either never scanned or last scan > 12 hours ago
          if (loadedPrefs.autoScanOnLaunch) {
            const lastScan = loadedPrefs.lastScanTimestamp ? new Date(loadedPrefs.lastScanTimestamp).getTime() : 0;
            const now = Date.now();
            const twelveHours = 12 * 60 * 60 * 1000;
            if (now - lastScan > twelveHours) {
              // Trigger background scan seamlessly
              setTimeout(() => {
                runBackgroundScan(loadedPrefs, loadedEvents);
              }, 1200);
            }
          }
        }
      } catch (err) {
        console.log('[App Init Notice]:', err);
        if (isMounted) setIsLoadingInitial(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [enrichMissingEventImages, enrichMissingEventCoordinates]);

  // Core background scan execution with smart deduplication & standalone browser fallback
  const runBackgroundScan = useCallback(async (currentPrefs: UserPreferences, currentEvents: ManifestationEvent[]) => {
    setIsScanning(true);
    const startTime = Date.now();

    try {
      let fetchedEvents: ManifestationEvent[] = [];
      let sourcesConsulted: string[] = [];
      let scanSuccessMessage = 'Rapport de veille mis à jour (Base locale)';

      try {
        const activeInterests = currentPrefs.interests
          .filter(i => i.enabled)
          .map(i => ({ name: i.name, category: i.category, keywords: i.keywords }));
        
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interests: activeInterests.length > 0 ? activeInterests : ['VTT', 'Voile', 'windfoil', 'wingfoil', 'Culture & Festivals'],
            geographicFocus: currentPrefs.geographicFocusText || "France avec un approfondissement sur l'Occitanie",
            departments: currentPrefs.selectedDepartments || ['34 - Hérault', '11 - Aude', '30 - Gard', '66 - Pyrénées-Orientales'],
            horizonMonths: currentPrefs.timeHorizonMonths || 6,
            customTargetSites: currentPrefs.customTargetSites || [],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          fetchedEvents = data.events || [];
          sourcesConsulted = data.sourcesConsulted || ['Google Search Grounding', 'Offices de Tourisme', 'FFVoile', 'FFC'];
          if (data.quotaExceeded) {
            scanSuccessMessage = 'Veille actualisée via le catalogue vérifié (Quota API atteint)';
          }
        } else {
          // Fallback to client-side standalone engine
          const standaloneResult = runClientSideScan(currentPrefs, currentEvents);
          fetchedEvents = standaloneResult.newEvents;
          sourcesConsulted = standaloneResult.sourcesConsulted;
        }
      } catch {
        // Network or offline: use client-side standalone engine
        const standaloneResult = runClientSideScan(currentPrefs, currentEvents);
        fetchedEvents = standaloneResult.newEvents;
        sourcesConsulted = standaloneResult.sourcesConsulted;
      }

      // Strict date validation on fetched events: eliminate expired/historical events, preserve ongoing ones
      const today = new Date();
      const todayStr = getLocalTodayStr(today);
      const maxHorizonDate = new Date(today.getFullYear(), today.getMonth() + (currentPrefs.timeHorizonMonths || 6), today.getDate());
      const maxHorizonStr = formatIsoDateLocal(maxHorizonDate);
      const pastYearRegex = /\b(201\d|202[0-5])\b/;

      const cleanFetchedEvents = fetchedEvents
        .map(ev => {
          const reconciled = reconcileKnownEventDates(ev, today);
          const { _dateCorrected, ...cleanEv } = reconciled;
          return {
            ...cleanEv,
            category: classifyEventCategory(cleanEv.title, cleanEv.description, cleanEv.category),
          };
        })
        .filter(ev => {
          if (!ev.startDate) return false;
          const startStr = ev.startDate.slice(0, 10);
          const endStr = (ev.endDate || ev.startDate).slice(0, 10);
          if (endStr < todayStr || startStr > maxHorizonStr) return false;
          if (pastYearRegex.test(ev.title)) return false;
          if (ev.practicalInfo?.schedule && pastYearRegex.test(ev.practicalInfo.schedule)) return false;
          return true;
        });

      // Deduplicate with existing local events
      const { mergedEvents, newEventsAdded, duplicatesPreventedCount } = mergeAndDeduplicateEvents(
        currentEvents,
        cleanFetchedEvents
      );

      // Save updated merged events to local browser database (IndexedDB)
      await dbService.saveEvents(mergedEvents);

      // Record scan history
      const scanRecord: ScanHistoryRecord = {
        id: `scan_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventsFoundCount: fetchedEvents.length,
        newEventsCount: newEventsAdded.length,
        duplicatesPreventedCount,
        durationMs: Date.now() - startTime,
        sourcesConsulted,
        summary: `${newEventsAdded.length} manifestations intégrées, ${duplicatesPreventedCount} doublons évités.`,
      };

      await dbService.addScanRecord(scanRecord);

      // Update preferences with lastScanTimestamp
      const updatedPrefs: UserPreferences = {
        ...currentPrefs,
        lastScanTimestamp: new Date().toISOString(),
      };
      await dbService.savePreferences(updatedPrefs);

      setEvents(mergedEvents);
      setPreferences(updatedPrefs);
      setScanHistory(prev => [scanRecord, ...prev]);

      // Enrich any remaining merged events that still lack a real visual or coordinates
      void enrichMissingEventImages(mergedEvents);
      void enrichMissingEventCoordinates(mergedEvents);

      // Show notification toast
      setScanToast({
        visible: true,
        message: scanSuccessMessage,
        newCount: newEventsAdded.length,
        duplicatesCount: duplicatesPreventedCount,
      });

      // Auto dismiss toast after 6s
      setTimeout(() => {
        setScanToast(prev => prev ? { ...prev, visible: false } : null);
      }, 6000);

    } catch (err: any) {
      console.log('[Veille Scan Notice]:', err?.message || err);
    } finally {
      setIsScanning(false);
    }
  }, [enrichMissingEventImages, enrichMissingEventCoordinates]);

  const handleManualScan = () => {
    if (isScanning) return;
    runBackgroundScan(preferences, events);
  };

  // Toggle Favorite
  const handleToggleFavorite = async (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = events.map(ev => {
      if (ev.id === eventId) {
        const nextStatus = ev.status === 'favorite' ? 'viewed' : 'favorite';
        return { ...ev, status: nextStatus as any };
      }
      return ev;
    });
    setEvents(updated);
    await dbService.saveEvents(updated);
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent(prev => prev ? { ...prev, status: prev.status === 'favorite' ? 'viewed' : 'favorite' } : null);
    }
  };

  // Mark as Viewed
  const handleMarkAsViewed = async (eventId: string) => {
    const target = events.find(e => e.id === eventId);
    if (target && target.status === 'new') {
      const updated = events.map(ev => (ev.id === eventId ? { ...ev, status: 'viewed' as const } : ev));
      setEvents(updated);
      await dbService.saveEvents(updated);
    }
  };

  // Hide Event
  const handleHideEvent = async (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = events.map(ev => (ev.id === eventId ? { ...ev, status: 'hidden' as const } : ev));
    setEvents(updated);
    await dbService.saveEvents(updated);
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent(null);
    }
  };

  // Unhide all manually hidden events
  const handleUnhideAllEvents = async () => {
    const updated = events.map(ev => (ev.status === 'hidden' ? { ...ev, status: 'viewed' as const } : ev));
    setEvents(updated);
    await dbService.saveEvents(updated);
  };

  // Toggle hiding events lasting > 3 days (e.g. exhibitions)
  const handleToggleHideLongEvents = async () => {
    const updated: UserPreferences = {
      ...preferences,
      hideLongDurationEvents: !preferences.hideLongDurationEvents,
    };
    setPreferences(updated);
    await dbService.savePreferences(updated);
  };

  // Save Preferences
  const handleSavePreferences = async (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    await dbService.savePreferences(newPrefs);
  };

  // Purge Handlers
  const handlePurgeOnly = async () => {
    try {
      await dbService.clearEvents();
      setEvents([]);
      setIsPurgeModalOpen(false);
      setScanToast({
        visible: true,
        message: 'Base locale purgée avec succès (0 manifestation). Vos préférences sont conservées.',
        newCount: 0,
        duplicatesCount: 0,
      });
      setTimeout(() => {
        setScanToast(prev => prev ? { ...prev, visible: false } : null);
      }, 5000);
    } catch (err) {
      console.error('Error clearing events:', err);
    }
  };

  const handlePurgeAndRescan = async () => {
    try {
      await dbService.clearEvents();
      setEvents([]);
      setIsPurgeModalOpen(false);
      setScanToast({
        visible: true,
        message: 'Base purgée. Lancement immédiat d’une nouvelle recherche sans limite...',
        newCount: 0,
        duplicatesCount: 0,
      });
      // Launch background scan with empty initial events so no old events persist
      runBackgroundScan(preferences, []);
    } catch (err) {
      console.error('Error during purge & rescan:', err);
    }
  };

  // Reset Data to Clean Seed
  const handleResetData = async () => {
    if (window.confirm('Voulez-vous réinitialiser les manifestations locales et recharger les données types d’Occitanie & France ?')) {
      await dbService.clearAll();
      const freshEvents = generateInitialManifestations(new Date(), DEFAULT_PREFERENCES.timeHorizonMonths || 6);
      await dbService.saveEvents(freshEvents);
      await dbService.savePreferences(DEFAULT_PREFERENCES);
      setEvents(freshEvents);
      setPreferences(DEFAULT_PREFERENCES);
      setScanHistory([]);
      void enrichMissingEventImages(freshEvents);
      void enrichMissingEventCoordinates(freshEvents);
      alert('Base locale réinitialisée avec succès !');
    }
  };

  const newEventsCount = events.filter(e => e.status === 'new').length;
  const hiddenEventsCount = events.filter(e => e.status === 'hidden').length;

  if (isLoadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 animate-pulse shadow-xs">
          <span className="font-bold text-lg">V</span>
        </div>
        <div className="text-sm font-semibold text-slate-600">
          Chargement de la base locale de veille...
        </div>
      </div>
    );
  }

  const activeDisciplinesSummary = preferences.interests
    .filter(i => i.enabled)
    .map(i => i.name.split('&')[0].trim())
    .slice(0, 3)
    .join(', ') + (preferences.interests.filter(i => i.enabled).length > 3 ? '...' : '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-clip">
      
      {/* Top Header & Navigation */}
      <Header
        isScanning={isScanning}
        onTriggerScan={handleManualScan}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
        lastScanTimestamp={preferences.lastScanTimestamp}
        totalEventsCount={events.filter(e => e.status !== 'hidden').length}
        newEventsCount={newEventsCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDisciplinesSummary={activeDisciplinesSummary || 'Toutes disciplines'}
      />

      {/* Main Content Area (with safe bottom padding on mobile for navbar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-8">
        {activeTab === 'report' && (
          <WeeklyReportView
            events={events}
            preferences={preferences}
            onSelectEvent={setSelectedEvent}
            onToggleFavorite={handleToggleFavorite}
            onMarkAsViewed={handleMarkAsViewed}
            onHideEvent={handleHideEvent}
            onToggleHideLongEvents={handleToggleHideLongEvents}
            onSwitchToTimeline={() => setActiveTab('timeline')}
            onTriggerScan={handleManualScan}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
            isScanning={isScanning}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineSixMonthsView
            events={events}
            preferences={preferences}
            onSelectEvent={setSelectedEvent}
            onToggleFavorite={handleToggleFavorite}
            onMarkAsViewed={handleMarkAsViewed}
            onHideEvent={handleHideEvent}
            onToggleHideLongEvents={handleToggleHideLongEvents}
          />
        )}

        {activeTab === 'all' && (
          <EventsListView
            events={events}
            preferences={preferences}
            onSelectEvent={setSelectedEvent}
            onToggleFavorite={handleToggleFavorite}
            onMarkAsViewed={handleMarkAsViewed}
            onHideEvent={handleHideEvent}
            onToggleHideLongEvents={handleToggleHideLongEvents}
            onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            preferences={preferences}
            onSavePreferences={handleSavePreferences}
            scanHistory={scanHistory}
            totalEventsCount={events.length}
            hiddenEventsCount={hiddenEventsCount}
            onUnhideAllEvents={handleUnhideAllEvents}
            onResetData={handleResetData}
            onTriggerScan={handleManualScan}
            onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
            isScanning={isScanning}
          />
        )}
      </main>

      {/* Detail Modal */}
      <EventModal
        event={selectedEvent}
        preferences={preferences}
        onClose={() => setSelectedEvent(null)}
        onToggleFavorite={(id) => handleToggleFavorite(id)}
        onHideEvent={(id) => handleHideEvent(id)}
      />

      {/* Settings Modal (Direct quick access from header & dashboard) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
        onTriggerScan={handleManualScan}
        onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
        eventsCount={events.length}
        hiddenEventsCount={hiddenEventsCount}
        onUnhideAllEvents={handleUnhideAllEvents}
        isScanning={isScanning}
      />

      {/* Purge Confirmation Modal */}
      <PurgeConfirmationModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        eventsCount={events.length}
        onPurgeOnly={handlePurgeOnly}
        onPurgeAndRescan={handlePurgeAndRescan}
        isScanning={isScanning}
      />

      {/* Toast Notification for background scans */}
      <ScanProgressNotification
        isScanning={isScanning}
        scanResultToast={scanToast}
        onDismiss={() => setScanToast(null)}
      />

      {/* Offline connectivity indicator for mobile/desktop */}
      <OfflineIndicator />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        newEventsCount={newEventsCount}
        totalEventsCount={events.filter(e => e.status !== 'hidden').length}
        isScanning={isScanning}
        onTriggerScan={handleManualScan}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 mb-14 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Veille Multi-Disciplines • Occitanie & France • Culture, Patrimoine, Sciences, Gastronomie, Nature, Sports
          </div>
          <div className="text-slate-400">
            Stockage 100% local navigateur (IndexedDB) • Sans plafond de résultats • Déduplication automatique
          </div>
        </div>
      </footer>

    </div>
  );
}
