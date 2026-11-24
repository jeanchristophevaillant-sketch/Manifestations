import React, { useState } from 'react';
import { ManifestationEvent, UserPreferences } from '../types';
import { 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Star, 
  Clock, 
  Sparkles, 
  Check, 
  Tag, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  Filter,
  Navigation,
  RotateCcw,
  SlidersHorizontal,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getEventSearchUrl } from '../utils/eventLinks';
import {
  formatEventDistanceWithRef,
  getEventDistanceKm,
  compareEventsByDateFavoriteDistance,
} from '../utils/distance';
import { EventVisual } from './EventVisual';
import {
  getLocalTodayStr,
  formatIsoDateLocal,
  diffCalendarDays,
  isEventActiveOrUpcoming,
  getEffectiveStartDate,
  formatEventDateDisplay,
  getEventTimingBadge,
  isLongDurationEvent,
  getEventDurationDays,
} from '../utils/dateFormatting';

interface WeeklyReportViewProps {
  events: ManifestationEvent[];
  preferences: UserPreferences;
  onSelectEvent: (event: ManifestationEvent) => void;
  onToggleFavorite: (eventId: string, e: React.MouseEvent) => void;
  onMarkAsViewed: (eventId: string) => void;
  onHideEvent?: (eventId: string, e: React.MouseEvent) => void;
  onToggleHideLongEvents?: () => void;
  onSwitchToTimeline: () => void;
  onTriggerScan: () => void;
  onOpenSettingsModal: () => void;
  onOpenPurgeModal?: () => void;
  isScanning: boolean;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  events,
  preferences,
  onSelectEvent,
  onToggleFavorite,
  onMarkAsViewed,
  onHideEvent,
  onToggleHideLongEvents,
  onSwitchToTimeline,
  onTriggerScan,
  onOpenSettingsModal,
  onOpenPurgeModal,
  isScanning,
}) => {
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<string>('all');
  const [isCustomDistanceOpen, setIsCustomDistanceOpen] = useState<boolean>(false);
  const [showOnlyNew, setShowOnlyNew] = useState<boolean>(false);
  const [viewScope, setViewScope] = useState<'30days' | 'all'>('30days');
  const [showLongEventsPreview, setShowLongEventsPreview] = useState<boolean>(false);

  const hideLongEvents = Boolean(preferences.hideLongDurationEvents);

  const now = new Date();
  const todayStr = getLocalTodayStr(now);
  const thirtyDaysDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
  const thirtyDaysStr = formatIsoDateLocal(thirtyDaysDate);

  // Determine dynamic categories cleanly from actual visible events (no dead 0-count duplicate interest names)
  const visibleBaseEvents = events.filter(e => e.status !== 'hidden');
  const dynamicCategories: string[] = Array.from(
    new Set(visibleBaseEvents.map(e => e.category))
  )
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  const toggleTheme = (themeName: string) => {
    const norm = themeName.toLowerCase();
    setSelectedThemes((prev) => {
      if (prev.includes(norm)) {
        return prev.filter((t) => t !== norm);
      } else {
        return [...prev, norm];
      }
    });
  };

  const clearThemes = () => {
    setSelectedThemes([]);
  };

  const resetAllBannerFilters = () => {
    setSelectedThemes([]);
    setMaxDistanceFilter('all');
    setShowOnlyNew(false);
  };

  // Filter events based on viewScope (30 days vs entire horizon)
  const pastYearRegex = /\b(201\d|202[0-5])\b/;
  const baseMatchingEvents = events.filter((ev) => {
    if (ev.status === 'hidden') return false;
    if (!isEventActiveOrUpcoming(ev, todayStr)) return false;
    if (pastYearRegex.test(ev.title)) return false;
    const effectiveStart = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    if (viewScope === '30days' && effectiveStart > thirtyDaysStr) {
      return false;
    }
    if (showOnlyNew && ev.status !== 'new') return false;
    
    // Theme filter (multi-selection)
    if (selectedThemes.length > 0 && !selectedThemes.includes(ev.category.toLowerCase())) return false;

    // Distance filter
    if (maxDistanceFilter !== 'all') {
      const maxKm = parseInt(maxDistanceFilter, 10);
      const dist = getEventDistanceKm(ev, preferences.referenceLocation, preferences.referenceCoordinates);
      if (dist === null || dist > maxKm) return false;
    }

    return true;
  });

  const longDurationExcludedEvents = baseMatchingEvents
    .filter((ev) => isLongDurationEvent(ev.startDate, ev.endDate, 3))
    .sort((a, b) =>
      compareEventsByDateFavoriteDistance(
        a,
        b,
        todayStr,
        preferences.referenceLocation,
        preferences.referenceCoordinates
      )
    );

  const filteredEvents = (hideLongEvents
    ? baseMatchingEvents.filter((ev) => !isLongDurationEvent(ev.startDate, ev.endDate, 3))
    : [...baseMatchingEvents]
  ).sort((a, b) =>
    compareEventsByDateFavoriteDistance(
      a,
      b,
      todayStr,
      preferences.referenceLocation,
      preferences.referenceCoordinates
    )
  );

  // Group into: "Cette semaine (J+0 à J+7)", "Semaine prochaine (J+8 à J+14)", "Dans 3 à 4 semaines (J+15 à J+30)", and "Mois 2 à 6 (prospection)"
  const week1Events = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    return diffCalendarDays(todayStr, eff) <= 7;
  });

  const week2Events = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    const diffDays = diffCalendarDays(todayStr, eff);
    return diffDays > 7 && diffDays <= 14;
  });

  const laterMonthEvents = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    const diffDays = diffCalendarDays(todayStr, eff);
    return diffDays > 14 && diffDays <= 30;
  });

  const beyondMonthEvents = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    return diffCalendarDays(todayStr, eff) > 30;
  });

  const totalNewInPeriod = events.filter(ev => {
    if (ev.status !== 'new' || !isEventActiveOrUpcoming(ev, todayStr)) return false;
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    return eff <= thirtyDaysStr;
  }).length;

  const activeInterestsSummary = preferences.interests
    .filter(i => i.enabled)
    .map(i => i.name)
    .join(', ') || 'Toutes disciplines';

  const renderEventCard = (ev: ManifestationEvent) => {
    const isNew = ev.status === 'new';
    const isFavorite = ev.status === 'favorite';
    const distanceLabel = formatEventDistanceWithRef(
      ev,
      preferences.referenceLocation,
      preferences.referenceCoordinates
    );
    const timingBadge = getEventTimingBadge(ev.startDate, ev.endDate, now);
    const formattedDate = formatEventDateDisplay(ev.startDate, ev.endDate, { variant: 'card', now });

    return (
      <article
        key={ev.id}
        id={`card-event-${ev.id}`}
        onClick={() => {
          onMarkAsViewed(ev.id);
          onSelectEvent(ev);
        }}
        className="group relative bg-white rounded-2xl border border-slate-200 hover:border-teal-500/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
      >
        <EventVisual event={ev} variant="card" />

        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Quiet Top Metadata Row: Category + New status + Favorite button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="font-bold text-teal-800 truncate">{ev.category}</span>
              {isNew && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Nouveau
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                id={`fav-btn-${ev.id}`}
                type="button"
                onClick={(e) => onToggleFavorite(ev.id, e)}
                className={`min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-1.5 rounded-xl sm:rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                  isFavorite
                    ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                }`}
                title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>

              {onHideEvent && (
                <button
                  type="button"
                  onClick={(e) => onHideEvent(ev.id, e)}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-1.5 rounded-xl sm:rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition-colors shrink-0"
                  title="Masquer cette manifestation"
                  aria-label="Masquer cette manifestation"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 1. Primary Focal Point: Title */}
          <h3 className="text-[17px] sm:text-lg font-extrabold text-slate-950 group-hover:text-teal-700 transition-colors leading-snug tracking-tight line-clamp-2 mb-3">
            {ev.title}
          </h3>

          {/* 2. Prominent Date & Location Key-Facts Block */}
          <div className="bg-teal-50/45 border border-teal-200/75 rounded-xl p-3 mb-3.5 space-y-2">
            {/* Date Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="text-sm font-bold text-slate-900 tabular-nums truncate">
                  {formattedDate.primary}
                </span>
              </div>
              <span
                className={`text-xs font-bold tabular-nums shrink-0 ${
                  timingBadge.isOngoing
                    ? 'text-emerald-700'
                    : timingBadge.isUrgent
                    ? 'text-rose-700'
                    : 'text-teal-800'
                }`}
              >
                {timingBadge.label}
              </span>
            </div>

            {/* Location & Distance Row */}
            <div className="flex items-start justify-between gap-2 pt-2 border-t border-teal-200/50">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="min-w-0 leading-snug">
                  <span className="text-sm font-bold text-slate-900">{ev.city}</span>
                  {ev.department && (
                    <span className="text-xs font-semibold text-slate-600 ml-1">({ev.department})</span>
                  )}
                  {ev.locationDetails && (
                    <p className="text-xs text-slate-600 truncate mt-0.5">{ev.locationDetails}</p>
                  )}
                </div>
              </div>

              {distanceLabel && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 tabular-nums shrink-0 mt-0.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{distanceLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Secondary Description snippet */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {ev.description}
          </p>

          {/* 4. Secondary Practical Details */}
          {(ev.practicalInfo.schedule || ev.practicalInfo.priceOrRegistration || ev.practicalInfo.organizer) && (
            <div className="bg-slate-50/90 rounded-lg px-2.5 py-2 border border-slate-100 text-xs space-y-1 mb-3.5">
              {ev.practicalInfo.schedule && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{ev.practicalInfo.schedule}</span>
                </div>
              )}
              {ev.practicalInfo.priceOrRegistration && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate font-medium text-teal-800">
                    {ev.practicalInfo.priceOrRegistration}
                  </span>
                </div>
              )}
              {ev.practicalInfo.organizer && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
                  <span className="truncate">Org. : {ev.practicalInfo.organizer}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Source & Link */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 truncate max-w-[160px] font-medium" title={ev.sourceName}>
            Source : {ev.sourceName}
          </span>

          <div className="flex items-center gap-2.5">
            <a
              href={getEventSearchUrl(ev)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold hover:underline"
              title="Rechercher la page officielle ou le club organisateur sur le Web"
            >
              <span>Web</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-500 group-hover:text-teal-700 flex items-center font-semibold">
              Fiche <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Executive Report Header */}
      <div className="bg-gradient-to-br from-teal-50/80 via-white to-sky-50/70 text-slate-900 rounded-2xl p-4 sm:p-6 border border-teal-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Rapport de veille • Multi-disciplines</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950">
              {viewScope === '30days' 
                ? 'Manifestations des 4 prochaines semaines' 
                : 'Toutes les manifestations détectées (Horizon 6 mois)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Veille active ({activeInterestsSummary}) en Occitanie et en France.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs shrink-0">
            <div className="text-center px-1 sm:px-2">
              <div className="text-xl sm:text-2xl font-black text-teal-700 tabular-nums">
                {filteredEvents.length}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500">
                {viewScope === '30days' ? 'Proch. 4 sem.' : 'Affichées'}
              </div>
            </div>
            <div className="text-center px-1 sm:px-2 border-x border-slate-200">
              <div className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums">
                {totalNewInPeriod}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500">Nouveautés</div>
            </div>
            <div className="text-center px-1 sm:px-2">
              <div className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums">
                {events.length}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500">En base</div>
            </div>
          </div>
        </div>
      </div>

      {/* Distinct Recessed Filter Control Panel */}
      <section
        aria-label="Filtres des manifestations"
        className="bg-slate-200/65 rounded-2xl border border-slate-300/90 p-3.5 sm:p-4 space-y-3 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-300/70">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Filtres d’affichage
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>
                <strong className="text-slate-900 tabular-nums">{filteredEvents.length}</strong> affichée(s) sur{' '}
                <strong className="text-slate-900 tabular-nums">{events.length}</strong>
              </span>
            </span>
            {(selectedThemes.length > 0 || maxDistanceFilter !== 'all' || showOnlyNew) && (
              <button
                type="button"
                onClick={resetAllBannerFilters}
                className="text-xs text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizon Scope Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-700 font-bold mr-1">Période :</span>
          <button
            id="scope-btn-30days"
            type="button"
            onClick={() => setViewScope('30days')}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl border transition-colors font-medium flex items-center gap-1.5 active:scale-98 ${
              viewScope === '30days'
                ? 'bg-teal-600 border-teal-700 text-white font-semibold shadow-xs'
                : 'bg-white border-slate-300/80 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>4 prochaines semaines</span>
          </button>
          <button
            id="scope-btn-all"
            type="button"
            onClick={() => setViewScope('all')}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl border transition-colors font-medium flex items-center gap-1.5 active:scale-98 ${
              viewScope === 'all'
                ? 'bg-teal-600 border-teal-700 text-white font-semibold shadow-xs'
                : 'bg-white border-slate-300/80 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Horizon 6 mois ({events.length})</span>
          </button>

          {onToggleHideLongEvents && (
            <button
              id="toggle-hide-long-events-report"
              type="button"
              onClick={onToggleHideLongEvents}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl border transition-colors font-medium flex items-center gap-1.5 active:scale-98 ${
                hideLongEvents
                  ? 'bg-amber-600 border-amber-700 text-white font-semibold shadow-xs'
                  : 'bg-white border-slate-300/80 text-slate-700 hover:bg-amber-50 hover:border-amber-300'
              }`}
              title="Masquer les manifestations qui durent plus de 3 jours (expositions, salons longs…) pour alléger l’affichage"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Masquer &gt; 3 jours (expos…)</span>
              {longDurationExcludedEvents.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    hideLongEvents ? 'bg-amber-800/60 text-amber-50 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {longDurationExcludedEvents.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Discipline & Theme Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-2 border-t border-slate-300/60">
          <span className="text-slate-700 font-bold flex items-center gap-1 mr-0.5">
            <Filter className="w-3.5 h-3.5 text-teal-700" />
            <span>Thématiques :</span>
          </span>

          <button
            type="button"
            onClick={clearThemes}
            className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border transition-colors font-medium text-xs active:scale-98 ${
              selectedThemes.length === 0
                ? 'bg-teal-600 border-teal-700 text-white font-semibold shadow-xs'
                : 'bg-white border-slate-300/80 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
            }`}
          >
            Toutes ({events.length})
          </button>

          {dynamicCategories.map((cat) => {
            const isSelected = selectedThemes.includes(cat.toLowerCase());
            const count = events.filter(e => e.category.toLowerCase() === cat.toLowerCase()).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleTheme(cat)}
                className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border transition-colors font-medium text-xs flex items-center gap-1.5 active:scale-98 ${
                  isSelected
                    ? 'bg-teal-600 border-teal-700 text-white font-semibold shadow-xs'
                    : 'bg-white border-slate-300/80 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                }`}
                title={isSelected ? `Retirer "${cat}"` : `Ajouter "${cat}"`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
                <span>{cat}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected ? 'bg-teal-700/70 text-teal-50 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowOnlyNew(!showOnlyNew)}
            className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 font-medium text-xs active:scale-98 ${
              showOnlyNew
                ? 'bg-emerald-600 border-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-white border-slate-300/80 text-slate-700 hover:bg-emerald-50/80'
            }`}
          >
            <Check className={`w-3 h-3 ${showOnlyNew ? 'opacity-100 text-white' : 'opacity-40'}`} />
            <span>Nouveaux uniquement</span>
          </button>
        </div>

        {/* Limit Distance Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-2 border-t border-slate-300/60">
          <span className="text-slate-700 font-bold flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-indigo-700" />
            <span>Distance :</span>
          </span>
          <span className="text-[11px] text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
            Réf. {preferences.referenceLocation || 'Montpellier'}
          </span>

          {[
            { label: 'Toutes distances', value: 'all' },
            { label: '≤ 30 km', value: '30' },
            { label: '≤ 50 km', value: '50' },
            { label: '≤ 80 km', value: '80' },
            { label: '≤ 120 km', value: '120' },
            { label: '≤ 200 km', value: '200' },
          ].map((preset) => {
            const isSelected = maxDistanceFilter === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => setMaxDistanceFilter(preset.value)}
                className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border transition-colors font-medium text-xs active:scale-98 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-700 text-white font-semibold shadow-xs'
                    : 'bg-white border-slate-300/80 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCustomDistanceOpen(!isCustomDistanceOpen)}
            className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl border transition-colors font-medium text-xs flex items-center gap-1.5 active:scale-98 ${
              isCustomDistanceOpen
                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold'
                : 'bg-white text-slate-700 border-slate-300/80 hover:bg-indigo-50 hover:border-indigo-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
            <span>Curseur km</span>
          </button>
        </div>

        {/* Interactive Distance Slider */}
        {isCustomDistanceOpen && (
          <div className="bg-white border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
            <span className="text-xs text-indigo-900 font-semibold shrink-0">
              Rayon personnalisé : <strong className="text-indigo-700 tabular-nums">{maxDistanceFilter === 'all' ? '100' : maxDistanceFilter} km</strong>
            </span>
            <input
              type="range"
              min="10"
              max="250"
              step="5"
              value={maxDistanceFilter === 'all' ? 100 : parseInt(maxDistanceFilter, 10)}
              onChange={(e) => setMaxDistanceFilter(e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-indigo-100 rounded-lg"
            />
            <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
              Max 250 km de {preferences.referenceLocation || 'Montpellier'}
            </span>
          </div>
        )}
      </section>

      {/* Collapsible banner for hidden >3-day events (exhibitions, long festivals) */}
      {hideLongEvents && longDurationExcludedEvents.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-950 font-medium">
              <EyeOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                <strong className="tabular-nums">{longDurationExcludedEvents.length}</strong> manifestation
                {longDurationExcludedEvents.length > 1 ? 's' : ''} de plus de 3 jours masquée
                {longDurationExcludedEvents.length > 1 ? 's' : ''} (expositions, festivals longs…)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLongEventsPreview((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1"
              >
                {showLongEventsPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showLongEventsPreview ? 'Réduire' : 'Aperçu'}</span>
              </button>
              {onToggleHideLongEvents && (
                <button
                  type="button"
                  onClick={onToggleHideLongEvents}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Tout réafficher</span>
                </button>
              )}
            </div>
          </div>

          {showLongEventsPreview && (
            <div className="pt-2 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {longDurationExcludedEvents.map((ev) => {
                const durDays = getEventDurationDays(ev.startDate, ev.endDate);
                const dateLabel = formatEventDateDisplay(ev.startDate, ev.endDate, { variant: 'short', now }).primary;
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onMarkAsViewed(ev.id);
                      onSelectEvent(ev);
                    }}
                    className="bg-white rounded-lg border border-amber-200/90 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:border-teal-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {dateLabel} · {ev.city} ({durDays} j.)
                      </div>
                    </div>
                    {onHideEvent && (
                      <button
                        type="button"
                        onClick={(e) => onHideEvent(ev.id, e)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                        title="Masquer définitivement cette manifestation"
                        aria-label="Masquer définitivement cette manifestation"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sections by Week (Events Zone) */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            Aucune manifestation dans ce créneau
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Aucun événement ne correspond à vos filtres actuels pour les 4 prochaines semaines.
            Vous pouvez relancer la veille ou consulter l’horizon 6 mois.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Relancer la veille maintenant
            </button>
            <button
              onClick={onSwitchToTimeline}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              Voir le calendrier 6 mois
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 pt-1">
          
          {/* Week 1 : J+0 à J+7 */}
          {week1Events.length > 0 && (
            <section className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-950">
                    Cette semaine (J+0 à J+7)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {week1Events.length} manifestation{week1Events.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {week1Events.map(renderEventCard)}
              </div>
            </section>
          )}

          {/* Week 2 : J+8 à J+14 */}
          {week2Events.length > 0 && (
            <section className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-950">
                    Semaine prochaine (J+8 à J+14)
                  </h3>
                  <span className="text-xs font-semibold text-amber-800">
                    · Détail élevé & Inscriptions ouvertes
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {week2Events.length} manifestation{week2Events.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {week2Events.map(renderEventCard)}
              </div>
            </section>
          )}

          {/* Weeks 3 & 4 : J+15 à J+30 */}
          {laterMonthEvents.length > 0 && (
            <section className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-950">
                    Dans 3 à 4 semaines (J+15 à J+30)
                  </h3>
                  <span className="text-xs font-semibold text-teal-800">
                    · Programmes détaillés
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {laterMonthEvents.length} manifestation{laterMonthEvents.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {laterMonthEvents.map(renderEventCard)}
              </div>
            </section>
          )}

          {/* Mois 2 à 6 (J+31 et au-delà) - Affiché lorsque le filtre horizon est sur 'Tout l'horizon' */}
          {beyondMonthEvents.length > 0 && (
            <section className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-950">
                    Mois 2 à 6 (Prospection & Grandes Manifestations)
                  </h3>
                  <span className="text-xs font-semibold text-indigo-800">
                    · Dates confirmées
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {beyondMonthEvents.length} manifestation{beyondMonthEvents.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {beyondMonthEvents.map(renderEventCard)}
              </div>
            </section>
          )}

          {/* Link to see 6-month horizon */}
          <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-900">
                Vous souhaitez anticiper les mois 2 à 6 ?
              </h4>
              <p className="text-xs text-slate-600">
                Consultez la timeline prospective à 6 mois (Défi Wind Gruissan, Roc d’Azur, Raids VTT Cévennes, Mondial du Vent...).
              </p>
            </div>
            <button
              onClick={onSwitchToTimeline}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>Ouvrir la Timeline 6 Mois</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
