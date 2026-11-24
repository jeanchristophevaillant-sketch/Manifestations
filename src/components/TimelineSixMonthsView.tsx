import React, { useState } from 'react';
import { ManifestationEvent, DetailLevel, UserPreferences } from '../types';
import { 
  Calendar, 
  MapPin, 
  Star, 
  Sparkles, 
  ChevronRight,
  Compass,
  AlertCircle,
  Navigation,
  SlidersHorizontal,
  RotateCcw,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
  isLongDurationEvent,
  getEventDurationDays,
} from '../utils/dateFormatting';

interface TimelineSixMonthsViewProps {
  events: ManifestationEvent[];
  preferences?: UserPreferences;
  onSelectEvent: (event: ManifestationEvent) => void;
  onToggleFavorite: (eventId: string, e: React.MouseEvent) => void;
  onMarkAsViewed: (eventId: string) => void;
  onHideEvent?: (eventId: string, e: React.MouseEvent) => void;
  onToggleHideLongEvents?: () => void;
}

export const TimelineSixMonthsView: React.FC<TimelineSixMonthsViewProps> = ({
  events,
  preferences,
  onSelectEvent,
  onToggleFavorite,
  onMarkAsViewed,
  onHideEvent,
  onToggleHideLongEvents,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<string>('all');
  const [showLongEventsPreview, setShowLongEventsPreview] = useState<boolean>(false);

  const hideLongEvents = Boolean(preferences?.hideLongDurationEvents);

  const now = new Date();
  const todayStr = getLocalTodayStr(now);
  const horizonMonths = preferences?.timeHorizonMonths || 6;
  const horizonDate = new Date(now.getFullYear(), now.getMonth() + horizonMonths, now.getDate());
  const horizonMaxStr = formatIsoDateLocal(horizonDate);

  const availableCategories = Array.from(
    new Set(events.filter(e => e.status !== 'hidden').map(e => e.category))
  )
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  // Filter active/upcoming events within horizon
  const pastYearRegex = /\b(201\d|202[0-5])\b/;
  const baseMatchingEvents = events.filter((ev) => {
    if (ev.status === 'hidden') return false;
    if (pastYearRegex.test(ev.title)) return false;
    if (!isEventActiveOrUpcoming(ev, todayStr)) return false;
    const effStart = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    if (effStart > horizonMaxStr) return false;
    if (selectedSport !== 'all' && ev.category.toLowerCase() !== selectedSport.toLowerCase()) return false;
    if (selectedZone !== 'all') {
      if (selectedZone === 'occitanie' && !ev.region.toLowerCase().includes('occitanie')) return false;
      if (selectedZone === 'france' && ev.region.toLowerCase().includes('occitanie')) return false;
    }
    if (maxDistanceFilter !== 'all') {
      const maxKm = parseInt(maxDistanceFilter, 10);
      const dist = getEventDistanceKm(ev, preferences?.referenceLocation, preferences?.referenceCoordinates);
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
        preferences?.referenceLocation,
        preferences?.referenceCoordinates
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
      preferences?.referenceLocation,
      preferences?.referenceCoordinates
    )
  );

  // Group events by the 3 graduated tiers using effective start date:
  // Tier 1: 0 to 30 days (Mois 1 - High detail)
  // Tier 2: 31 to 90 days (Mois 2-3 - Medium detail)
  // Tier 3: 91+ days (Mois 4+ - Low detail / Prospective)
  const tier1 = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    return diffCalendarDays(todayStr, eff) <= 30;
  });

  const tier2 = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    const diffDays = diffCalendarDays(todayStr, eff);
    return diffDays > 30 && diffDays <= 90;
  });

  const tier3 = filteredEvents.filter((ev) => {
    const eff = getEffectiveStartDate(ev.startDate, ev.endDate, todayStr);
    return diffCalendarDays(todayStr, eff) > 90;
  });

  const renderTierCard = (ev: ManifestationEvent, tierIndex: 1 | 2 | 3) => {
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

          {/* Granular detail display based on tier */}
          {tierIndex === 1 && ev.practicalInfo.schedule && (
            <div className="text-xs bg-slate-50 border border-slate-100 text-slate-700 p-2 rounded-lg mb-3">
              <span className="font-semibold text-teal-800">Horaires & Spot : </span>
              {ev.practicalInfo.schedule}
            </div>
          )}

          {tierIndex === 2 && ev.practicalInfo.difficultyOrFormat && (
            <div className="text-xs bg-amber-50/60 border border-amber-100 text-amber-900 p-2 rounded-lg mb-3">
              <span className="font-semibold">Format : </span>
              {ev.practicalInfo.difficultyOrFormat}
            </div>
          )}

          {tierIndex === 3 && (
            <div className="text-xs bg-sky-50/70 border border-sky-100 text-sky-900 p-2 rounded-lg mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Surveillance active des inscriptions prévisionnelles</span>
            </div>
          )}
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate max-w-[140px] font-medium">{ev.sourceName}</span>
          <span className="text-teal-700 font-semibold flex items-center gap-0.5">
            Détails <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Overview Header */}
      <div className="bg-gradient-to-br from-teal-50/80 via-white to-sky-50/70 rounded-2xl border border-teal-200/80 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1.5">
          <Compass className="w-3.5 h-3.5 text-teal-600" />
          <span>Vision temporelle graduée sur 6 mois</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-950">
          Calendrier & Profondeur de Recherche (6 mois)
        </h2>
        <p className="text-xs text-slate-600 max-w-2xl mt-1 leading-relaxed">
          Plus l’échéance est proche (Mois 1), plus la recherche est riche en détails opérationnels. Les mois 2 à 6 assurent la veille prospective.
        </p>
      </div>

      {/* Distinct Recessed Filter Bar */}
      <section
        aria-label="Filtres de la timeline"
        className="bg-slate-200/65 rounded-2xl border border-slate-300/90 p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-300/70">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Filtres de période & critères
            </span>
          </div>
          {(selectedSport !== 'all' || maxDistanceFilter !== 'all' || selectedZone !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedSport('all');
                setMaxDistanceFilter('all');
                setSelectedZone('all');
              }}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="min-h-[40px] w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800"
          >
            <option value="all">Tous les thèmes ({events.length})</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat.toLowerCase()}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={maxDistanceFilter}
            onChange={(e) => setMaxDistanceFilter(e.target.value)}
            className="min-h-[40px] w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800"
            title="Limiter la distance depuis votre point de référence"
          >
            <option value="all">Toutes distances ({preferences?.referenceLocation || 'Montpellier'})</option>
            <option value="30">Moins de 30 km</option>
            <option value="50">Moins de 50 km</option>
            <option value="80">Moins de 80 km</option>
            <option value="120">Moins de 120 km</option>
            <option value="200">Moins de 200 km</option>
          </select>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="min-h-[40px] w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800"
          >
            <option value="all">Toutes zones</option>
            <option value="occitanie">Occitanie (Prioritaire)</option>
            <option value="france">France entière</option>
          </select>
        </div>

        {onToggleHideLongEvents && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-300/60">
            <button
              id="toggle-hide-long-events-timeline"
              type="button"
              onClick={onToggleHideLongEvents}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl border transition-colors font-medium text-xs flex items-center gap-1.5 ${
                hideLongEvents
                  ? 'bg-amber-600 border-amber-700 text-white font-semibold shadow-xs'
                  : 'bg-white border-slate-300/80 text-slate-700 hover:bg-amber-50 hover:border-amber-300'
              }`}
              title="Masquer les manifestations de plus de 3 jours (expositions, festivals longs…)"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Masquer les manifestations &gt; 3 jours (expositions…)</span>
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
          </div>
        )}
      </section>

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

      {/* TIER 1 : MOIS 1 (Semaines 1 à 4) */}
      <div className="bg-slate-50/80 rounded-2xl border border-teal-300/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950">
                  Période 1 : Mois 1 (Semaines 1 à 4)
                </h3>
                <span className="text-xs font-bold text-teal-800">
                  · Détail très élevé
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Horaires précis, spots détaillés, inscriptions ouvertes, contacts organisateurs
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-900 bg-white border border-teal-200 px-2.5 py-1 rounded-lg tabular-nums w-fit">
            {tier1.length} événement{tier1.length > 1 ? 's' : ''}
          </span>
        </div>

        {tier1.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center">
            Aucun événement dans les 30 prochains jours avec les filtres actuels.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tier1.map((ev) => renderTierCard(ev, 1))}
          </div>
        )}
      </div>

      {/* TIER 2 : MOIS 2 À 3 */}
      <div className="bg-slate-50/80 rounded-2xl border border-amber-300/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950">
                  Période 2 : Mois 2 à 3 (J+31 à J+90)
                </h3>
                <span className="text-xs font-bold text-amber-800">
                  · Détail intermédiaire
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Programmes prévisionnels, formats de parcours, confirmation des dates fédérales
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-white border border-amber-200 px-2.5 py-1 rounded-lg tabular-nums w-fit">
            {tier2.length} événement{tier2.length > 1 ? 's' : ''}
          </span>
        </div>

        {tier2.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center">
            Aucun événement répertorié pour les mois 2 et 3.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tier2.map((ev) => renderTierCard(ev, 2))}
          </div>
        )}
      </div>

      {/* TIER 3 : MOIS 4 À 6 */}
      <div className="bg-slate-50/80 rounded-2xl border border-sky-300/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950">
                  Période 3 : Mois 4 à 6 (J+91 à J+180)
                </h3>
                <span className="text-xs font-bold text-sky-800">
                  · Vision prospective & Calendriers
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Grandes manifestations annuelles, surveillance de l’ouverture des inscriptions officielles
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-sky-900 bg-white border border-sky-200 px-2.5 py-1 rounded-lg tabular-nums w-fit">
            {tier3.length} événement{tier3.length > 1 ? 's' : ''}
          </span>
        </div>

        {tier3.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center">
            Aucun événement répertorié pour les mois 4 à 6.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tier3.map((ev) => renderTierCard(ev, 3))}
          </div>
        )}
      </div>

    </div>
  );
};
