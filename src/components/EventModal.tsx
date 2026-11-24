import React, { useState, useEffect } from 'react';
import { ManifestationEvent, UserPreferences } from '../types';
import {
  X,
  Calendar,
  CalendarPlus,
  MapPin,
  Clock,
  Tag,
  ShieldCheck,
  ExternalLink,
  Star,
  Compass,
  Share2,
  Wind,
  CheckCircle2,
  AlertCircle,
  Search,
  Globe,
  Ticket,
  Music,
  RefreshCw,
  Sparkles,
  Check,
  Navigation,
  LogOut,
  EyeOff
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  getEventActionConfig,
  getEventSearchUrl,
} from '../utils/eventLinks';
import {
  formatEventDistanceWithRef,
  getGoogleMapsDirectionsUrl
} from '../utils/distance';
import { EventVisual } from './EventVisual';
import { formatEventDateDisplay, parseLocalDate } from '../utils/dateFormatting';
import {
  buildCalendarEventDraft,
  getCalendarAccessToken,
  getCurrentCalendarUser,
  initGoogleCalendarAuth,
  insertEventToGoogleCalendar,
  logoutGoogleCalendar,
  signInWithGoogleCalendar,
} from '../services/googleCalendar';

interface EventModalProps {
  event: ManifestationEvent | null;
  preferences?: UserPreferences;
  onClose: () => void;
  onToggleFavorite: (eventId: string) => void;
  onHideEvent?: (eventId: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  preferences,
  onClose,
  onToggleFavorite,
  onHideEvent,
}) => {
  if (!event) return null;
  return (
    <EventModalContent
      event={event}
      preferences={preferences}
      onClose={onClose}
      onToggleFavorite={onToggleFavorite}
      onHideEvent={onHideEvent}
    />
  );
};

interface EventModalContentProps {
  event: ManifestationEvent;
  preferences?: UserPreferences;
  onClose: () => void;
  onToggleFavorite: (eventId: string) => void;
  onHideEvent?: (eventId: string) => void;
}

