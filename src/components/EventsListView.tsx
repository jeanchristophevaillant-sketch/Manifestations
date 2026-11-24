import React, { useState } from 'react';
import { ManifestationEvent, UserPreferences } from '../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Star, 
  Sparkles, 
  Check, 
  Clock, 
  EyeOff, 
  ChevronRight, 
  ShieldCheck,
  Trash2,
  Navigation,
  SlidersHorizontal,
  X,
  RotateCcw,
  ArrowUpDown,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getEventSearchUrl } from '../utils/eventLinks';
import {
  getEventDistanceKm,
  formatEventDistanceWithRef,
  compareEventsByDateFavoriteDistance,
} from '../utils/distance';
import { EventVisual } from './EventVisual';
import {
  getLocalTodayStr,
  isEventActiveOrUpcoming,
  formatEventDateDisplay,
  isLongDurationEvent,
  getEventDurationDays,
} from '../utils/dateFormatting';

interface EventsListViewProps {
  events: ManifestationEvent[];
  preferences?: UserPreferences;
  onSelectEvent: (event: ManifestationEvent) => void;
  onToggleFavorite: (eventId: string, e: React.MouseEvent) => void;
  onMarkAsViewed: (eventId: string) => void;
  onHideEvent: (eventId: string, e: React.MouseEvent) => void;
  onToggleHideLongEvents?: () => void;
  onOpenPurgeModal?: () => void;
}

