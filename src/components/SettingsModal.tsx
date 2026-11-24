import React, { useState, useEffect, useRef } from 'react';
import { UserPreferences, CustomTargetSite } from '../types';
import { 
  X, 
  Settings, 
  Layers, 
  MapPin, 
  Calendar, 
  Clock, 
  Database, 
  Plus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Save, 
  RefreshCw,
  Sparkles,
  Globe,
  ExternalLink,
  Link2,
  Compass,
  Navigation,
  ArrowRightLeft,
  Download,
  Upload,
  AlertCircle,
  Tag,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  POPULAR_REFERENCE_CITIES, 
  resolveLocationCoordinates, 
  getReferenceCoordinates 
} from '../utils/distance';
import { DISCIPLINE_CATEGORIES, inferDisciplineCategory } from '../utils/categories';
import { exportPreferencesToFile, parseImportedSettingsJson } from '../utils/settingsBackup';
import { DisciplineKeywordsEditor } from './DisciplineKeywordsEditor';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (prefs: UserPreferences) => void;
  onTriggerScan?: () => void;
  onOpenPurgeModal?: () => void;
  eventsCount?: number;
  hiddenEventsCount?: number;
  onUnhideAllEvents?: () => void;
  isScanning?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  onTriggerScan,
  onOpenPurgeModal,
  eventsCount,
  hiddenEventsCount = 0,
  onUnhideAllEvents,
  isScanning = false,
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>(preferences);
  const [newSportInput, setNewSportInput] = useState('');
  const [newSportCategory, setNewSportCategory] = useState<string>('Sports nautiques');
  const [hasManualCategory, setHasManualCategory] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [showKeywordsEditor, setShowKeywordsEditor] = useState(false);
  const [selectedKeywordInterestId, setSelectedKeywordInterestId] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Target Site Form states
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteNotes, setNewSiteNotes] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [referenceInput, setReferenceInput] = useState(preferences.referenceLocation || 'Montpellier');
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPrefs(preferences);
    setReferenceInput(preferences.referenceLocation || 'Montpellier');
  }, [preferences, isOpen]);

  if (!isOpen) return null;

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
      name: 'Tourisme Occitanie',
      url: 'https://www.tourisme-occitanie.com',
      notes: 'Agenda officiel des grands événements et festivités régionales'
    },
    {
      name: 'Hérault Tourisme (Agenda 34)',
      url: 'https://www.herault-tourisme.com',
      notes: 'Festivals et sorties Hérault'
    },
    {
      name: 'Gard Tourisme',
      url: 'https://www.tourismegard.com/agenda/',
      notes: 'Manifestations et traditions gardoises'
    },
    {
      name: 'OpenAgenda',
      url: 'https://openagenda.com',
      notes: 'Plateforme citoyenne et associative'
    },
  ];

  const handleToggleSport = (id: string) => {
    const updated = {
      ...prefs,
      interests: prefs.interests.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ),
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
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

  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSportInput.trim()) return;
    const name = newSportInput.trim();
    const id = `custom_${Date.now()}`;
    const newItem = {
      id,
      name,
      category: newSportCategory,
      enabled: true,
      keywords: [name.toLowerCase()],
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
    showNotice();
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
    showNotice();
  };

  const handleDeleteSport = (id: string) => {
    const updated = {
      ...prefs,
      interests: prefs.interests.filter((item) => item.id !== id),
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
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
    showNotice();
  };

  // Target Sites Handlers
  const handleToggleTargetSite = (siteId: string) => {
    const currentSites = prefs.customTargetSites || [];
    const updatedSites = currentSites.map((s) =>
      s.id === siteId ? { ...s, enabled: !s.enabled } : s
    );
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
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
    showNotice();
  };

  const handleAddSuggestedSite = (sug: { name: string; url: string; notes?: string }) => {
    const current = prefs.customTargetSites || [];
    if (current.some((s) => s.url.toLowerCase() === sug.url.toLowerCase())) {
      return;
    }
    const newSite: CustomTargetSite = {
      id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: sug.name,
      url: sug.url,
      notes: sug.notes,
      enabled: true,
    };
    const updatedSites = [...current, newSite];
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
  };

  const handleDeleteTargetSite = (siteId: string) => {
    const updatedSites = (prefs.customTargetSites || []).filter((s) => s.id !== siteId);
    const updated = { ...prefs, customTargetSites: updatedSites };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
  };

  const handleGeographicFocusChange = (val: string) => {
    const updated = {
      ...prefs,
      geographicFocusText: val,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
  };

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
    showNotice();
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
    showNotice();
  };

  const handleCustomReferenceChange = async (val: string) => {
    setReferenceInput(val);
    const updated = {
      ...prefs,
      referenceLocation: val,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();

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
      alert("La géolocalisation n'est pas disponible sur cet appareil.");
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
        let label = `Ma position GPS (${coords.lat.toFixed(2)}°N, ${coords.lng.toFixed(2)}°E)`;
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
          // Keep GPS coordinates label
        }
        setReferenceInput(label);
        const updated = {
          ...prefs,
          referenceLocation: label,
          referenceCoordinates: coords,
        };
        setPrefs(updated);
        onSavePreferences(updated);
        showNotice();
      },
      (err) => {
        setIsLocatingGps(false);
        console.warn('Geolocation warning:', err);
      },
      { timeout: 8000 }
    );
  };

  const handleHorizonChange = (months: number) => {
    const updated = {
      ...prefs,
      timeHorizonMonths: months,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
  };

  const handleToggleAutoScan = () => {
    const updated = {
      ...prefs,
      autoScanOnLaunch: !prefs.autoScanOnLaunch,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
  };

  const handleToggleHideLongEvents = () => {
    const updated = {
      ...prefs,
      hideLongDurationEvents: !prefs.hideLongDurationEvents,
    };
    setPrefs(updated);
    onSavePreferences(updated);
    showNotice();
  };

  const showNotice = () => {
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-3xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Bottom Sheet Drag Handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                Modifier mes paramètres de veille
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Sauvegarde automatique dans la base locale (IndexedDB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {saveSuccessNotice && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Enregistré</span>
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl sm:rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 divide-y divide-slate-100">
          
          {/* CRITÈRE 1 : DISCIPLINES & THÉMATIQUES */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold">1</span>
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-teal-600" />
                  <span>Disciplines & Manifestations de tout type</span>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  <span>{showKeywordsEditor ? 'Masquer mots-clés' : 'Mots-clés'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReclassifying(!isReclassifying)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                    isReclassifying
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Changer la catégorie d'un sport ou d'une discipline"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>{isReclassifying ? 'Terminer le classement' : 'Reclasser les sports'}</span>
                </button>
                <span className="text-xs text-slate-400 hidden sm:inline">Cliquez pour activer/désactiver</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              La veille surveille <strong>tous types de disciplines</strong> (sports nautiques, sports outdoor, festivals culturels, patrimoine, gastronomie du terroir, sciences, brocantes...).
            </p>

            {/* Grouped by categories */}
            <div className="space-y-3 pt-1">
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
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>{catName}</span>
                      <span className="text-slate-400 font-normal">({catInterests.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {catInterests.map((item) => (
                        <div key={item.id} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSport(item.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              item.enabled
                                ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                                : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <span>{item.name}</span>
                            {item.isCustom && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSport(item.id);
                                }}
                                className="text-white/80 hover:text-rose-200 ml-0.5"
                                title="Supprimer"
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
                              className="text-[11px] bg-amber-50 border border-amber-300 rounded-md px-1.5 py-1 text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
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
                compact
              />
            )}

            {/* Add new discipline input with category */}
            <form onSubmit={handleAddSport} className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                placeholder="Ajouter un sport ou thème (ex: Voile, Kitesurf, Trail, Escalade, Théâtre...)"
                value={newSportInput}
                onChange={(e) => handleNewSportInputChange(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
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
                className="min-h-[40px] px-3.5 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </form>
          </div>

          {/* CRITÈRE 2 : SITES WEB CIBLES & SOURCES À SCRUTER */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold">2</span>
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-teal-600" />
                  <span>Sites web cibles indiqués par vous</span>
                </label>
              </div>
              <span className="text-xs text-slate-400">Interrogés en priorité absolue</span>
            </div>

            <p className="text-xs text-slate-500">
              Indiquez des sites web précis (offices de tourisme, blogs, portails associatifs) sur lesquels vous pensez pouvoir trouver des manifestations :
            </p>

            {/* List of custom sites */}
            <div className="space-y-1.5">
              {(prefs.customTargetSites || []).map((site) => (
                <div
                  key={site.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    site.enabled ? 'bg-teal-50/40 border-teal-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={site.enabled}
                      onChange={() => handleToggleTargetSite(site.id)}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{site.name}</span>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{site.url}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTargetSite(site.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                    title="Supprimer ce site"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add custom site */}
            <form onSubmit={handleAddTargetSite} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Ajouter un site à surveiller :</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nom (ex: OT Collioure, Agenda Hérault...)"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  required
                />
                <input
                  type="url"
                  placeholder="URL (ex: https://...)"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Note ou type d'événements (facultatif)"
                  value={newSiteNotes}
                  onChange={(e) => setNewSiteNotes(e.target.value)}
                  className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  className="min-h-[40px] sm:min-h-0 px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestedTargetSites.map(sug => {
                  const alreadyAdded = (prefs.customTargetSites || []).some(
                    s => s.url.toLowerCase() === sug.url.toLowerCase()
                  );
                  if (alreadyAdded) return null;
                  return (
                    <button
                      key={sug.url}
                      type="button"
                      onClick={() => handleAddSuggestedSite(sug)}
                      className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-teal-800 hover:border-teal-300 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{sug.name}</span>
                    </button>
                  );
                })}
              </div>
            </form>
          </div>

          {/* CRITÈRE 3 : ZONE GÉOGRAPHIQUE */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold">3</span>
              <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Zone géographique de veille</span>
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Périmètre territorial sous surveillance permanente. Vous pouvez modifier l’intitulé ou cocher vos départements de prédilection :
            </p>

            <input
              type="text"
              value={prefs.geographicFocusText || "France avec un approfondissement sur l'Occitanie"}
              onChange={(e) => handleGeographicFocusChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              placeholder="Ex: France avec un approfondissement sur l'Occitanie"
            />

            <div className="pt-1">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Départements prioritaires d’Occitanie :
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
                      {isChecked && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CRITÈRE 3.B : LIEU DE RÉFÉRENCE POUR LE CALCUL DES DISTANCES */}
          <div className="pt-6 space-y-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold">3.b</span>
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  <span>Lieu de référence pour le calcul des distances (km)</span>
                </label>
              </div>
              {prefs.referenceLocation && (
                <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Actif : {prefs.referenceLocation}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Pour chaque manifestation, l’application calcule et indique le nombre de kilomètres exact entre le lieu de l’événement et votre ville ou point de référence :
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Navigation className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={referenceInput}
                  onChange={(e) => handleCustomReferenceChange(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  placeholder="Tapez votre ville, commune ou code postal (ex: Montpellier, Béziers, Nîmes...)"
                />
              </div>

              <button
                type="button"
                onClick={handleUseGpsLocation}
                disabled={isLocatingGps}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shrink-0 disabled:opacity-50"
                title="Utiliser la géolocalisation actuelle de votre appareil"
              >
                {isLocatingGps ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Localisation en cours...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Me géolocaliser (GPS)</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick preset suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-600">
                Suggestions rapides de villes de référence :
              </span>
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
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verification info pill */}
            {prefs.referenceCoordinates && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Coordonnées GPS actives : <strong>{prefs.referenceCoordinates.lat.toFixed(4)}°N, {prefs.referenceCoordinates.lng.toFixed(4)}°E</strong> — Distance en km calculée à vol d’oiseau (formule de Haversine) et temps d’itinéraire direct.
                </span>
              </div>
            )}
          </div>

          {/* CRITÈRE 4 : PÉRIODE RECHERCHÉE */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold">4</span>
                <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Période recherchée (Horizon temporel)</span>
                </label>
              </div>
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full">
                Actuellement : {prefs.timeHorizonMonths} mois
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Choisissez l’amplitude du calendrier de recherche. Le système applique la règle de proximité (Mois 1 hyper détaillé, Mois 2-3 intermédiaire, Mois 4-6 prospective) :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[3, 6, 9, 12].map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => handleHorizonChange(months)}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                    prefs.timeHorizonMonths === months
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{months} mois</span>
                  <span className="text-[11px] font-normal opacity-90">
                    {months === 6 ? 'Recommandé' : `Horizon J+${months * 30}`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CRITÈRE 5 : FRÉQUENCE DU RAPPORT */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold">5</span>
              <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Fréquence de la mise à jour</span>
              </label>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.autoScanOnLaunch}
                  onChange={handleToggleAutoScan}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Mise à jour quotidienne en tâche de fond à chaque fois que je lance l'application
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Si le dernier scan date de plus de 12 heures, l’application recherche automatiquement les nouvelles manifestations en arrière-plan sans bloquer votre navigation, puis déduplique les résultats.
                  </div>
                </div>
              </label>

              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.hideLongDurationEvents)}
                    onChange={handleToggleHideLongEvents}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Masquer par défaut les manifestations de plus de 3 jours (expositions…)</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Allège l’affichage en regroupant les expositions et événements longs dans un bandeau « Aperçu » repliable.
                    </div>
                  </div>
                </label>

                {hiddenEventsCount > 0 && onUnhideAllEvents && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                    <span className="text-amber-950 font-medium">
                      {hiddenEventsCount} manifestation{hiddenEventsCount > 1 ? 's' : ''} masquée{hiddenEventsCount > 1 ? 's' : ''} manuellement
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

          {/* STOCKAGE LOCAL DU NAVIGATEUR & EXPORT/IMPORT */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Stockage local & Sauvegarde du paramétrage
              </h3>
            </div>
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-3">
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Page web autonome (Standalone) • Base IndexedDB active</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Exportez vos disciplines, sites cibles, départements et lieu de référence dans un fichier JSON pour les sauvegarder ou les transférer vers un autre appareil.
                </p>
              </div>

              <input
                ref={importFileRef}
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const imported = await parseImportedSettingsJson(text, prefs);
                    setPrefs(imported.preferences);
                    setReferenceInput(imported.preferences.referenceLocation || 'Montpellier');
                    if (imported.ticketmasterApiKey) {
                      localStorage.setItem('user_ticketmaster_api_key', imported.ticketmasterApiKey);
                    }
                    onSavePreferences(imported.preferences);
                    setSaveSuccessNotice(true);
                    setTimeout(() => setSaveSuccessNotice(false), 2000);
                    setImportFeedback({
                      type: 'success',
                      message: `Paramétrage importé (${imported.stats.interestsCount} disciplines, ${imported.stats.sitesCount} sites cibles).`,
                    });
                    setTimeout(() => setImportFeedback(null), 6000);
                  } catch (err: any) {
                    setImportFeedback({
                      type: 'error',
                      message: err?.message || 'Fichier JSON invalide.',
                    });
                  }
                }}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportPreferencesToFile(prefs)}
                  className="min-h-[40px] px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Exporter les paramètres</span>
                </button>
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="min-h-[40px] px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importer un fichier</span>
                </button>
              </div>

              {importFeedback && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    importFeedback.type === 'success'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
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
          </div>

          {/* PURGE DES RÉSULTATS */}
          <div className="pt-6 space-y-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Purger les résultats enregistrés
                </h3>
              </div>
              {eventsCount !== undefined && (
                <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  {eventsCount} manifestation{eventsCount > 1 ? 's' : ''} en mémoire
                </span>
              )}
            </div>
            <div className="p-4 bg-rose-50/40 border border-rose-200 rounded-xl text-xs space-y-3">
              <p className="text-slate-600 text-xs leading-relaxed">
                Vous pouvez purger à tout moment l'ensemble des manifestations stockées dans votre navigateur. Cela réinitialise la liste des résultats sans effacer vos préférences (vos disciplines et vos sites cibles sont conservés).
              </p>
              {onOpenPurgeModal && (
                <button
                  type="button"
                  id="btn-purge-from-settings"
                  onClick={() => {
                    onClose();
                    onOpenPurgeModal();
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purger les résultats...</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50/95 backdrop-blur-md px-4 sm:px-6 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Modifications appliquées instantanément</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onTriggerScan && (
              <button
                type="button"
                onClick={() => {
                  onTriggerScan();
                  onClose();
                }}
                disabled={isScanning}
                className="min-h-[42px] px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Tester une veille</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] flex-1 sm:flex-none px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Terminer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

