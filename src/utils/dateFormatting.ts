import { ManifestationEvent } from '../types';

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const MONTHS_FR_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const WEEKDAYS_FR_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WEEKDAYS_FR_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Formats a JS Date into local calendar 'YYYY-MM-DD' without UTC timezone shift.
 */
export function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns today's local calendar date string 'YYYY-MM-DD'.
 */
export function getLocalTodayStr(now: Date = new Date()): string {
  return formatIsoDateLocal(now);
}

/**
 * Parses a 'YYYY-MM-DD' (or ISO datetime) string as a local calendar Date at noon
 * so DST or negative UTC offsets never shift the calendar day backward.
 */
export function parseLocalDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const isoDayMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDayMatch) {
    const y = parseInt(isoDayMatch[1], 10);
    const m = parseInt(isoDayMatch[2], 10);
    const day = parseInt(isoDayMatch[3], 10);
    const d = new Date(y, m - 1, day, 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Returns integer difference in calendar days: (endStr - startStr).
 */
export function diffCalendarDays(startStr: string, endStr: string): number {
  const d1 = parseLocalDate(startStr);
  const d2 = parseLocalDate(endStr);
  if (!d1 || !d2) return 0;
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Returns inclusive calendar duration in days (e.g. same-day event = 1, Fri-Sun = 3).
 */
export function getEventDurationDays(startDate: string, endDate?: string): number {
  if (!startDate) return 1;
  const startIso = startDate.slice(0, 10);
  const endIso = (endDate || startDate).slice(0, 10);
  if (!endIso || endIso <= startIso) return 1;
  return Math.max(1, diffCalendarDays(startIso, endIso) + 1);
}

/**
 * Returns true if the event spans strictly more than thresholdDays calendar days (default > 3 days).
 */
export function isLongDurationEvent(
  startDate: string,
  endDate?: string,
  thresholdDays: number = 3
): boolean {
  return getEventDurationDays(startDate, endDate) > thresholdDays;
}

/**
 * Returns true if the event spans strictly more than 5 days AND already started before today,
 * while still being ongoing today or later.
 */
export function isOngoingLongEvent(
  startDate: string,
  endDate?: string,
  now: Date = new Date()
): boolean {
  if (!startDate || !endDate) return false;
  const todayStr = getLocalTodayStr(now);
  const startIso = startDate.slice(0, 10);
  const endIso = endDate.slice(0, 10);
  if (startIso >= todayStr) return false;
  if (endIso < todayStr) return false;
  return diffCalendarDays(startIso, endIso) > 5;
}

/**
 * Returns true if the event is still ongoing or upcoming (endDate >= todayStr).
 */
export function isEventActiveOrUpcoming(
  ev: Pick<ManifestationEvent, 'startDate' | 'endDate'>,
  todayStr: string = getLocalTodayStr()
): boolean {
  if (!ev.startDate) return false;
  const endIso = (ev.endDate || ev.startDate).slice(0, 10);
  return endIso >= todayStr;
}

/**
 * Effective date used for sorting and time-window bucketing (ongoing events start at today).
 */
export function getEffectiveStartDate(
  startDate: string,
  endDate?: string,
  todayStr: string = getLocalTodayStr()
): string {
  const startIso = startDate.slice(0, 10);
  const endIso = (endDate || startDate).slice(0, 10);
  if (startIso < todayStr && endIso >= todayStr) {
    return todayStr;
  }
  return startIso;
}

function formatDayFr(
  dateStr: string,
  opts: { weekday?: 'short' | 'long'; month?: 'short' | 'long'; includeYear?: boolean }
): string {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  const dayNum = d.getDate();
  const dayLabel = dayNum === 1 ? '1er' : String(dayNum);
  const monthLabel = opts.month === 'short' ? MONTHS_FR_SHORT[d.getMonth()] : MONTHS_FR[d.getMonth()];
  const weekdayLabel =
    opts.weekday === 'short'
      ? `${WEEKDAYS_FR_SHORT[d.getDay()]} `
      : opts.weekday === 'long'
      ? `${WEEKDAYS_FR_FULL[d.getDay()]} `
      : '';
  const yearLabel = opts.includeYear ? ` ${d.getFullYear()}` : '';
  return `${weekdayLabel}${dayLabel} ${monthLabel}${yearLabel}`;
}

export interface FormattedEventDate {
  primary: string;
  secondary?: string;
  isOngoingLong: boolean;
}

/**
 * Formats event dates according to the user's rules:
 * - If duration > 5 days AND startDate < today: returns "Jusqu'au <date de fin>" without mentioning startDate.
 * - Otherwise returns formatted startDate (and endDate if multi-day).
 */
export function formatEventDateDisplay(
  startDate: string,
  endDate?: string,
  options: {
    variant?: 'card' | 'short' | 'full';
    now?: Date;
  } = {}
): FormattedEventDate {
  const { variant = 'card', now = new Date() } = options;
  const startIso = startDate.slice(0, 10);
  const endIso = (endDate || startDate).slice(0, 10);
  const ongoingLong = isOngoingLongEvent(startIso, endIso, now);
  const currentYear = now.getFullYear();
  const endYear = parseLocalDate(endIso)?.getFullYear() ?? currentYear;

  if (ongoingLong) {
    if (variant === 'full') {
      return {
        primary: `Jusqu'au ${formatDayFr(endIso, { weekday: 'long', month: 'long', includeYear: true })}`,
        isOngoingLong: true,
      };
    }
    return {
      primary: `Jusqu'au ${formatDayFr(endIso, {
        month: variant === 'short' ? 'short' : 'long',
        includeYear: variant === 'short' || endYear > currentYear + 1,
      })}`,
      isOngoingLong: true,
    };
  }

  const hasRange = Boolean(endIso && endIso !== startIso);
  if (variant === 'full') {
    return {
      primary: formatDayFr(startIso, { weekday: 'long', month: 'long', includeYear: true }),
      secondary: hasRange
        ? `jusqu'au ${formatDayFr(endIso, { weekday: 'long', month: 'long', includeYear: true })}`
        : undefined,
      isOngoingLong: false,
    };
  }

  if (variant === 'short') {
    const startFormatted = formatDayFr(startIso, { month: 'short', includeYear: true });
    const endFormatted = hasRange ? formatDayFr(endIso, { month: 'short', includeYear: true }) : undefined;
    return {
      primary: endFormatted ? `${startFormatted} → ${endFormatted}` : startFormatted,
      isOngoingLong: false,
    };
  }

  // 'card'
  const startYear = parseLocalDate(startIso)?.getFullYear() ?? currentYear;
  const showYear = startYear !== currentYear && diffCalendarDays(getLocalTodayStr(now), startIso) > 120;
  const startFormatted = formatDayFr(startIso, { weekday: 'short', month: 'long', includeYear: showYear });
  const endFormatted = hasRange
    ? formatDayFr(endIso, { weekday: 'short', month: 'long', includeYear: showYear })
    : undefined;
  return {
    primary: endFormatted ? `${startFormatted} → ${endFormatted}` : startFormatted,
    isOngoingLong: false,
  };
}

/**
 * Returns timing badge text for WeeklyReportView cards.
 */
export function getEventTimingBadge(
  startDate: string,
  endDate?: string,
  now: Date = new Date()
): { label: string; isUrgent: boolean; isOngoing: boolean } {
  const todayStr = getLocalTodayStr(now);
  const startIso = startDate.slice(0, 10);
  const endIso = (endDate || startDate).slice(0, 10);

  if (startIso < todayStr && endIso >= todayStr) {
    return { label: 'En cours', isUrgent: false, isOngoing: true };
  }

  const diff = diffCalendarDays(todayStr, startIso);
  if (diff <= 0) return { label: 'Aujourd’hui', isUrgent: true, isOngoing: false };
  if (diff === 1) return { label: 'Demain', isUrgent: true, isOngoing: false };
  if (diff <= 7) return { label: `Dans ${diff} jours`, isUrgent: diff <= 3, isOngoing: false };
  return { label: `J+${diff}`, isUrgent: false, isOngoing: false };
}