export const EventsListView: React.FC<EventsListViewProps> = ({
  events,
  preferences,
  onSelectEvent,
  onToggleFavorite,
  onMarkAsViewed,
  onHideEvent,
  onToggleHideLongEvents,
  onOpenPurgeModal,
}) => {
  const [search, setSearch] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'favorite'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'relevance'>('date');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<string>('all');
  const [isCustomSliderOpen, setIsCustomSliderOpen] = useState(false);
  const [showLongEventsPreview, setShowLongEventsPreview] = useState(false);

  const hideLongEvents = Boolean(preferences?.hideLongDurationEvents);

  const referenceCity = preferences?.referenceLocation || 'Montpellier';

  // Dynamic categories from actual visible events, sorted cleanly
  const visibleBaseEvents = events.filter((e) => e.status !== 'hidden');
  const availableCategories = Array.from(new Set(visibleBaseEvents.map((e) => e.category)))
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

  const resetAllFilters = () => {
    setSearch('');
    setSelectedThemes([]);
    setRegionFilter('all');
    setStatusFilter('all');
    setMaxDistanceFilter('all');
    setSortBy('date');
  };

  const now = new Date();
  const todayStr = getLocalTodayStr(now);
  const pastYearRegex = /\b(201\d|202[0-5])\b/;

  const baseMatchingEvents = events.filter((ev) => {
    if (ev.status === 'hidden') return false;
    if (!isEventActiveOrUpcoming(ev, todayStr)) return false;
    if (pastYearRegex.test(ev.title)) return false;
    
    // Status filter
    if (statusFilter === 'new' && ev.status !== 'new') return false;
    if (statusFilter === 'favorite' && ev.status !== 'favorite') return false;

    // Themes multi-selection filter
    if (selectedThemes.length > 0 && !selectedThemes.includes(ev.category.toLowerCase())) {
      return false;
    }

    // Region filter
    if (regionFilter !== 'all') {
      if (regionFilter === 'occitanie' && !ev.region.toLowerCase().includes('occitanie')) return false;
      if (regionFilter === 'france' && ev.region.toLowerCase().includes('occitanie')) return false;
    }

    // Distance filter
    if (maxDistanceFilter !== 'all') {
      const maxKm = parseInt(maxDistanceFilter, 10);
      const dist = getEventDistanceKm(ev, preferences?.referenceLocation, preferences?.referenceCoordinates);
      if (dist === null || dist > maxKm) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = ev.title.toLowerCase().includes(q);
      const matchCity = ev.city.toLowerCase().includes(q);
      const matchDept = ev.department?.toLowerCase().includes(q) || false;
      const matchDesc = ev.description.toLowerCase().includes(q);
      const matchLoc = ev.locationDetails?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchCity && !matchDept && !matchDesc && !matchLoc) return false;
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
        preferences?.referenceLocation,
        preferences?.referenceCoordinates
      )
    );

  const filteredEvents = (hideLongEvents
    ? baseMatchingEvents.filter((ev) => !isLongDurationEvent(ev.startDate, ev.endDate, 3))
    : [...baseMatchingEvents]
  ).sort((a, b) => {
    if (sortBy === 'distance') {
      const distA = getEventDistanceKm(a, preferences?.referenceLocation, preferences?.referenceCoordinates) ?? Number.POSITIVE_INFINITY;
      const distB = getEventDistanceKm(b, preferences?.referenceLocation, preferences?.referenceCoordinates) ?? Number.POSITIVE_INFINITY;
      if (distA !== distB) return distA - distB;
      return compareEventsByDateFavoriteDistance(
        a,
        b,
        todayStr,
        preferences?.referenceLocation,
        preferences?.referenceCoordinates
      );
    }
    if (sortBy === 'relevance') {
      const relDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (relDiff !== 0) return relDiff;
      return compareEventsByDateFavoriteDistance(
        a,
        b,
        todayStr,
        preferences?.referenceLocation,
        preferences?.referenceCoordinates
      );
    }
    return compareEventsByDateFavoriteDistance(
      a,
      b,
      todayStr,
      preferences?.referenceLocation,
      preferences?.referenceCoordinates
    );
  });

  const hasActiveFilters = Boolean(
    search.trim() ||
    selectedThemes.length > 0 ||
    maxDistanceFilter !== 'all' ||
    regionFilter !== 'all' ||
    statusFilter !== 'all'
  );

  const distancePresets = [
    { label: 'Toutes distances', value: 'all' },
    { label: '≤ 30 km', value: '30' },
    { label: '≤ 50 km', value: '50' },
    { label: '≤ 80 km', value: '80' },
    { label: '≤ 120 km', value: '120' },
    { label: '≤ 200 km', value: '200' },
  ];

  return (
    <div className="space-y-6">
      {/* Distinct Recessed Search & Filter Control Panel */}
      <section
        aria-label="Filtres de recherche"
        className="bg-slate-200/65 rounded-2xl border border-slate-300/90 p-3.5 sm:p-5 space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-300/70">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Filtres & recherche
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser tous les filtres</span>
            </button>
          )}
        </div>

        {/* Row 1: Search Input & Quick Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une manifestation, festival, fête, ville, département..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[40px] pl-10 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-900 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="min-h-[40px] text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
            >
              <option value="all">Toutes régions</option>
              <option value="occitanie">Occitanie (Prioritaire)</option>
              <option value="france">France entière</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="min-h-[40px] text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
            >
              <option value="all">Tous statuts</option>
              <option value="new">Nouveautés uniquement</option>
              <option value="favorite">Favoris</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-[40px] text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
            >
              <option value="date">Trier par Date, Favoris, Distance</option>
              <option value="distance">Trier par Distance (plus proche)</option>
              <option value="relevance">Trier par Pertinence</option>
            </select>

            {onToggleHideLongEvents && (
              <button
                id="toggle-hide-long-events-list"
                type="button"
                onClick={onToggleHideLongEvents}
                className={`min-h-[40px] flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-semibold transition-colors ${
                  hideLongEvents
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                }`}
                title="Masquer les manifestations qui durent plus de 3 jours (expositions, salons longs…)"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Masquer &gt; 3 j.</span>
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

            {onOpenPurgeModal && (
              <button
                id="btn-purge-from-list"
                type="button"
                onClick={onOpenPurgeModal}
                className="min-h-[40px] flex items-center gap-1 text-xs px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold transition-colors"
                title="Purger la base locale de manifestations"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purger</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: FILTER BY THEMES / DISCIPLINES (Multi-select) */}
        <div className="pt-2.5 border-t border-slate-300/60 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-teal-700" />
                <span>Thèmes / disciplines :</span>
              </span>
              {selectedThemes.length > 0 && (
                <span className="text-[11px] font-bold text-teal-800">
                  ({selectedThemes.length} sélectionné{selectedThemes.length > 1 ? 's' : ''})
                </span>
              )}
            </div>

            {selectedThemes.length > 0 && (
              <button
                type="button"
                onClick={clearThemes}
                className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tout réafficher</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={clearThemes}
              className={`min-h-[36px] sm:min-h-[32px] text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                selectedThemes.length === 0
                  ? 'bg-teal-600 text-white border-teal-700 font-semibold shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300/80 hover:bg-teal-50 hover:border-teal-300'
              }`}
            >
              Tous les thèmes ({events.length})
            </button>

            {availableCategories.map((cat) => {
              const isSelected = selectedThemes.includes(cat.toLowerCase());
              const count = events.filter((e) => e.category.toLowerCase() === cat.toLowerCase()).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleTheme(cat)}
                  className={`min-h-[36px] sm:min-h-[32px] text-xs px-3 py-1.5 rounded-xl border font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-700 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300/80 hover:bg-teal-50 hover:border-teal-300'
                  }`}
                  title={isSelected ? `Retirer "${cat}" du filtre` : `Ajouter "${cat}" au filtre`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{cat}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected ? 'bg-teal-700/70 text-teal-50 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: LIMIT DISTANCE (Rayon kilométrique) */}
        <div className="pt-2.5 border-t border-slate-300/60 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-indigo-700" />
                <span>Distance :</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white text-indigo-900 font-semibold border border-indigo-200">
                Réf. {referenceCity}
              </span>
            </div>

            {maxDistanceFilter !== 'all' && (
              <div className="flex items-center gap-2">
                {sortBy !== 'distance' && (
                  <button
                    type="button"
                    onClick={() => setSortBy('distance')}
                    className="text-[11px] font-semibold text-indigo-800 hover:text-indigo-950 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-indigo-200 transition-colors"
                    title="Mettre les événements les plus proches en premier"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Trier par proximité</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMaxDistanceFilter('all')}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Rayon illimité</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick preset distance buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {distancePresets.map((preset) => {
              const isSelected = maxDistanceFilter === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setMaxDistanceFilter(preset.value)}
                  className={`min-h-[36px] sm:min-h-[32px] text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300/80 hover:bg-indigo-50 hover:border-indigo-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            {/* Custom slider toggle button */}
            <button
              type="button"
              onClick={() => setIsCustomSliderOpen(!isCustomSliderOpen)}
              className={`min-h-[36px] sm:min-h-[32px] text-xs px-2.5 py-1.5 rounded-xl border font-medium flex items-center gap-1 transition-colors ${
                isCustomSliderOpen || (!distancePresets.some(p => p.value === maxDistanceFilter) && maxDistanceFilter !== 'all')
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                  : 'bg-white text-slate-700 border-slate-300/80 hover:bg-indigo-50'
              }`}
              title="Ajuster précisément le curseur de distance"
            >
              <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
              <span>Curseur km</span>
            </button>
          </div>

          {/* Interactive Range Slider (collapsible or active) */}
          {(isCustomSliderOpen || (!distancePresets.some(p => p.value === maxDistanceFilter) && maxDistanceFilter !== 'all')) && (
            <div className="bg-white border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
              <div className="text-xs font-semibold text-indigo-950 shrink-0">
                Rayon personnalisé : <span className="font-bold text-indigo-700 tabular-nums">{maxDistanceFilter === 'all' ? '100' : maxDistanceFilter} km</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={maxDistanceFilter === 'all' ? 100 : parseInt(maxDistanceFilter, 10)}
                onChange={(e) => setMaxDistanceFilter(e.target.value)}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-indigo-100 rounded-lg"
              />
              <div className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                Max 250 km
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Clear Section Divider & Results Count before Manifestation Cards */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-950 tabular-nums">
            {filteredEvents.length} manifestation{filteredEvents.length > 1 ? 's' : ''}
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            sur {events.length} en base
          </span>
          {maxDistanceFilter !== 'all' && (
            <span className="text-xs font-bold text-indigo-700">
              · ≤ {maxDistanceFilter} km de {referenceCity}
            </span>
          )}
          {selectedThemes.length > 0 && (
            <span className="text-xs font-bold text-teal-700">
              · {selectedThemes.length} thème{selectedThemes.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Collapsible banner for hidden >3-day events */}
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
                    <button
                      type="button"
                      onClick={(e) => onHideEvent(ev.id, e)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                      title="Masquer définitivement cette manifestation"
                      aria-label="Masquer définitivement cette manifestation"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">Aucun résultat trouvé</h4>
          <p className="text-xs text-slate-500 mt-1">
            Essayez de modifier votre recherche ou d’élargir vos filtres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => {
            const isNew = ev.status === 'new';
            const isFavorite = ev.status === 'favorite';
            const distanceLabel = formatEventDistanceWithRef(
              ev,
              preferences?.referenceLocation,
              preferences?.referenceCoordinates
            );

            return (
              <article
                key={ev.id}
                onClick={() => {
                  onMarkAsViewed(ev.id);
                  onSelectEvent(ev);
                }}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-teal-500/80 shadow-sm hover:shadow-md overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <EventVisual event={ev} variant="card" />

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Quiet Metadata Row */}
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
                        type="button"
                        onClick={(e) => onToggleFavorite(ev.id, e)}
                        className={`min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-1.5 rounded-xl sm:rounded-lg flex items-center justify-center transition-colors ${
                          isFavorite
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                        }`}
                        title={isFavorite ? 'Retirer' : 'Favori'}
                        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onHideEvent(ev.id, e)}
                        className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] p-1.5 rounded-xl sm:rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100"
                        title="Masquer cette manifestation"
                        aria-label="Masquer cette manifestation"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 1. Primary Focal Point: Title */}
                  <h4 className="text-[17px] sm:text-lg font-extrabold text-slate-950 group-hover:text-teal-700 transition-colors leading-snug tracking-tight line-clamp-2 mb-3">
                    {ev.title}
                  </h4>

                  {/* 2. Prominent Date & Location Key-Facts Block */}
                  <div className="bg-teal-50/45 border border-teal-200/75 rounded-xl p-3 mb-3.5 space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="text-sm font-bold text-slate-900 tabular-nums truncate">
                        {formatEventDateDisplay(ev.startDate, ev.endDate, { variant: 'short', now }).primary}
                      </span>
                    </div>

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

                  {/* 3. Secondary Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {ev.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate max-w-[140px] font-medium">{ev.sourceName}</span>
                  <div className="flex items-center gap-2.5">
                    <a
                      href={getEventSearchUrl(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
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
          })}
        </div>
      )}
    </div>
  );
};
