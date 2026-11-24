import { formatIsoDateLocal, getLocalTodayStr } from './dateFormatting';

export interface KnownEventDateRule {
  id: string;
  pattern: RegExp;
  /** Start month (1-12) and day (1-31) */
  startMonth: number;
  startDay: number;
  /** End month (1-12) and day (1-31) */
  endMonth: number;
  endDay: number;
}

/**
 * Verified annual calendar windows for well-known recurring manifestations.
 * Prevents drift from relative day offsets (e.g. Open Sud de France must be Jan 31 – Feb 7).
 */
export const KNOWN_EVENT_DATE_RULES: KnownEventDateRule[] = [
  {
    id: 'open_sud_de_france',
    pattern: /open\s+sud\s+de\s+france/i,
    startMonth: 1,
    startDay: 31,
    endMonth: 2,
    endDay: 7,
  },
  {
    id: 'fete_truffe_uzes',
    pattern: /f[eê]te\s+de\s+la\s+truffe.*uz[eè]s/i,
    startMonth: 1,
    startDay: 15,
    endMonth: 1,
    endDay: 17,
  },
  {
    id: 'carnaval_limoux',
    pattern: /carnaval\s+de\s+limoux|f[eé]cos\s+de\s+limoux/i,
    startMonth: 1,
    startDay: 2,
    endMonth: 3,
    endDay: 14,
  },
  {
    id: 'fete_violettes_toulouse',
    pattern: /f[eê]te\s+des\s+violettes.*toulouse/i,
    startMonth: 2,
    startDay: 20,
    endMonth: 2,
    endDay: 21,
  },
  {
    id: 'mondial_du_vent',
    pattern: /mondial\s+du\s+vent/i,
    startMonth: 4,
    startDay: 1,
    endMonth: 4,
    endDay: 11,
  },
  {
    id: 'defi_wing_gruissan',
    pattern: /d[eé]fi\s+wing/i,
    startMonth: 5,
    startDay: 3,
    endMonth: 5,
    endDay: 5,
  },
  {
    id: 'defi_wind_gruissan',
    pattern: /d[eé]fi\s+wind/i,
    startMonth: 5,
    startDay: 6,
    endMonth: 5,
    endDay: 9,
  },
  {
    id: 'printemps_comediens',
    pattern: /printemps\s+des\s+com[eé]diens/i,
    startMonth: 5,
    startDay: 29,
    endMonth: 6,
    endDay: 20,
  },
  {
    id: 'festival_nimes',
    pattern: /festival\s+de\s+n[îi]mes/i,
    startMonth: 6,
    startDay: 15,
    endMonth: 7,
    endDay: 20,
  },
  {
    id: 'festival_carcassonne',
    pattern: /festival\s+de\s+carcassonne/i,
    startMonth: 7,
    startDay: 1,
    endMonth: 7,
    endDay: 31,
  },
  {
    id: 'pause_guitare',
    pattern: /pause\s+guitare/i,
    startMonth: 7,
    startDay: 7,
    endMonth: 7,
    endDay: 11,
  },
  {
    id: 'les_deferlantes',
    pattern: /les\s+d[eé]ferlantes/i,
    startMonth: 7,
    startDay: 9,
    endMonth: 7,
    endDay: 11,
  },
  {
    id: 'jazz_a_sete',
    pattern: /jazz\s+[àa]\s+s[eè]te/i,
    startMonth: 7,
    startDay: 15,
    endMonth: 7,
    endDay: 22,
  },
  {
    id: 'festival_de_thau',
    pattern: /festival\s+de\s+thau/i,
    startMonth: 7,
    startDay: 16,
    endMonth: 7,
    endDay: 22,
  },
  {
    id: 'fiesta_sete',
    pattern: /fiest['’]a\s+s[eè]te/i,
    startMonth: 7,
    startDay: 17,
    endMonth: 8,
    endDay: 3,
  },
  {
    id: 'nuit_des_etoiles',
    pattern: /nuit\s+des\s+[eé]toiles/i,
    startMonth: 8,
    startDay: 6,
    endMonth: 8,
    endDay: 8,
  },
  {
    id: 'medievale_aigues_mortes',
    pattern: /f[eê]te\s+m[eé]di[eé]vale\s+d['’]aigues-mortes/i,
    startMonth: 8,
    startDay: 21,
    endMonth: 8,
    endDay: 22,
  },
  {
    id: 'festival_arabesques',
    pattern: /festival\s+arabesques/i,
    startMonth: 9,
    startDay: 7,
    endMonth: 9,
    endDay: 19,
  },
  {
    id: 'roc_azur',
    pattern: /roc\s+d['’]azur/i,
    startMonth: 10,
    startDay: 6,
    endMonth: 10,
    endDay: 10,
  },
  {
    id: 'fete_de_la_science',
    pattern: /f[eê]te\s+de\s+la\s+science/i,
    startMonth: 10,
    startDay: 8,
    endMonth: 10,
    endDay: 18,
  },
  {
    id: 'festival_templiers',
    pattern: /festival\s+des\s+templiers/i,
    startMonth: 10,
    startDay: 21,
    endMonth: 10,
    endDay: 24,
  },
  {
    id: 'salon_nautique_cap_dagde',
    pattern: /salon\s+nautique.*cap\s+d['’]agde/i,
    startMonth: 10,
    startDay: 27,
    endMonth: 10,
    endDay: 31,
  },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Computes the next active/upcoming [startDate, endDate] occurrence for an annual fixed-date event.
 */
export function resolveAnnualRuleDates(
  rule: KnownEventDateRule,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const todayStr = getLocalTodayStr(now);
  const currentYear = now.getFullYear();

  for (const baseYear of [currentYear, currentYear + 1]) {
    const startYear = baseYear;
    const endYear =
      rule.endMonth < rule.startMonth ||
      (rule.endMonth === rule.startMonth && rule.endDay < rule.startDay)
        ? baseYear + 1
        : baseYear;

    const startDate = `${startYear}-${pad2(rule.startMonth)}-${pad2(rule.startDay)}`;
    const endDate = `${endYear}-${pad2(rule.endMonth)}-${pad2(rule.endDay)}`;

    if (endDate >= todayStr) {
      return { startDate, endDate };
    }
  }

  return {
    startDate: `${currentYear + 1}-${pad2(rule.startMonth)}-${pad2(rule.startDay)}`,
    endDate: `${currentYear + 1}-${pad2(rule.endMonth)}-${pad2(rule.endDay)}`,
  };
}

/**
 * Convenience lookup by rule id for curated catalogs.
 */
export function getAnnualDatesById(
  ruleId: string,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const rule = KNOWN_EVENT_DATE_RULES.find((r) => r.id === ruleId);
  if (!rule) {
    const fallback = getLocalTodayStr(now);
    return { startDate: fallback, endDate: fallback };
  }
  return resolveAnnualRuleDates(rule, now);
}

/**
 * Computes an upcoming weekend date range (e.g. Saturday + Sunday) N weeks out,
 * for recurring seasonal club events without fixed annual dates.
 */
export function getUpcomingWeekendRange(
  weeksAhead: number,
  dayOfWeek: 'saturday' | 'sunday' | 'friday' = 'saturday',
  durationDays: number = 1,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const targetDow = dayOfWeek === 'friday' ? 5 : dayOfWeek === 'saturday' ? 6 : 0;
  const currentDow = base.getDay();
  let daysUntilTarget = (targetDow - currentDow + 7) % 7;
  if (daysUntilTarget === 0 && weeksAhead === 0) {
    daysUntilTarget = 7;
  }
  const start = new Date(base);
  start.setDate(base.getDate() + daysUntilTarget + Math.max(0, weeksAhead - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(0, durationDays - 1));

  return {
    startDate: formatIsoDateLocal(start),
    endDate: formatIsoDateLocal(end),
  };
}

const LIVE_FEED_ENFORCED_RULE_IDS = new Set([
  'open_sud_de_france',
  'mondial_du_vent',
  'defi_wind_gruissan',
  'defi_wing_gruissan',
  'carnaval_limoux',
  'fete_truffe_uzes',
  'printemps_comediens',
]);

/**
 * Reconciles known real-world event dates on cached/curated records so stale relative offsets
 * (like Open Sud de France or Mondial du Vent) are corrected automatically.
 */
export function reconcileKnownEventDates<
  T extends { title: string; startDate: string; endDate?: string; sourceType?: string; sourceName?: string }
>(event: T, now: Date = new Date()): T & { _dateCorrected?: boolean } {
  if (!event?.title) return event;
  // Preserve specific single-day sub-events from OpenAgenda/custom sites except for verified flagship events
  const isLiveFeed = event.sourceType === 'openagenda' || event.sourceType === 'custom_target_site';

  for (const rule of KNOWN_EVENT_DATE_RULES) {
    if (!rule.pattern.test(event.title)) continue;
    if (isLiveFeed && !LIVE_FEED_ENFORCED_RULE_IDS.has(rule.id)) {
      return event;
    }

    const expected = resolveAnnualRuleDates(rule, now);
    if (event.startDate !== expected.startDate || (event.endDate || event.startDate) !== expected.endDate) {
      return {
        ...event,
        startDate: expected.startDate,
        endDate: expected.endDate,
        _dateCorrected: true,
      };
    }
    return event;
  }

  return event;
}