const EventModalContent: React.FC<EventModalContentProps> = ({
  event,
  preferences,
  onClose,
  onToggleFavorite,
  onHideEvent,
}) => {
  const isFavorite = event.status === 'favorite';
  const actionConfig = getEventActionConfig(event);

  // Real-time URL health check state
  const [urlHealth, setUrlHealth] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    httpCode?: number;
    message?: string;
  }>({ status: 'idle' });
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Google Calendar state
  const [calPanelOpen, setCalPanelOpen] = useState<boolean>(false);
  const [calNeedsAuth, setCalNeedsAuth] = useState<boolean>(true);
  const [calUser, setCalUser] = useState<User | null>(() => getCurrentCalendarUser());
  const [isCalLoggingIn, setIsCalLoggingIn] = useState<boolean>(false);
  const [isCalInserting, setIsCalInserting] = useState<boolean>(false);
  const [calError, setCalError] = useState<string | null>(null);
  const [calSuccess, setCalSuccess] = useState<{ htmlLink?: string } | null>(null);

  useEffect(() => {
    setCalPanelOpen(false);
    setCalError(null);
    setCalSuccess(null);
    let mounted = true;

    getCalendarAccessToken().then((tok) => {
      if (mounted) {
        setCalNeedsAuth(!tok);
        setCalUser(getCurrentCalendarUser());
      }
    });

    const unsubscribe = initGoogleCalendarAuth(
      (user) => {
        if (!mounted) return;
        setCalUser(user);
        setCalNeedsAuth(false);
      },
      () => {
        if (!mounted) return;
        setCalUser(null);
        setCalNeedsAuth(true);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [event.id]);

  const handleGoogleCalendarLogin = async () => {
    setIsCalLoggingIn(true);
    setCalError(null);
    try {
      const res = await signInWithGoogleCalendar();
      if (res) {
        setCalUser(res.user);
        setCalNeedsAuth(false);
      }
    } catch (err: any) {
      setCalError(err?.message || 'Connexion à Google Calendar annulée ou impossible.');
    } finally {
      setIsCalLoggingIn(false);
    }
  };

  const handleGoogleCalendarLogout = async () => {
    await logoutGoogleCalendar();
    setCalUser(null);
    setCalNeedsAuth(true);
    setCalSuccess(null);
    setCalError(null);
  };

  const handleConfirmAddToCalendar = async () => {
    setIsCalInserting(true);
    setCalError(null);
    try {
      const result = await insertEventToGoogleCalendar(event);
      setCalSuccess({ htmlLink: result.htmlLink });
    } catch (err: any) {
      if (err?.message === 'AUTH_REQUIRED') {
        setCalNeedsAuth(true);
        setCalError('Session expirée : veuillez vous reconnecter avec Google.');
      } else {
        setCalError(err?.message || "Impossible d'ajouter l'événement à Google Calendar.");
      }
    } finally {
      setIsCalInserting(false);
    }
  };

  // Verify that the origin source URL actually responds without 404
  useEffect(() => {
    if (!actionConfig.sourceUrl) return;

    let isMounted = true;
    setUrlHealth({ status: 'checking' });

    const checkUrl = async () => {
      try {
        const res = await fetch('/api/check-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: actionConfig.sourceUrl }),
        });
        const data = await res.json();
        if (isMounted) {
          if (data.valid) {
            setUrlHealth({
              status: 'valid',
              httpCode: data.status,
              message: data.message || `Site source vérifié et actif (HTTP ${data.status})`,
            });
          } else {
            setUrlHealth({
              status: 'invalid',
              httpCode: data.status,
              message: data.error || `Code HTTP ${data.status}`,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setUrlHealth({
            status: 'invalid',
            message: err?.message || 'Vérification non disponible',
          });
        }
      }
    };

    checkUrl();

    return () => {
      isMounted = false;
    };
  }, [event.id, actionConfig.sourceUrl]);

  const handleManualRecheck = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUrlHealth({ status: 'checking' });
    try {
      const res = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: actionConfig.sourceUrl }),
      });
      const data = await res.json();
      if (data.valid) {
        setUrlHealth({
          status: 'valid',
          httpCode: data.status,
          message: data.message || `Site source vérifié et actif (HTTP ${data.status})`,
        });
      } else {
        setUrlHealth({
          status: 'invalid',
          httpCode: data.status,
          message: data.error || `Code HTTP ${data.status}`,
        });
      }
    } catch (err: any) {
      setUrlHealth({
        status: 'invalid',
        message: err?.message || 'Erreur lors du test',
      });
    }
  };

  const formattedModalDate = formatEventDateDisplay(event.startDate, event.endDate, { variant: 'full' });

  const handleShareOrCopy = async () => {
    const dateText = formattedModalDate.secondary
      ? `${formattedModalDate.primary} ${formattedModalDate.secondary}`
      : formattedModalDate.primary;
    const text = `${event.title} - ${dateText} à ${event.city} (${event.department || ''})\n${event.description}\n${actionConfig.sourceUrl || ''}`;
    
    // Native mobile share sheet if supported (iOS Safari / Android Chrome)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `${event.title} - ${dateText} - ${event.city} (${event.department || ''})`,
          url: actionConfig.sourceUrl || window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Sanitize and format schedule text: if it contains an obsolete historical year (like 2021),
  // replace with the verified upcoming event date and time
  const getDisplaySchedule = () => {
    const raw = event.practicalInfo?.schedule;
    if (!raw) return null;
    const pastYearRegex = /\b(201\d|202[0-5])\b/;
    if (pastYearRegex.test(raw)) {
      const timeMatch = raw.match(/\b\d{1,2}[h:]\d{2}\b/);
      if (event.startDate) {
        const d = parseLocalDate(event.startDate);
        if (d) {
          const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          return timeMatch ? `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}, à ${timeMatch[0]}` : dateStr;
        }
      }
      return timeMatch ? `Séance à ${timeMatch[0]}` : null;
    }
    return raw;
  };

  const displaySchedule = getDisplaySchedule();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Bottom Sheet Drag Handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              event.category.toLowerCase().includes('vtt')
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : event.category.toLowerCase().includes('windfoil')
                ? 'bg-sky-100 text-sky-900 border border-sky-200'
                : 'bg-teal-100 text-teal-900 border border-teal-200'
            }`}>
              {event.category}
            </span>

            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {event.region}
            </span>

            {event.detailLevel === 'high' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                Détail opérationnel précis
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(event.id)}
              className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl sm:rounded-lg flex items-center justify-center transition-colors ${
                isFavorite
                  ? 'text-amber-500 bg-amber-50'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Mettre en favori'}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Mettre en favori'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {onHideEvent && (
              <button
                type="button"
                onClick={() => onHideEvent(event.id)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl sm:rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Masquer cette manifestation"
                aria-label="Masquer cette manifestation"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleShareOrCopy}
              className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl sm:rounded-lg flex items-center justify-center transition-colors ${
                isCopied
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={isCopied ? 'Copié !' : 'Partager'}
              aria-label="Partager la manifestation"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

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
        <div className="p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6">
          
          {/* Event Visual Banner */}
          <EventVisual event={event} variant="modal" />

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {event.title}
            </h2>
            
            {/* Dates & Location */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
              <div className="flex items-start gap-2 text-slate-800">
                <Calendar className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {formattedModalDate.isOngoingLong ? 'Période en cours' : 'Date(s)'}
                    </div>
                    <div className="capitalize">{formattedModalDate.primary}</div>
                    {formattedModalDate.secondary && (
                      <div className="text-slate-500 capitalize">{formattedModalDate.secondary}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCalPanelOpen((prev) => !prev);
                      setCalError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-teal-700" />
                    <span>Ajouter à Google Calendar</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-800">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">Lieu & Spot</div>
                  <div>{event.city} {event.department ? `(${event.department})` : ''}</div>
                  {event.locationDetails && (
                    <div className="text-slate-600 font-medium text-xs">{event.locationDetails}</div>
                  )}
                  {formatEventDistanceWithRef(event, preferences?.referenceLocation, preferences?.referenceCoordinates) && (
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
                        <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Distance : {formatEventDistanceWithRef(event, preferences?.referenceLocation, preferences?.referenceCoordinates)}</span>
                      </div>
                      <a
                        href={getGoogleMapsDirectionsUrl(event, preferences?.referenceLocation || 'Montpellier')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors"
                        title="Ouvrir l’itinéraire Google Maps depuis votre lieu de référence"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Itinéraire Maps</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Google Calendar Confirmation & Sign-in Panel */}
            {calPanelOpen && (() => {
              const draft = buildCalendarEventDraft(event);
              return (
                <div className="mt-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <CalendarPlus className="w-4 h-4 text-indigo-600" />
                      <span>Ajouter cette manifestation à Google Calendar</span>
                    </div>
                    {calUser && !calNeedsAuth && (
                      <button
                        type="button"
                        onClick={handleGoogleCalendarLogout}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-700 transition-colors"
                        title="Se déconnecter de Google"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Déconnexion</span>
                      </button>
                    )}
                  </div>

                  {calError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{calError}</span>
                    </div>
                  )}

                  {calSuccess ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Événement ajouté à votre Google Calendar !</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {calSuccess.htmlLink && (
                          <a
                            href={calSuccess.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                          >
                            <span>Ouvrir dans Google Calendar</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setCalPanelOpen(false)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  ) : calNeedsAuth ? (
                    <div className="space-y-2.5">
                      <p className="text-slate-600 leading-relaxed">
                        Connectez votre compte Google pour enregistrer les dates de cette manifestation dans votre agenda principal Google Calendar.
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleGoogleCalendarLogin}
                          disabled={isCalLoggingIn}
                          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-[#747775] text-[#1f1f1f] text-sm font-medium shadow-2xs transition-colors disabled:opacity-60"
                        >
                          <svg
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 48 48"
                            className="w-[18px] h-[18px] block shrink-0"
                            aria-hidden="true"
                          >
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            <path fill="none" d="M0 0h48v48H0z" />
                          </svg>
                          <span>{isCalLoggingIn ? 'Connexion...' : 'Sign in with Google'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCalPanelOpen(false)}
                          className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border border-indigo-200 p-3 space-y-1.5">
                        <div className="font-bold text-slate-900">
                          Confirmer l’ajout dans votre agenda Google Calendar ?
                        </div>
                        <div className="text-slate-700">
                          <span className="font-semibold">Titre :</span> {draft.summary}
                        </div>
                        <div className="text-slate-700 capitalize">
                          <span className="font-semibold normal-case">Dates :</span>{' '}
                          {formattedModalDate.isOngoingLong
                            ? `${formattedModalDate.primary} (à compter d'aujourd'hui)`
                            : formattedModalDate.secondary
                            ? `${formattedModalDate.primary} ${formattedModalDate.secondary}`
                            : formattedModalDate.primary}
                        </div>
                        {draft.location && (
                          <div className="text-slate-700">
                            <span className="font-semibold">Lieu :</span> {draft.location}
                          </div>
                        )}
                        {calUser?.email && (
                          <div className="text-[11px] text-indigo-700 font-medium pt-0.5">
                            Compte Google : {calUser.email}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmAddToCalendar}
                          disabled={isCalInserting}
                          className="min-h-[38px] px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          <span>
                            {isCalInserting
                              ? 'Ajout en cours...'
                              : 'Confirmer l’ajout dans Google Calendar'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalPanelOpen(false)}
                          disabled={isCalInserting}
                          className="min-h-[38px] px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Présentation
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Practical Information Block */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Informations Pratiques & Détails de Recherche
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {displaySchedule && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Horaires & Déroulement</span>
                  </div>
                  <p className="text-slate-600">{displaySchedule}</p>
                </div>
              )}

              {event.practicalInfo.priceOrRegistration && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    {actionConfig.isConcert ? (
                      <Ticket className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                    )}
                    <span>{actionConfig.isConcert ? 'Tarifs & Billetterie' : 'Tarifs & Inscriptions'}</span>
                  </div>
                  <p className="text-teal-900 font-medium">{event.practicalInfo.priceOrRegistration}</p>
                </div>
              )}

              {event.practicalInfo.difficultyOrFormat && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Compass className="w-3.5 h-3.5 text-amber-600" />
                    <span>Parcours & Format</span>
                  </div>
                  <p className="text-slate-600">{event.practicalInfo.difficultyOrFormat}</p>
                </div>
              )}

              {event.practicalInfo.organizer && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Organisateur & Contact</span>
                  </div>
                  <p className="text-slate-600">
                    {event.practicalInfo.organizer}
                    {event.practicalInfo.contactEmailOrPhone ? ` • ${event.practicalInfo.contactEmailOrPhone}` : ''}
                  </p>
                </div>
              )}

              {event.practicalInfo.conditionsOrSpot && (
                <div className="sm:col-span-2 p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-teal-950">
                    <Wind className="w-3.5 h-3.5 text-teal-600" />
                    <span>Conditions du Spot & Équipement</span>
                  </div>
                  <p className="text-teal-900">{event.practicalInfo.conditionsOrSpot}</p>
                </div>
              )}
            </div>
          </div>

          {/* Direct Web Access & Verified Source Links */}
          <div className="pt-2">
            <div className="p-4 bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-50 rounded-2xl border border-teal-200/80 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  {actionConfig.isConcert ? (
                    <Music className="w-4 h-4 text-purple-700" />
                  ) : (
                    <Globe className="w-4 h-4 text-teal-700" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                    {actionConfig.isConcert 
                      ? 'Site officiel du concert' 
                      : 'Accès direct au site officiel'}
                  </h4>
                </div>
                
                {/* Real-time Link Health Badge */}
                <div className="flex items-center gap-2">
                  {urlHealth.status === 'checking' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                      <span>Test de l'URL en direct...</span>
                    </div>
                  )}

                  {urlHealth.status === 'valid' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Lien source direct vérifié (HTTP {urlHealth.httpCode || 200})</span>
                    </div>
                  )}

                  {urlHealth.status === 'invalid' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                      <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate max-w-[170px]" title={urlHealth.message}>
                        {urlHealth.message || 'Lien à vérifier'}
                      </span>
                      <button 
                        onClick={handleManualRecheck} 
                        className="underline text-amber-900 ml-1 text-[10px] cursor-pointer hover:text-amber-950"
                      >
                        Re-tester
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Accédez directement au site web à l'origine de l'information pour cette manifestation :
              </p>

              {/* Direct Origin Source Link */}
              <div>
                <a
                  href={actionConfig.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-teal-500/50 group-hover:bg-teal-500 transition-colors shrink-0">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-bold truncate">{actionConfig.primaryLabel}</div>
                      <div className="text-[10px] text-teal-100 font-normal truncate">
                        {actionConfig.primarySubtitle}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-teal-200 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              {/* 3. Official Source Provenance & Direct URL */}
              <div className="pt-2.5 border-t border-teal-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="text-slate-500 flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-slate-700">Site à l'origine de l'information :</span>
                  <span className="text-slate-800 font-medium">{event.sourceName}</span>
                </div>

                <a
                  href={actionConfig.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-900 font-semibold hover:underline shrink-0"
                >
                  <span>Ouvrir l'adresse ({actionConfig.sourceDomain})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Discreet Search Engine Fallback */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
                <span>Besoin d'informations complémentaires ou d'affiches du club ?</span>
                <a
                  href={getEventSearchUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-teal-700 font-medium inline-flex items-center gap-1 hover:underline shrink-0"
                >
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Recherche complémentaire sur le web</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
