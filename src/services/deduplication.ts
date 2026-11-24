import { ManifestationEvent } from '../types';
import { isValidRemoteImageUrl } from '../utils/eventImages';
import { getLocalTodayStr } from '../utils/dateFormatting';
import { reconcileKnownEventDates } from '../utils/knownEventDates';

/**
 * Normalizes a string for fuzzy comparisons:
 * lowercase, removes accents, strip punctuation, numbers (like years '2026'), and filler words
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\b(202\d|203\d)\b/g, '') // remove year numbers (2026, 2027, etc.)
    .replace(/['’\-–—_.,;:!?()\[\]]/g, ' ')
    .replace(/\b(le|la|les|un|une|des|du|de|d|en|au|aux|et|sur|pour|edition|eme|ere|grand|prix|trophee|festival|defi|rando|randonnee)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a stable similarity hash from title, date, and city
 */
export function generateEventSimilarityHash(
  title: string,
  startDate: string,
  city: string,
  category: string
): string {
  const normTitle = normalizeText(title).slice(0, 30);
  const normCity = normalizeText(city).slice(0, 20);
  const normCat = normalizeText(category).slice(0, 15);
  // Date grouped by week / exact date
  return `${normCat}__${normTitle}__${normCity}__${startDate}`;
}

/**
 * Calculate Levenshtein similarity ratio between 0 and 1
 */
function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  // Word set overlap (Jaccard similarity on tokens)
  const words1 = new Set(s1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(s2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) {
    return s1.includes(s2) || s2.includes(s1) ? 0.8 : 0;
  }
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Checks if two events represent the same real-world manifestation
 */
export function isDuplicateEvent(e1: ManifestationEvent, e2: ManifestationEvent): boolean {
  // If identical IDs or hashes
  if (e1.id === e2.id || e1.similarityHash === e2.similarityHash) {
    return true;
  }

  // Same category or closely related
  const normCat1 = normalizeText(e1.category);
  const normCat2 = normalizeText(e2.category);
  const sameCategory = normCat1 === normCat2 || normCat1.includes(normCat2) || normCat2.includes(normCat1);

  // Check date match (exact date or within ±3 days for multi-day/tentative events)
  const d1 = new Date(e1.startDate).getTime();
  const d2 = new Date(e2.startDate).getTime();
  const daysDiff = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
  const isDateClose = daysDiff <= 3;

  // Title similarity
  const t1 = normalizeText(e1.title);
  const t2 = normalizeText(e2.title);
  const titleScore = stringSimilarity(t1, t2);

  // City match
  const c1 = normalizeText(e1.city);
  const c2 = normalizeText(e2.city);
  const sameCity = c1 && c2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1));

  // If title is highly similar (> 0.7) and date is close (<= 3 days)
  if (titleScore >= 0.65 && isDateClose) {
    return true;
  }

  // If exact city, same category, and date is exact, lower threshold for title
  if (sameCity && sameCategory && daysDiff === 0 && titleScore >= 0.4) {
    return true;
  }

  return false;
}

/**
 * Merges new incoming events into existing stored events:
 * - Detects duplicates
 * - Keeps user state (favorite, viewed, hidden)
 * - Updates details if new event has richer information
 * - Returns the updated full list and count of duplicates avoided
 */
export function mergeAndDeduplicateEvents(
  existingEvents: ManifestationEvent[],
  incomingEvents: ManifestationEvent[]
): {
  mergedEvents: ManifestationEvent[];
  newEventsAdded: ManifestationEvent[];
  duplicatesPreventedCount: number;
} {
  const pastYearRegex = /\b(201\d|202[0-5])\b/;
  const todayStr = getLocalTodayStr();

  // Purge any expired events from existingEvents and reconcile fixed annual dates
  const merged = existingEvents
    .map(e => {
      if (!e) return e;
      const { _dateCorrected, ...cleanEv } = reconcileKnownEventDates(e);
      return cleanEv;
    })
    .filter(e => {
      if (!e || !e.startDate) return false;
      const end = e.endDate || e.startDate;
      if (end < todayStr) return false;
      if (pastYearRegex.test(e.title)) return false;
      if (e.practicalInfo?.schedule && pastYearRegex.test(e.practicalInfo.schedule)) return false;
      return true;
    });

  const newEventsAdded: ManifestationEvent[] = [];
  let duplicatesPreventedCount = 0;

  for (const rawIncoming of incomingEvents) {
    if (!rawIncoming || !rawIncoming.startDate) continue;
    const { _dateCorrected, ...incoming } = reconcileKnownEventDates(rawIncoming);
    const incomingEnd = incoming.endDate || incoming.startDate;
    if (incomingEnd < todayStr) continue;
    if (pastYearRegex.test(incoming.title)) continue;

    const existingIndex = merged.findIndex((existing) => isDuplicateEvent(existing, incoming));

    // Sanitize incoming schedule text
    const incomingPractical = { ...(incoming.practicalInfo || {}) };
    if (incomingPractical.schedule && pastYearRegex.test(incomingPractical.schedule)) {
      incomingPractical.schedule = undefined;
    }

    if (existingIndex !== -1) {
      // It's a duplicate! We merge and update lastVerifiedAt, keeping user status
      duplicatesPreventedCount++;
      const existing = merged[existingIndex];
      
      // Update with richer info and corrected dates/coordinates if available
      const hasIncomingLat = typeof incoming.latitude === 'number' && Number.isFinite(incoming.latitude) && incoming.latitude !== 0;
      const hasIncomingLng = typeof incoming.longitude === 'number' && Number.isFinite(incoming.longitude) && incoming.longitude !== 0;

      const enriched: ManifestationEvent = {
        ...existing,
        startDate: incoming.startDate || existing.startDate,
        endDate: incoming.endDate || existing.endDate,
        city: (!existing.city || existing.city === 'Occitanie') && incoming.city ? incoming.city : existing.city,
        department: (!existing.department || existing.department === 'Occitanie') && incoming.department ? incoming.department : existing.department,
        latitude: hasIncomingLat ? incoming.latitude : existing.latitude,
        longitude: hasIncomingLng ? incoming.longitude : existing.longitude,
        lastVerifiedAt: new Date().toISOString(),
        // Keep status if user had marked it favorite or viewed or hidden
        status: existing.status === 'new' ? 'new' : existing.status,
        description: incoming.description.length > existing.description.length 
          ? incoming.description 
          : existing.description,
        sourceUrl: incoming.sourceUrl || existing.sourceUrl,
        ticketUrl: incoming.ticketUrl || existing.ticketUrl,
        imageUrl: isValidRemoteImageUrl(incoming.imageUrl)
          ? incoming.imageUrl
          : (isValidRemoteImageUrl(existing.imageUrl) ? existing.imageUrl : undefined),
        practicalInfo: {
          ...existing.practicalInfo,
          ...incomingPractical,
        },
        detailLevel: incoming.detailLevel === 'high' ? 'high' : existing.detailLevel,
      };

      merged[existingIndex] = enriched;
    } else {
      // Truly new upcoming event!
      const cleanIncoming: ManifestationEvent = {
        ...incoming,
        practicalInfo: incomingPractical
      };
      newEventsAdded.push(cleanIncoming);
      merged.push(cleanIncoming);
    }
  }

  return {
    mergedEvents: merged,
    newEventsAdded,
    duplicatesPreventedCount,
  };
}
