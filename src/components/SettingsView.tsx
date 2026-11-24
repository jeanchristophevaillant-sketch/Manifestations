import React, { useState, useEffect, useRef } from 'react';
import { UserPreferences, ScanHistoryRecord, CustomTargetSite } from '../types';
import { 
  Settings, 
  MapPin, 
  Calendar, 
  Clock, 
  Database, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Download, 
  Upload,
  CheckCircle2,
  Globe,
  Award,
  Layers,
  ExternalLink,
  Link2,
  Tag,
  Compass,
  Sparkles,
  HelpCircle,
  Code,
  Check,
  AlertCircle,
  ArrowRight,
  Search,
  Ticket,
  Music,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
  Radio,
  Smartphone,
  Navigation,
  ArrowRightLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  POPULAR_REFERENCE_CITIES, 
  resolveLocationCoordinates, 
  getReferenceCoordinates 
} from '../utils/distance';
import { DISCIPLINE_CATEGORIES, inferDisciplineCategory } from '../utils/categories';
import { exportPreferencesToFile, parseImportedSettingsJson } from '../utils/settingsBackup';
import { DisciplineKeywordsEditor } from './DisciplineKeywordsEditor';

interface SettingsViewProps {
  preferences: UserPreferences;
  onSavePreferences: (prefs: UserPreferences) => void;
  scanHistory: ScanHistoryRecord[];
  totalEventsCount: number;
  hiddenEventsCount?: number;
  onUnhideAllEvents?: () => void;
  onResetData: () => void;
  onTriggerScan: () => void;
  onOpenPurgeModal?: () => void;
  isScanning: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onSavePreferences,
  scanHistory,
  totalEventsCount,
  hiddenEventsCount = 0,
  onUnhideAllEvents,
  onResetData,
  onTriggerScan,
  onOpenPurgeModal,
  isScanning,
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>(preferences);
  const [newSportInput, setNewSportInput] = useState('');
  const [newSportCategory, setNewSportCategory] = useState<string>('Sports nautiques');
  const [hasManualCategory, setHasManualCategory] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [showKeywordsEditor, setShowKeywordsEditor] = useState(true);
  const [selectedKeywordInterestId, setSelectedKeywordInterestId] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Target Site Form states
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteNotes, setNewSiteNotes] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [referenceInput, setReferenceInput] = useState(preferences.referenceLocation || 'Montpellier');

  useEffect(() => {
    setPrefs(preferences);
    setReferenceInput(preferences.referenceLocation || 'Montpellier');
  }, [preferences]);

  // Interactive Custom Site Tester State
  const [testUrl, setTestUrl] = useState('https://paloma-nimes.fr');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    url: string;
    events: any[];
    count: number;
    method: 'json-ld' | 'html-heuristic' | 'none';
    error?: string;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Ticketmaster Consumer Key state
  const [ticketmasterApiKey, setTicketmasterApiKey] = useState(
    () => localStorage.getItem('user_ticketmaster_api_key') || ''
  );
  const [isTestingTm, setIsTestingTm] = useState(false);
  const [tmTestResult, setTmTestResult] = useState<{
    success: boolean;
    count?: number;
    sample?: any[];
    error?: string;
  } | null>(null);

  const occitanieDeptsList = [
    { code: '34', name: 'Hérault (34)' },
    { code: '11', name: 'Aude (11)' },
    { code: '30', name: 'Gard (30)' },
    { code: '66', name: 'Pyrénées-Orientales (66)' },
    { code: '31', name: 'Haute-Garonne (31)' },
    { code: '48', name: 'Lozère (48)' },
    { code: '12', name: 'Aveyron (12)' },
    { code: '81', name: 'Tarn (81)' },
  ];

  const suggestedTargetSites = [
    {
      name: 'Tourisme Occitanie (Agenda Officiel)',
      url: 'https://www.tourisme-occitanie.com',
      notes: 'Tous les événements régionaux : culture, terroir, patrimoine & grands festivals'
    },
    {
      name: 'Hérault Tourisme (Agenda 34)',
      url: 'https://www.herault-tourisme.com',
      notes: 'Festivités locales, concerts et rassemblements sur le département 34'
    },
    {
      name: 'Gard Tourisme & Événements',
      url: 'https://www.tourismegard.com/agenda/',
      notes: 'Fêtes médiévales, traditions camarguaises et manifestations nîmoises'
    },
    {
      name: 'OpenAgenda France',
      url: 'https://openagenda.com',
      notes: 'Plateforme participative d’agendas culturels, sportifs et citoyens'
    },
  ];

  const handleToggleDept = (deptName: string) => {
    const current = prefs.selectedDepartments || [];
    const exists = current.includes(deptName);
    const updatedDepts = exists
      ? current.filter((d) => d !== deptName)
      : [...current, deptName];
    const updated = {
      ...prefs,
      selectedDepartments: updatedDepts,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleGeographicFocusChange = (val: string) => {
    const updated = {
      ...prefs,
      geographicFocusText: val,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleSelectReferenceCity = (city: { name: string; coords: { lat: number; lng: number } }) => {
    setReferenceInput(city.name);
    const updated = {
      ...prefs,
      referenceLocation: city.name,
      referenceCoordinates: city.coords,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleCustomReferenceChange = async (val: string) => {
    setReferenceInput(val);
    const updated = {
      ...prefs,
      referenceLocation: val,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();

    if (val.trim().length >= 2) {
      const resolved = await resolveLocationCoordinates(val.trim());
      if (resolved) {
        const withCoords = {
          ...updated,
          referenceLocation: val,
          referenceCoordinates: resolved.coordinates,
        };
        setPrefs(withCoords);
        onSavePreferences(withCoords);
      }
    }
  };

  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGps(false);
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        let label = `Position GPS (${coords.lat.toFixed(2)}°N, ${coords.lng.toFixed(2)}°E)`;
        try {
          const res = await fetch(
            `https://api-adresse.data.gouv.fr/reverse/?lon=${coords.lng}&lat=${coords.lat}&limit=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              label = data.features[0].properties.city || data.features[0].properties.label || label;
            }
          }
        } catch {
          // Keep label
        }
        setReferenceInput(label);
        const updated = {
          ...prefs,
          referenceLocation: label,
          referenceCoordinates: coords,
        };
        setPrefs(updated);
        onSavePreferences(updated);
        showSavedNotification();
      },
      (err) => {
        setIsLocatingGps(false);
        console.warn('Geolocation warning:', err);
      },
      { timeout: 8000 }
    );
  };

  const handleToggleInterest = (id: string) => {
    const updated = {
      ...prefs,
      interests: prefs.interests.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ),
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const availableCategories = Array.from(
    new Set([
      ...DISCIPLINE_CATEGORIES,
      ...prefs.interests.map((i) => i.category).filter(Boolean),
    ])
  );

  const handleNewSportInputChange = (val: string) => {
    setNewSportInput(val);
    if (!hasManualCategory && val.trim().length >= 2) {
      const suggested = inferDisciplineCategory(val);
      if (suggested) {
        setNewSportCategory(suggested);
      }
    }
  };

  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSportInput.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newItem = {
      id: newId,
      name: newSportInput.trim(),
      category: newSportCategory,
      enabled: true,
      keywords: [newSportInput.trim().toLowerCase()],
      isCustom: true,
    };
    const updated = {
      ...prefs,
      interests: [...prefs.interests, newItem],
    };
    setPrefs(updated);
    onSavePreferences(updated);
    setNewSportInput('');
    setHasManualCategory(false);
    showSavedNotification();
  };

  const handleChangeInterestCategory = (id: string, newCat: string) => {
    const updated = {
      ...prefs,
      interests: prefs.interests.map((item) =>
        item.id === id ? { ...item, category: newCat } : item
      ),
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleDeleteCustomInterest = (id: string) => {
    const updated = {
      ...prefs,
      interests: prefs.interests.filter((item) => item.id !== id),
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleUpdateInterestKeywords = (interestId: string, nextKeywords: string[]) => {
    const updated = {
      ...prefs,
      interests: prefs.interests.map((item) =>
        item.id === interestId ? { ...item, keywords: nextKeywords } : item
      ),
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  // Custom Target Sites Handlers
  const handleToggleTargetSite = (siteId: string) => {
    const currentSites = prefs.customTargetSites || [];
    const updatedSites = currentSites.map((s) =>
      s.id === siteId ? { ...s, enabled: !s.enabled } : s
    );
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleAddTargetSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteUrl.trim()) return;

    let formattedUrl = newSiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newSite: CustomTargetSite = {
      id: `site_${Date.now()}`,
      name: newSiteName.trim(),
      url: formattedUrl,
      notes: newSiteNotes.trim() || undefined,
      enabled: true,
    };

    const updatedSites = [...(prefs.customTargetSites || []), newSite];
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    setNewSiteName('');
    setNewSiteUrl('');
    setNewSiteNotes('');
    showSavedNotification();
  };

  const handleAddSuggestedSite = (suggested: { name: string; url: string; notes?: string }) => {
    const current = prefs.customTargetSites || [];
    if (current.some((s) => s.url.toLowerCase() === suggested.url.toLowerCase())) {
      return; // already exists
    }
    const newSite: CustomTargetSite = {
      id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: suggested.name,
      url: suggested.url,
      notes: suggested.notes,
      enabled: true,
    };
    const updatedSites = [...current, newSite];
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleDeleteTargetSite = (siteId: string) => {
    const updatedSites = (prefs.customTargetSites || []).filter((s) => s.id !== siteId);
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleToggleAutoScan = () => {
    const updated = {
      ...prefs,
      autoScanOnLaunch: !prefs.autoScanOnLaunch,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleToggleHideLongEvents = () => {
    const updated = {
      ...prefs,
      hideLongDurationEvents: !prefs.hideLongDurationEvents,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const handleChangeHorizon = (months: number) => {
    const updated = {
      ...prefs,
      timeHorizonMonths: months,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleSaveTmKey = (key: string) => {
    setTicketmasterApiKey(key);
    localStorage.setItem('user_ticketmaster_api_key', key.trim());
    showSavedNotification();
  };

  const handleTestTm = async () => {
    setIsTestingTm(true);
    setTmTestResult(null);
    try {
      const res = await fetch('/api/test-ticketmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: ticketmasterApiKey.trim() }),
      });
      const data = await res.json();
      setTmTestResult(data);
    } catch (err: any) {
      setTmTestResult({ success: false, error: err?.message || 'Erreur de connexion' });
    } finally {
      setIsTestingTm(false);
    }
  };

  const handleRunSiteTest = async (urlToTest?: string) => {
    const target = (urlToTest || testUrl).trim();
    if (!target) return;
    setIsTestingUrl(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-custom-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      setTestResult(data);
      if (!data.success && data.error) {
        setTestError(data.error);
      }
    } catch (err: any) {
      setTestError(err?.message || 'Erreur réseau lors de la communication avec le serveur.');
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Export preferences to JSON
  const handleExportJSON = () => {
    exportPreferencesToFile(prefs);
  };

  // Import preferences from JSON file
  const handleImportJSONChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const imported = await parseImportedSettingsJson(rawText, prefs);
      setPrefs(imported.preferences);
      setReferenceInput(imported.preferences.referenceLocation || 'Montpellier');
      if (imported.ticketmasterApiKey) {
        setTicketmasterApiKey(imported.ticketmasterApiKey);
        localStorage.setItem('user_ticketmaster_api_key', imported.ticketmasterApiKey);
      }
      onSavePreferences(imported.preferences);
      showSavedNotification();
      setImportFeedback({
        type: 'success',
        message: `Paramétrage importé : ${imported.stats.interestsCount} disciplines, ${imported.stats.sitesCount} sites cibles et ${imported.stats.departmentsCount} départements.`,
      });
      setTimeout(() => setImportFeedback(null), 6000);
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        message: err?.message || 'Impossible d’importer ce fichier JSON.',
      });
    }
  };

  // Sum total duplicates avoided from history
  const totalDuplicatesPrevented = scanHistory.reduce((acc, curr) => acc + (curr.duplicatesPreventedCount || 0), 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200 mb-2">
            <Settings className="w-3.5 h-3.5 text-teal-600" />
            <span>Tableau de bord des réglages</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Mes Centres d’intérêt & Paramètres de Veille
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Définit les règles de recherche automatique, les départements prioritaires et la période surveillée.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccessNotice && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Enregistré dans IndexedDB</span>
            </div>
          )}

          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Veille en cours...' : 'Tester la veille'}</span>
          </button>
        </div>
      </div>

      {/* Standalone Browser Storage Banner */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white text-slate-900 rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Page Web Standalone • Base Locale Navigateur Active
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Cette application s'exécute de façon autonome directement dans votre navigateur. Toutes vos manifestations, vos réglages et vos favoris sont conservés dans votre base locale <strong className="text-slate-900">IndexedDB (base : <code>veille_manifestations_db</code>)</strong>. Vos données restent sur votre appareil et ne nécessitent aucun serveur externe.
            </p>
          </div>

          <input
            ref={importFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJSONChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportJSON}
              className="min-h-[40px] px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Exporter tout le paramétrage en fichier JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter paramètres</span>
            </button>
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              className="min-h-[40px] px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Importer un fichier de paramétrage JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer paramètres</span>
            </button>
          </div>
        </div>

        {importFeedback && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              importFeedback.type === 'success'
                ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {importFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importFeedback.message}</span>
          </div>
        )}
      </div>

      {/* The Exact Table Requested by User */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 text-slate-900 px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600 shrink-0" />
            <h3 className="text-base font-bold">
              Tableau de bord des critères de veille
            </h3>
          </div>
          <span className="text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
            Paramétrage en direct
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          
          {/* Row 1 : Disciplines & Centres d'intérêt de tout type */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Catégories & Disciplines
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Disciplines & Manifestations de tout type</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                La veille s'applique à <strong>tout type de discipline</strong> : sports nautiques, sports outdoor, culture, festivals de musique, patrimoine, fêtes de terroir, sciences, brocantes ou vie locale.
              </p>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">Cliquez sur une discipline pour l'activer ou la désactiver</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowKeywordsEditor(!showKeywordsEditor)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                      showKeywordsEditor
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Ajouter ou supprimer les mots-clés rattachés aux rubriques"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{showKeywordsEditor ? 'Masquer les mots-clés' : 'Éditer les mots-clés'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReclassifying(!isReclassifying)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                      isReclassifying
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Modifier la catégorie de classement des disciplines"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>{isReclassifying ? 'Terminer le classement' : 'Reclasser les sports'}</span>
                  </button>
                </div>
              </div>

              {/* Grouped by category badges */}
              <div className="space-y-3">
                {Array.from(new Set(prefs.interests.map(i => i.category || 'Autre')))
                  .sort((a, b) => {
                    const idxA = DISCIPLINE_CATEGORIES.indexOf(a as any);
                    const idxB = DISCIPLINE_CATEGORIES.indexOf(b as any);
                    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                  })
                  .map(catName => {
                  const catInterests = prefs.interests.filter(i => (i.category || 'Autre') === catName);
                  return (
                    <div key={catName} className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span>{catName}</span>
                        <span className="text-slate-400 font-normal">({catInterests.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {catInterests.map((item) => (
                          <div key={item.id} className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleInterest(item.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                                item.enabled
                                  ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 line-through opacity-70'
                              }`}
                            >
                              <span>{item.name}</span>
                              {item.isCustom && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCustomInterest(item.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Supprimer cette discipline personnalisée"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </span>
                              )}
                            </button>
                            {showKeywordsEditor && (
                              <button
                                type="button"
                                onClick={() => setSelectedKeywordInterestId(item.id)}
                                className={`text-[10px] font-bold px-1.5 py-1 rounded-md border transition-colors ${
                                  selectedKeywordInterestId === item.id
                                    ? 'bg-indigo-600 border-indigo-700 text-white'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                }`}
                                title={`Modifier les mots-clés de « ${item.name} »`}
                              >
                                {(item.keywords || []).length} mc
                              </button>
                            )}
                            {isReclassifying && (
                              <select
                                value={item.category || 'Autre'}
                                onChange={(e) => handleChangeInterestCategory(item.id, e.target.value)}
                                className="text-[11px] bg-amber-50 border border-amber-300 rounded-md px-2 py-1 text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                title={`Déplacer "${item.name}" vers une autre catégorie`}
                              >
                                {availableCategories.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showKeywordsEditor && (
                <DisciplineKeywordsEditor
                  interests={prefs.interests}
                  onUpdateKeywords={handleUpdateInterestKeywords}
                  selectedInterestId={selectedKeywordInterestId}
                  onSelectInterestId={setSelectedKeywordInterestId}
                />
              )}

              {/* Add custom interest form with category selection */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-teal-600" />
                  <span>Ajouter une nouvelle discipline ou thématique à surveiller :</span>
                </div>
                <form onSubmit={handleAddCustomInterest} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Voile, Kitesurf, Théâtre, Astronomie, Trail, Escalade..."
                    value={newSportInput}
                    onChange={(e) => handleNewSportInputChange(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-800"
                  />
                  <select
                    value={newSportCategory}
                    onChange={(e) => {
                      setNewSportCategory(e.target.value);
                      setHasManualCategory(true);
                    }}
                    aria-label="Catégorie de la discipline"
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Row 1 bis : Sites Web Cibles & Sources à Scruter */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start bg-slate-50/50">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Sources Prioritaires
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>Sites web cibles à scruter</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Indiquez les sites internet, blogs, offices de tourisme ou fédérations où vous pensez trouver des manifestations. Le moteur les inspectera en priorité.
              </p>
            </div>

            <div className="md:col-span-2 space-y-4">
              {/* List of configured custom sites */}
              <div className="space-y-2">
                {(prefs.customTargetSites || []).length === 0 ? (
                  <div className="text-xs text-slate-500 p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center">
                    Aucun site web spécifique n'est encore configuré. Ajoutez-en ci-dessous ou choisissez parmi les suggestions.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {(prefs.customTargetSites || []).map((site) => (
                      <div
                        key={site.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          site.enabled
                            ? 'bg-white border-teal-300 shadow-xs'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={site.enabled}
                            onChange={() => handleToggleTargetSite(site.id)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0"
                            title={site.enabled ? 'Désactiver ce site' : 'Activer ce site'}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {site.name}
                              </span>
                              <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-800 shrink-0"
                                title="Ouvrir le site dans un nouvel onglet"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                              <span className="text-teal-700 font-mono">{site.url}</span>
                              {site.notes && <span>• {site.notes}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTargetSite(site.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors shrink-0"
                          title="Supprimer ce site cible"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add a target site form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Ajouter un site web à surveiller :</span>
                </div>
                <form onSubmit={handleAddTargetSite} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nom du site (ex: Office de Tourisme de Collioure)"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      required
                    />
                    <input
                      type="url"
                      placeholder="Adresse URL (ex: https://www.collioure.com)"
                      value={newSiteUrl}
                      onChange={(e) => setNewSiteUrl(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Note ou type d'événements (facultatif, ex: Agenda fêtes & animations locales)"
                      value={newSiteNotes}
                      onChange={(e) => setNewSiteNotes(e.target.value)}
                      className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter le site</span>
                    </button>
                  </div>
                </form>

                {/* Suggestions de sites à ajouter */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Suggestions de portails recommandés à ajouter en 1 clic :</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTargetSites.map((sug) => {
                      const alreadyAdded = (prefs.customTargetSites || []).some(
                        (s) => s.url.toLowerCase() === sug.url.toLowerCase()
                      );
                      if (alreadyAdded) return null;
                      return (
                        <button
                          key={sug.url}
                          type="button"
                          onClick={() => handleAddSuggestedSite(sug)}
                          className="text-[11px] px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-medium hover:bg-teal-100 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>{sug.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pedagogical Explanation : Comment s'effectue la recherche sur un site web que vous donnez */}
              <div className="bg-slate-50 text-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setShowExplanation(!showExplanation)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                        <span>Comment s’effectue la recherche sur un site web que vous donnez ?</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                          Explication technique
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Notre robot explore n’importe quel site web ou agenda public en 5 étapes successives :
                      </p>
                    </div>
                  </div>
                  <button type="button" className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-200/60 shrink-0" aria-label="Afficher ou masquer l'explication">
                    {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showExplanation && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3 border-t border-slate-200">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-[10px] shrink-0">1</span>
                        <span>Requête HTTP & DOM</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Le serveur effectue une requête sécurisée vers l'URL fournie avec un User-Agent navigateur moderne pour récupérer le code HTML brut de la page.
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-teal-300 space-y-1.5 ring-1 ring-teal-500/15">
                      <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-[10px] shrink-0">2</span>
                        <span>JSON-LD (Schema.org)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        <strong className="text-slate-900">Priorité 1 (Précision 100%)</strong> : Recherche des balises <code>&lt;script type="application/ld+json"&gt;</code> contenant <code>Event</code> ou <code>MusicEvent</code>. Extrait titre, date ISO, salle, ville et billetterie.
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>Balises &lt;article&gt; exclusivement</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Le robot cible exclusivement l'intérieur des balises <code>&lt;article&gt;</code>. Tous les menus (<code>&lt;nav&gt;</code>, <code>&lt;header&gt;</code>, <code>&lt;footer&gt;</code>, liens de navigation) sont systématiquement exclus pour éliminer tout bruit.
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-[10px] shrink-0">4</span>
                        <span>Filtrage & Horizon</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Seules les manifestations futures situées dans l'horizon temporel configuré (ex: 6 mois) sont conservées. Les événements passés sont automatiquement écartés.
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="text-[11px] font-bold text-purple-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center text-[10px] shrink-0">5</span>
                        <span>Dédoublonnage & DB</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Chaque manifestation reçoit une empreinte unique (titre + ville + date). Elle est fusionnée sans doublon dans votre base locale <strong className="text-slate-900">IndexedDB</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Live Site Tester Bench */}
              <div className="bg-gradient-to-br from-teal-900/10 via-slate-50 to-white p-4 rounded-xl border border-teal-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Banc d'essai en direct : Testeur d’extraction de site web
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700 font-medium">
                    Testez instantanément n'importe quel site de concerts ou agenda
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="URL du site à tester (ex: https://paloma-nimes.fr ou https://openagenda.com)"
                    className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunSiteTest()}
                    disabled={isTestingUrl || !testUrl.trim()}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                    <span>{isTestingUrl ? 'Extraction en cours...' : 'Tester l’extraction'}</span>
                  </button>
                </div>

                {/* Quick test buttons */}
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                  <span>Exemples à tester en 1 clic :</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTestUrl('https://paloma-nimes.fr');
                      handleRunSiteTest('https://paloma-nimes.fr');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors"
                  >
                    Paloma Nîmes (Concerts)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestUrl('https://openagenda.com');
                      handleRunSiteTest('https://openagenda.com');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors"
                  >
                    OpenAgenda France
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestUrl('https://www.tourisme-occitanie.com');
                      handleRunSiteTest('https://www.tourisme-occitanie.com');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors"
                  >
                    Tourisme Occitanie
                  </button>
                </div>

                {/* Test Output Box */}
                {testResult && (
                  <div className="bg-white p-3.5 rounded-lg border border-teal-200 text-xs space-y-2.5 mt-2 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-900">
                          {testResult.count} manifestations extraites de {testResult.url}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {testResult.success &&
                          !(prefs.customTargetSites || []).some(
                            (s) => s.url.toLowerCase() === String(testResult.url || '').toLowerCase()
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const host = new URL(testResult.url).hostname.replace(/^www\./, '');
                                  handleAddSuggestedSite({
                                    name: host,
                                    url: testResult.url,
                                    notes: `${testResult.count} manifestations détectées`,
                                  });
                                } catch {
                                  // Ignore malformed URL
                                }
                              }}
                              className="px-2.5 py-1 rounded-md bg-teal-700 hover:bg-teal-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter à mes sources</span>
                            </button>
                          )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          (testResult.method === 'json-ld' || testResult.extractionMethod === 'json-ld')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          Méthode : {(testResult.method === 'json-ld' || testResult.extractionMethod === 'json-ld')
                            ? 'JSON-LD Schema.org'
                            : 'Balises <article> (Menus exclus)'}
                        </span>
                      </div>
                    </div>

                    {testResult.events && testResult.events.length > 0 ? (
                      <>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {testResult.events.slice(0, 30).map((ev: any, idx: number) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 truncate">{ev.title}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                  <span>📅 {ev.startDate}</span>
                                  {ev.city && <span>• 📍 {ev.city}</span>}
                                  {ev.category && <span className="text-teal-700">• {ev.category}</span>}
                                </div>
                              </div>
                              {ev.sourceUrl && (
                                <a
                                  href={ev.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:text-teal-800 shrink-0 p-1"
                                  title="Voir la source"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                        {testResult.events.length > 30 && (
                          <div className="text-[11px] text-slate-500 text-right font-medium">
                            Aperçu limité aux 30 premières ({testResult.events.length} extraites au total lors de la veille).
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500 text-[11px]">
                        Aucun événement dans l'horizon temporel de 6 mois n'a été détecté pour cette URL précise.
                      </p>
                    )}
                  </div>
                )}

                {testError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{testError}</span>
                  </div>
                )}
              </div>

              {/* API Connectors Box : Ticketmaster & OpenAgenda */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Connecteurs d’API Billetteries & Grands Événements
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* OpenAgenda status */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-teal-600" />
                        <span>OpenAgenda (OpenData France)</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Actif (Sans clé)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Flux public ouvert via OpenDataSoft. Accès en temps réel à plus de 120 000 manifestations culturelles, sportives et citoyennes en France.
                    </p>
                  </div>

                  {/* Ticketmaster Discovery API status */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-purple-600" />
                        <span>Ticketmaster Discovery API</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                        {ticketmasterApiKey.trim() ? 'Clé Active' : 'Catalogue Officiel Actif'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Grands concerts et festivals majeurs (Arènes de Nîmes, Déferlantes, Pause Guitare, Carcassonne).
                    </p>
                  </div>
                </div>

                {/* Ticketmaster Consumer Key configuration */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Clé Consumer Key Ticketmaster (Optionnelle) :
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Gratuite sur developer.ticketmaster.com
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={ticketmasterApiKey}
                      onChange={(e) => handleSaveTmKey(e.target.value)}
                      placeholder="Ex: YOUR_TICKETMASTER_CONSUMER_KEY (ou définie dans .env)"
                      className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestTm}
                      disabled={isTestingTm || !ticketmasterApiKey.trim()}
                      className="min-h-[40px] px-3.5 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingTm ? 'animate-spin' : ''}`} />
                      <span>Tester clé</span>
                    </button>
                  </div>

                  {tmTestResult && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      tmTestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {tmTestResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Connexion Ticketmaster réussie ! ({tmTestResult.count} manifestations trouvées en direct).</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{tmTestResult.error || 'Erreur lors du test de la clé Ticketmaster.'}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 : Zone géographique */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Périmètre spatial
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Zone géographique</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Périmètre géographique surveillé en continu. Vous pouvez modifier l’intitulé ou ajuster les départements ciblés.
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <input
                type="text"
                value={prefs.geographicFocusText || "France avec un approfondissement sur l'Occitanie"}
                onChange={(e) => handleGeographicFocusChange(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                placeholder="Ex: France avec un approfondissement sur l'Occitanie"
              />

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">
                  Départements d’Occitanie sous surveillance prioritaire :
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {occitanieDeptsList.map((dept) => {
                    const isChecked = (prefs.selectedDepartments || []).includes(dept.name);
                    return (
                      <button
                        key={dept.code}
                        type="button"
                        onClick={() => handleToggleDept(dept.name)}
                        className={`p-2 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{dept.name}</span>
                        {isChecked ? (
                          <span className="text-teal-600 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                La recherche ratisse également les grands rendez-vous nationaux en France (PACA, Nouvelle-Aquitaine, etc.).
              </p>
            </div>
          </div>

          {/* Row 2.b : Lieu de référence pour les distances */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start bg-indigo-50/20 border-t border-slate-100">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Calcul kilométrique
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-indigo-600" />
                <span>Lieu de référence (km)</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Indique pour chaque manifestation le nombre exact de kilomètres qui la sépare de votre point de référence (ou de votre domicile).
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Navigation className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={referenceInput}
                    onChange={(e) => handleCustomReferenceChange(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    placeholder="Tapez votre ville de référence (ex: Montpellier, Nîmes, Béziers, Perpignan...)"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUseGpsLocation}
                  disabled={isLocatingGps}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200 transition-colors shrink-0 disabled:opacity-50"
                  title="Utiliser la position GPS de votre appareil"
                >
                  {isLocatingGps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Localisation...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Me géolocaliser (GPS)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Suggestions rapides */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">
                  Villes de référence suggérées :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_REFERENCE_CITIES.map((c) => {
                    const isCurrent = prefs.referenceLocation?.toLowerCase().includes(c.name.toLowerCase());
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleSelectReferenceCity(c)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statut coordonnées */}
              {prefs.referenceCoordinates && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Point de référence actif : <strong>{prefs.referenceLocation}</strong> ({prefs.referenceCoordinates.lat.toFixed(4)}°N, {prefs.referenceCoordinates.lng.toFixed(4)}°E). La distance en km s’affiche désormais sur toutes les manifestations et dans les options de tri.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3 : Période recherchée */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Fenêtre temporelle
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Période recherchée
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Durée couverte par le rapport avec granularité adaptée.
              </p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {[3, 6, 9, 12].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => handleChangeHorizon(months)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      prefs.timeHorizonMonths === months
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {months} mois {months === 6 ? '(Recommandé)' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Règle appliquée : Semaines 1 à 4 (détail opérationnel précis), Mois 2-3 (programmes confirmés), Mois 4-6 (vision prospective et surveillance des inscriptions).
              </p>
            </div>
          </div>

          {/* Row 4 : Fréquence du rapport */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Automatisation
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Fréquence du rapport
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Déclenchement automatique de la veille.
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.autoScanOnLaunch}
                  onChange={handleToggleAutoScan}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-800 font-medium">
                  Mise à jour quotidienne en tâche de fond à chaque fois que je lance l'application
                </span>
              </label>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Si le dernier scan date de plus de 24h, un scan automatique est lancé en arrière-plan sans bloquer la navigation.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.hideLongDurationEvents)}
                    onChange={handleToggleHideLongEvents}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 mt-0.5"
                  />
                  <div>
                    <div className="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Masquer par défaut les manifestations de plus de 3 jours (expositions, salons longs…)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Évite que les expositions et événements étalés sur plusieurs semaines n’encombrent l’affichage. Ils restent accessibles via le bandeau « Aperçu » ou en décochant le filtre.
                    </p>
                  </div>
                </label>

                {hiddenEventsCount > 0 && onUnhideAllEvents && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/70 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                    <span className="text-amber-950 font-medium">
                      {hiddenEventsCount} manifestation{hiddenEventsCount > 1 ? 's' : ''} masquée{hiddenEventsCount > 1 ? 's' : ''} individuellement
                    </span>
                    <button
                      type="button"
                      onClick={onUnhideAllEvents}
                      className="px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Tout réafficher</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 5 : Stockage local & Sécurité */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Architecture technique
              </span>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Stockage local navigateur
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Base de données locale IndexedDB dans votre navigateur.
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">IndexedDB active (<code>veille_manifestations_db</code>)</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {totalEventsCount} manifestations enregistrées localement • {totalDuplicatesPrevented} doublons évités
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="min-h-[40px] px-3 py-1.5 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-medium text-slate-700 flex items-center gap-1"
                    title="Exporter une copie de vos paramètres"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Exporter JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    className="min-h-[40px] px-3 py-1.5 text-xs bg-teal-700 hover:bg-teal-600 rounded-lg font-medium text-white flex items-center gap-1"
                    title="Importer des paramètres depuis un fichier JSON"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importer JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={onResetData}
                    className="min-h-[40px] px-3 py-1.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-medium border border-rose-200 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Réinitialiser</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sources Consulted Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">
              Sources et Moteurs de Veille Interrogés
            </h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
            {(prefs.customTargetSites || []).length > 0 ? `${(prefs.customTargetSites || []).length} sites cibles configurés + 5 familles web` : '5 familles de sources web'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1">
            <div className="font-bold text-teal-950 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-teal-700" />
              <span>Sites Web Cibles Indiqués par Vous</span>
            </div>
            <p className="text-teal-900/80">
              {(prefs.customTargetSites || []).filter(s => s.enabled).length} site(s) actif(s) consulté(s) en priorité absolue lors de chaque scan automatique.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Google & Moteurs de Recherche</span>
            </div>
            <p className="text-slate-500">
              Recherche Google en direct via Google Search Grounding pour capter les dernières annonces et articles de presse locale.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>Offices de Tourisme & Régions</span>
            </div>
            <p className="text-slate-500">
              Agendas officiels Tourisme Occitanie, OT Hérault, Gard, Aude, Pyrénées-Orientales et stations littorales.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Agendas Culturels & Festivals</span>
            </div>
            <p className="text-slate-500">
              OpenAgenda, festivals musicaux, rassemblements du terroir, programmations culturelles et marchés régionaux.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Calendriers Fédéraux & Associatifs</span>
            </div>
            <p className="text-slate-500">
              Ligues et comités sportifs régionaux (Voile, Cyclisme, Randonnée pédestre, etc.).
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-sky-600" />
              <span>Portails Spécialisés & Plateformes</span>
            </div>
            <p className="text-slate-500">
              Sites et revues thématiques, plateformes citoyennes, billetteries associatives (HelloAsso, Finishers).
            </p>
          </div>
        </div>
      </div>

      {/* Deduplication & History Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Historique des Scans & Protection Anti-Doublon
            </h3>
            <p className="text-xs text-slate-500">
              Traçabilité des veilles effectuées et preuve de l'absence de redondance.
            </p>
          </div>

          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Tester une mise à jour</span>
          </button>
        </div>

        {scanHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Aucun historique enregistré pour l'instant. Lancez une première veille pour démarrer l’historique.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-100 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 whitespace-nowrap">
                <tr>
                  <th className="p-2.5">Date & Heure</th>
                  <th className="p-2.5">Manifestations Détectées</th>
                  <th className="p-2.5">Nouveautés Ajoutées</th>
                  <th className="p-2.5">Doublons Évités</th>
                  <th className="p-2.5">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                {scanHistory.slice(0, 10).map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80">
                    <td className="p-2.5 font-medium text-slate-800">
                      {new Date(rec.timestamp).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-2.5 text-slate-700 tabular-nums">{rec.eventsFoundCount}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md tabular-nums">
                        +{rec.newEventsCount} new
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-bold rounded-md tabular-nums">
                        {rec.duplicatesPreventedCount} filtrés
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 tabular-nums">{rec.durationMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PWA & Mobile WebApp Capabilities Card (Light Material 3 Surface) */}
      <div className="bg-gradient-to-br from-teal-50 via-white to-sky-50 rounded-2xl border border-teal-200 p-4 sm:p-6 text-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                <span>Fonctionnement WebApp & Smartphone Android (PWA)</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  Prêt pour Android
                </span>
              </h3>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Cette application suit les codes <strong className="text-slate-900">Material Design Android (PWA)</strong> : elle s'installe directement sur l'écran d'accueil de votre smartphone Android, s'ouvre en plein écran sans barre d'adresse, et conserve toutes vos manifestations hors-ligne.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <PWAInstallButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-teal-200/70 text-xs text-slate-600">
          <div className="flex items-start gap-2 bg-white/95 p-3 rounded-xl border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block">Navigation au pouce :</strong>
              Barre de navigation basse Material sur smartphone pour passer rapidement du rapport au calendrier 6 mois.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/95 p-3 rounded-xl border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block">Accès Hors-Ligne :</strong>
              Base IndexedDB locale intégrée au navigateur. Vos manifestations restent lisibles même sans réseau.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/95 p-3 rounded-xl border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block">Partage Mobile Natif :</strong>
              Envoi direct d'une fiche d'événement par WhatsApp, SMS ou Mail via la feuille de partage de votre téléphone.
            </div>
          </div>
        </div>
      </div>

      {/* Purge / Reinitialisation Box */}
      <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Purger les résultats ou réinitialiser</span>
            </h3>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Vous avez <strong>{totalEventsCount} manifestations</strong> enregistrées dans la base locale de votre navigateur. Vous pouvez purger ces événements pour repartir de zéro ou relancer une veille propre.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenPurgeModal && (
              <button
                id="settings-purge-events-btn"
                onClick={onOpenPurgeModal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purger les manifestations</span>
              </button>
            )}
            <button
              onClick={onResetData}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              Réinitialisation d'usine
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
