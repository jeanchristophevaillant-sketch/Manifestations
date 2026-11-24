// Custom Target Site Scraper & Event Extractor
// Extracts manifestations strictly from <article> tags and Schema.org JSON-LD,
// completely excluding navigation menus, headers, footers, and menu links.

import { ApiEventCandidate, validateUpcomingDate } from './apiSources';
import { isUsablePromoImageUrl } from './imageEnricher';
import { classifyEventCategory } from '../src/utils/categories';

interface ExtractedSiteResult {
  url: string;
  name: string;
  success: boolean;
  eventsCount: number;
  count?: number;
  events: ApiEventCandidate[];
  extractionMethod?: 'article-tags' | 'json-ld';
  method?: string;
  errorMessage?: string;
}

// Banned generic menu titles, navigation phrases, or utility buttons that are never manifestations
const MENU_AND_NAV_WORDS = new Set([
  'accueil', 'home', 'menu', 'navigation', 'billetterie', 'tickets', 'contact',
  'mentions légales', 'mentions legales', 'politique de confidentialité', 'confidentialité',
  'conditions générales', 'cgv', 'newsletter', 'plan du site', 'suivez-nous', 'connexion',
  'espace pro', 'mon compte', 'panier', 'recherche', 'search', 'filtres', 'filtrer',
  'tous les événements', 'tous les spectacles', 'agenda', 'programmation', 'saison',
  'archives', 'actualités', 'actualites', 'nous soutenir', 'adhérer', 'adherer',
  'qui sommes-nous', 'a propos', 'à propos', 'partenaires', 'presse', 'précédent', 'precedent',
  'suivant', 'en savoir plus', 'lire la suite', "plus d'infos", 'je reserve ma place',
  'je réserve ma place', 'réserver', 'reserver', 'acheter', 'fermer', 'retour', 'partager',
  'voir tout', 'voir plus', 'consulter', 'télécharger', 'telecharger', 'plan', 'accès'
]);

const FRENCH_MONTHS_MAP: Record<string, number> = {
  janvier: 0, janv: 0,
  fevrier: 1, février: 1, fevr: 1, févr: 1,
  mars: 2,
  avril: 3, avr: 3,
  mai: 4,
  juin: 5,
  juillet: 6, juil: 6,
  aout: 7, août: 7,
  septembre: 8, sept: 8,
  octobre: 9, oct: 9,
  novembre: 10, nov: 10,
  decembre: 11, décembre: 11, dec: 11, déc: 11
};

const CITY_DEPARTMENT_HINTS: Array<{ rx: RegExp; city: string; department: string }> = [
  { rx: /carcassonne/i, city: 'Carcassonne', department: '11 - Aude' },
  { rx: /narbonne/i, city: 'Narbonne', department: '11 - Aude' },
  { rx: /gruissan/i, city: 'Gruissan', department: '11 - Aude' },
  { rx: /leucate/i, city: 'Leucate', department: '11 - Aude' },
  { rx: /limoux/i, city: 'Limoux', department: '11 - Aude' },
  { rx: /castelnaudary/i, city: 'Castelnaudary', department: '11 - Aude' },
  { rx: /l[eé]zignan/i, city: 'Lézignan-Corbières', department: '11 - Aude' },
  { rx: /montpellier/i, city: 'Montpellier', department: '34 - Hérault' },
  { rx: /s[eè]te/i, city: 'Sète', department: '34 - Hérault' },
  { rx: /\bagde\b/i, city: 'Agde', department: '34 - Hérault' },
  { rx: /b[eé]ziers/i, city: 'Béziers', department: '34 - Hérault' },
  { rx: /p[eé]zenas/i, city: 'Pézenas', department: '34 - Hérault' },
  { rx: /m[eè]ze/i, city: 'Mèze', department: '34 - Hérault' },
  { rx: /balaruc/i, city: 'Balaruc-les-Bains', department: '34 - Hérault' },
  { rx: /frontignan/i, city: 'Frontignan', department: '34 - Hérault' },
  { rx: /palavas/i, city: 'Palavas-les-Flots', department: '34 - Hérault' },
  { rx: /grande[\s-]*motte/i, city: 'La Grande-Motte', department: '34 - Hérault' },
  { rx: /lunel/i, city: 'Lunel', department: '34 - Hérault' },
  { rx: /mauguio/i, city: 'Mauguio', department: '34 - Hérault' },
  { rx: /p[eé]rols/i, city: 'Pérols', department: '34 - Hérault' },
  { rx: /lattes/i, city: 'Lattes', department: '34 - Hérault' },
  { rx: /castelnau[\s-]*le[\s-]*lez/i, city: 'Castelnau-le-Lez', department: '34 - Hérault' },
  { rx: /clermont[\s-]*l['’]?h[eé]rault/i, city: "Clermont-l'Hérault", department: '34 - Hérault' },
  { rx: /lod[eè]ve/i, city: 'Lodève', department: '34 - Hérault' },
  { rx: /b[eé]darieux/i, city: 'Bédarieux', department: '34 - Hérault' },
  { rx: /saint[\s-]*guilhem/i, city: 'Saint-Guilhem-le-Désert', department: '34 - Hérault' },
  { rx: /n[îi]mes/i, city: 'Nîmes', department: '30 - Gard' },
  { rx: /al[eè]s/i, city: 'Alès', department: '30 - Gard' },
  { rx: /uz[eè]s/i, city: 'Uzès', department: '30 - Gard' },
  { rx: /aigues[\s-]*mortes/i, city: 'Aigues-Mortes', department: '30 - Gard' },
  { rx: /grau[\s-]*du[\s-]*roi/i, city: 'Le Grau-du-Roi', department: '30 - Gard' },
  { rx: /sommi[eè]res/i, city: 'Sommières', department: '30 - Gard' },
  { rx: /bagnols[\s-]*sur[\s-]*c[eè]ze/i, city: 'Bagnols-sur-Cèze', department: '30 - Gard' },
  { rx: /perpignan/i, city: 'Perpignan', department: '66 - Pyrénées-Orientales' },
  { rx: /collioure/i, city: 'Collioure', department: '66 - Pyrénées-Orientales' },
  { rx: /canet[\s-]*en[\s-]*roussillon/i, city: 'Canet-en-Roussillon', department: '66 - Pyrénées-Orientales' },
  { rx: /argel[eè]s[\s-]*sur[\s-]*mer/i, city: 'Argelès-sur-Mer', department: '66 - Pyrénées-Orientales' },
  { rx: /saint[\s-]*cyprien/i, city: 'Saint-Cyprien', department: '66 - Pyrénées-Orientales' },
  { rx: /barcar[eè]s/i, city: 'Le Barcarès', department: '66 - Pyrénées-Orientales' },
  { rx: /toulouse/i, city: 'Toulouse', department: '31 - Haute-Garonne' },
  { rx: /blagnac/i, city: 'Blagnac', department: '31 - Haute-Garonne' },
  { rx: /colomiers/i, city: 'Colomiers', department: '31 - Haute-Garonne' },
  { rx: /muret/i, city: 'Muret', department: '31 - Haute-Garonne' },
  { rx: /\balbi\b/i, city: 'Albi', department: '81 - Tarn' },
  { rx: /castres/i, city: 'Castres', department: '81 - Tarn' },
  { rx: /gaillac/i, city: 'Gaillac', department: '81 - Tarn' },
  { rx: /rodez/i, city: 'Rodez', department: '12 - Aveyron' },
  { rx: /millau/i, city: 'Millau', department: '12 - Aveyron' },
  { rx: /villefranche[\s-]*de[\s-]*rouergue/i, city: 'Villefranche-de-Rouergue', department: '12 - Aveyron' },
  { rx: /mende/i, city: 'Mende', department: '48 - Lozère' },
  { rx: /florac/i, city: 'Florac', department: '48 - Lozère' },
  { rx: /cahors/i, city: 'Cahors', department: '46 - Lot' },
  { rx: /figeac/i, city: 'Figeac', department: '46 - Lot' },
  { rx: /montauban/i, city: 'Montauban', department: '82 - Tarn-et-Garonne' },
  { rx: /moissac/i, city: 'Moissac', department: '82 - Tarn-et-Garonne' },
  { rx: /tarbes/i, city: 'Tarbes', department: '65 - Hautes-Pyrénées' },
  { rx: /lourdes/i, city: 'Lourdes', department: '65 - Hautes-Pyrénées' },
  { rx: /foix/i, city: 'Foix', department: '09 - Ariège' },
  { rx: /pamiers/i, city: 'Pamiers', department: '09 - Ariège' },
  { rx: /\bauch\b/i, city: 'Auch', department: '32 - Gers' },
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function resolveDayMonthYear(day: number, month1Based: number, explicitYear?: number, minDate?: Date): string | null {
  if (day < 1 || day > 31 || month1Based < 1 || month1Based > 12) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let year = explicitYear ?? now.getFullYear();
  if (!explicitYear) {
    const candidate = new Date(year, month1Based - 1, day);
    if (minDate) {
      if (candidate < minDate) {
        year += 1;
      }
    } else {
      // Allow recently started ongoing events (up to 45 days prior) in current year;
      // dates further in the past (e.g. Jan/Feb when today is Nov) belong to next year.
      const fortyFiveDaysAgo = new Date(now);
      fortyFiveDaysAgo.setDate(now.getDate() - 45);
      if (candidate < fortyFiveDaysAgo) {
        year += 1;
      }
    }
  }

  return `${year}-${pad2(month1Based)}-${pad2(day)}`;
}

/**
 * Resolves a [startDate, endDate] range against today and the target horizon.
 * If an event already started before today (e.g. ongoing exhibition "20/11 au 16/01")
 * and ends on or after today, preserves the true startDate so the UI can display
 * "Jusqu'au <endDate>" for long-running (> 5 days) ongoing events.
 */
function normalizeEventDateWindow(
  rawStart: string | undefined,
  rawEnd: string | undefined,
  horizonMonths: number
): { startDate: string; endDate: string } | null {
  if (!rawStart) return null;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const maxDate = new Date(today.getFullYear(), today.getMonth() + horizonMonths, today.getDate());
  const maxDateStr = `${maxDate.getFullYear()}-${pad2(maxDate.getMonth() + 1)}-${pad2(maxDate.getDate())}`;

  const validSingleStart = validateUpcomingDate(rawStart, horizonMonths);
  if (validSingleStart) {
    const validEnd = rawEnd
      ? validateUpcomingDate(rawEnd, horizonMonths + 3) || (rawEnd >= validSingleStart ? rawEnd : validSingleStart)
      : validSingleStart;
    return { startDate: validSingleStart, endDate: validEnd };
  }

  // Ongoing multi-day event / exhibition: started before today, ends >= today
  if (rawEnd && rawStart < todayStr && rawEnd >= todayStr && rawStart <= maxDateStr) {
    return {
      startDate: rawStart,
      endDate: rawEnd,
    };
  }

  return null;
}

/**
 * Scrapes a user-designated website to discover real events and concerts.
 * STRICT REQUIREMENT: Only searches inside <article> tags (and pure JSON-LD events),
 * completely ignoring any navigation menus, headers, footers, or menu links.
 */
export async function scrapeTargetSiteEvents(
  targetUrl: string,
  siteName: string = 'Site ciblé',
  horizonMonths: number = 6
): Promise<ExtractedSiteResult> {
  try {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 EventScanner/3.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        url: cleanUrl,
        name: siteName,
        success: false,
        eventsCount: 0,
        count: 0,
        events: [],
        errorMessage: `Le site a répondu avec le statut HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const extractedEvents: ApiEventCandidate[] = [];
    const pastYearRegex = /\b(201\d|202[0-5])\b/;

    // Extract page-level OpenGraph / Twitter image as fallback if article has no dedicated <img>
    let pageOgImage: string | undefined;
    const ogImgMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImgMatch?.[1]) {
      try {
        const resolvedOg = new URL(ogImgMatch[1].trim(), cleanUrl).toString();
        if (isUsablePromoImageUrl(resolvedOg)) {
          pageOgImage = resolvedOg;
        }
      } catch {
        // Ignore invalid OG image URL
      }
    }

    // 1. Strip all navigation, menus, headers, footers, sidebars, and pagination
    // to guarantee NO menu links or navigation labels can ever be extracted as events
    const sanitizedHtml = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<menu\b[^>]*>[\s\S]*?<\/menu>/gi, '')
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<ul\b[^>]*class=["'][^"']*(?:menu|nav|navbar|pagination|breadcrumb)[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '')
      .replace(/<div\b[^>]*class=["'][^"']*(?:menu|navbar|navigation|pagination|breadcrumb|site-header|site-footer)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

    // 2. EXCLUSIVELY extract manifestations from <article> tags
    const articleRegex = /<article\b([^>]*)>([\s\S]*?)<\/article>/gi;
    let articleMatch: RegExpExecArray | null;
    let articleCount = 0;
    const now = new Date();
    const currentYear = now.getFullYear();

    while ((articleMatch = articleRegex.exec(sanitizedHtml)) !== null && articleCount < 250) {
      const artAttrs = articleMatch[1] || '';
      const artHtml = articleMatch[2];
      const artText = decodeHtmlEntities(artHtml.replace(/<[^>]*>/g, ' '));

      // Check immediate preceding outer <a ...> wrapper (common pattern: <a href="..." data-filtre="..."><article>...</article></a>)
      let outerAnchorTag = '';
      const lookbehindWindow = sanitizedHtml.slice(Math.max(0, articleMatch.index - 1800), articleMatch.index);
      const lastOpenA = lookbehindWindow.lastIndexOf('<a ');
      const lastCloseA = lookbehindWindow.lastIndexOf('</a>');
      if (lastOpenA !== -1 && lastOpenA > lastCloseA) {
        outerAnchorTag = lookbehindWindow.slice(lastOpenA);
      }

      // Skip empty or obsolete historical blocks (prior to 2026)
      if (artText.length < 10) continue;
      if (pastYearRegex.test(artText) && !/\b(2026|2027)\b/.test(artText)) {
        continue;
      }

      // --- DATE EXTRACTION (Single date OR Date range) ---
      let rawStart: string | undefined;
      let rawEnd: string | undefined;

      // A. Check <time datetime="...">
      const timeMatches = Array.from(artHtml.matchAll(/<time\b[^>]*datetime=["']([^"']+)["']/gi));
      if (timeMatches.length > 0) {
        const dt0 = timeMatches[0][1].split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dt0)) {
          rawStart = dt0;
          if (timeMatches.length > 1) {
            const dt1 = timeMatches[timeMatches.length - 1][1].split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(dt1)) rawEnd = dt1;
          }
        }
      }

      // B. Check data-filtre / data-date attribute on wrapping <a> or <article>
      if (!rawStart) {
        const attrSource = `${outerAnchorTag} ${artAttrs}`;
        const dataDateAttr = attrSource.match(/data-(?:filtre|date)=["']([^"']+)["']/i);
        if (dataDateAttr?.[1]) {
          const isoDates = dataDateAttr[1].match(/\b\d{4}-\d{2}-\d{2}\b/g);
          if (isoDates && isoDates.length > 0) {
            const sortedIso = [...isoDates].sort();
            rawStart = sortedIso[0];
            rawEnd = sortedIso[sortedIso.length - 1];
          }
        }
      }

      // C. Check French textual date range or single date (e.g. "18 Septembre", "du 18 septembre au 25 octobre 2026")
      if (!rawStart) {
        const frMatches = Array.from(
          artText.matchAll(/\b(\d{1,2})\s+(janvier|janv|fevrier|février|fevr|févr|mars|avril|avr|mai|juin|juillet|juil|aout|août|septembre|sept|octobre|oct|novembre|nov|decembre|décembre|dec|déc)(?:\s+(\d{4}))?\b/gi)
        );
        if (frMatches.length > 0) {
          const m0 = frMatches[0];
          const day0 = parseInt(m0[1], 10);
          const month0 = (FRENCH_MONTHS_MAP[m0[2].toLowerCase()] ?? 0) + 1;
          const explicitYear0 = m0[3] ? parseInt(m0[3], 10) : undefined;
          rawStart = resolveDayMonthYear(day0, month0, explicitYear0) || undefined;

          if (frMatches.length > 1 && rawStart) {
            const m1 = frMatches[frMatches.length - 1];
            const day1 = parseInt(m1[1], 10);
            const month1 = (FRENCH_MONTHS_MAP[m1[2].toLowerCase()] ?? 0) + 1;
            const explicitYear1 = m1[3] ? parseInt(m1[3], 10) : undefined;
            rawEnd = resolveDayMonthYear(day1, month1, explicitYear1, new Date(rawStart)) || undefined;
          }
        }
      }

      // D. Check numeric date WITH year: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      if (!rawStart) {
        const fullNumMatches = Array.from(artText.matchAll(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g));
        if (fullNumMatches.length > 0) {
          const m0 = fullNumMatches[0];
          const day0 = parseInt(m0[1], 10);
          const month0 = parseInt(m0[2], 10);
          const year0 = m0[3].length === 2 ? parseInt(`20${m0[3]}`, 10) : parseInt(m0[3], 10);
          if (day0 >= 1 && day0 <= 31 && month0 >= 1 && month0 <= 12) {
            rawStart = `${year0}-${pad2(month0)}-${pad2(day0)}`;
          }
          if (fullNumMatches.length > 1 && rawStart) {
            const m1 = fullNumMatches[fullNumMatches.length - 1];
            const day1 = parseInt(m1[1], 10);
            const month1 = parseInt(m1[2], 10);
            const year1 = m1[3].length === 2 ? parseInt(`20${m1[3]}`, 10) : parseInt(m1[3], 10);
            if (day1 >= 1 && day1 <= 31 && month1 >= 1 && month1 <= 12) {
              rawEnd = `${year1}-${pad2(month1)}-${pad2(day1)}`;
            }
          }
        }
      }

      // E. Check short numeric date WITHOUT year: "25/11", "20/11 au 16/01", "24/11 à 18h00"
      if (!rawStart) {
        // Prefer dedicated date container if present
        const dateCardMatch = artHtml.match(/<[^>]*class=["'][^"']*(?:date-card|date|dates)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
        const dateTextTarget = dateCardMatch
          ? decodeHtmlEntities(dateCardMatch[1].replace(/<[^>]*>/g, ' '))
          : artText;

        const shortRangeMatch = dateTextTarget.match(/\b(\d{1,2})[\/\-\.](\d{1,2})\s*(?:au|à|-|–|->|jusqu'au)\s*(\d{1,2})[\/\-\.](\d{1,2})\b/i);
        if (shortRangeMatch) {
          const d0 = parseInt(shortRangeMatch[1], 10);
          const mo0 = parseInt(shortRangeMatch[2], 10);
          const d1 = parseInt(shortRangeMatch[3], 10);
          const mo1 = parseInt(shortRangeMatch[4], 10);
          rawStart = resolveDayMonthYear(d0, mo0) || undefined;
          if (rawStart) {
            rawEnd = resolveDayMonthYear(d1, mo1, undefined, new Date(rawStart)) || undefined;
          }
        } else {
          const shortSingleMatches = Array.from(dateTextTarget.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g));
          if (shortSingleMatches.length > 0) {
            const d0 = parseInt(shortSingleMatches[0][1], 10);
            const mo0 = parseInt(shortSingleMatches[0][2], 10);
            rawStart = resolveDayMonthYear(d0, mo0) || undefined;
            if (shortSingleMatches.length > 1 && rawStart) {
              const d1 = parseInt(shortSingleMatches[shortSingleMatches.length - 1][1], 10);
              const mo1 = parseInt(shortSingleMatches[shortSingleMatches.length - 1][2], 10);
              rawEnd = resolveDayMonthYear(d1, mo1, undefined, new Date(rawStart)) || undefined;
            }
          }
        }
      }

      const normalizedWindow = normalizeEventDateWindow(rawStart, rawEnd, horizonMonths);
      if (!normalizedWindow) continue;
      const validStartDate = normalizedWindow.startDate;
      const validEndDate = normalizedWindow.endDate;

      // --- TITLE EXTRACTION ---
      let title = '';

      // Check headings h1 through h6 inside the article
      const hMatch = artHtml.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
      if (hMatch) {
        const candidateTitle = decodeHtmlEntities(hMatch[1].replace(/<[^>]*>/g, ''));
        const lowerCandidate = candidateTitle.toLowerCase();
        if (candidateTitle.length > 2 && candidateTitle.length < 160 && !MENU_AND_NAV_WORDS.has(lowerCandidate)) {
          title = candidateTitle;
        }
      }

      // Check elements with title/name class
      if (!title) {
        const classTitleMatch = artHtml.match(/<[^>]*class=["'][^"']*(?:entry-title|post-title|event-title|card-title|titre)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
        if (classTitleMatch) {
          const candidateTitle = decodeHtmlEntities(classTitleMatch[1].replace(/<[^>]*>/g, ''));
          const lowerCandidate = candidateTitle.toLowerCase();
          if (candidateTitle.length > 2 && candidateTitle.length < 160 && !MENU_AND_NAV_WORDS.has(lowerCandidate)) {
            title = candidateTitle;
          }
        }
      }

      // Check anchor tags inside the article that are not buttons or menu words
      if (!title || /^(atelier|concert|stage|spectacle|soiree|soirée|festival|live)$/i.test(title.trim())) {
        const rawPrefix = title ? title.trim().toUpperCase() : '';
        const anchors = Array.from(artHtml.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi));
        const candidateTitles: string[] = [];

        for (const aMatch of anchors) {
          const text = decodeHtmlEntities(aMatch[1].replace(/<[^>]*>/g, ''));
          const lower = text.toLowerCase();
          if (
            text.length > 2 &&
            text.length < 160 &&
            text !== '-' &&
            text !== '+' &&
            !MENU_AND_NAV_WORDS.has(lower) &&
            !/^(je reserve|billetterie|en savoir plus|lire la suite|reserver|acheter|détails|voir|participer)/i.test(lower)
          ) {
            candidateTitles.push(text);
          }
        }

        const descriptive = candidateTitles.find(t => t.length > 5 && !/^(atelier|concert|stage|spectacle|soiree|soirée|festival|live)$/i.test(t));
        if (descriptive) {
          title = rawPrefix && !descriptive.toUpperCase().includes(rawPrefix) ? `${rawPrefix} - ${descriptive}` : descriptive;
        } else if (candidateTitles.length > 0 && !title) {
          title = candidateTitles[0];
        }
      }

      if (!title || title.length < 3) continue;
      if (pastYearRegex.test(title)) continue;

      articleCount++;

      // --- URL & TICKETING EXTRACTION ---
      let eventUrl = cleanUrl;
      let ticketUrl: string | undefined;

      // Prefer wrapping <a href="..."> if <article> is wrapped inside an anchor card
      if (outerAnchorTag) {
        const outerHref = outerAnchorTag.match(/href=["']([^"']+)["']/i);
        if (outerHref?.[1] && !outerHref[1].startsWith('#') && !outerHref[1].startsWith('javascript:')) {
          try {
            eventUrl = new URL(outerHref[1].trim(), cleanUrl).toString();
          } catch {
            // Keep cleanUrl
          }
        }
      }

      const linkMatches = Array.from(artHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
      for (const lMatch of linkMatches) {
        const rawHref = lMatch[1].trim();
        const linkText = lMatch[2].replace(/<[^>]*>/g, '').trim().toLowerCase();

        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
          continue;
        }

        try {
          const resolved = new URL(rawHref, cleanUrl).toString();

          if (
            /billetterie|ticket|shotgun|digitick|weezevent|see-tickets|placeminute|festik/i.test(resolved) ||
            /billetterie|reserver|réserver|acheter|je reserve/i.test(linkText)
          ) {
            ticketUrl = resolved;
          } else if (
            resolved !== cleanUrl &&
            !resolved.endsWith('#') &&
            !/facebook\.com|twitter\.com|instagram\.com|youtube\.com|linkedin\.com/i.test(resolved) &&
            eventUrl === cleanUrl
          ) {
            eventUrl = resolved;
          }
        } catch {
          // Ignore invalid URLs
        }
      }

      // --- CATEGORY HINT & LOCATION EXTRACTION FROM ARTICLE ---
      const catHintMatch = artHtml.match(/<[^>]*class=["'][^"']*(?:categorie|category|badge|tag)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
      const catHint = catHintMatch ? decodeHtmlEntities(catHintMatch[1].replace(/<[^>]*>/g, '')) : '';

      const lieuMatch = artHtml.match(/<[^>]*class=["'][^"']*(?:lieu|location|venue|place)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      const rawLieu = lieuMatch ? decodeHtmlEntities(lieuMatch[1].replace(/<[^>]*>/g, '')) : '';

      // --- PRACTICAL INFO & DESCRIPTION ---
      const timeRegex = /\b(\d{1,2}[h:]\d{2})\b|\b(\d{1,2}h)\b/;
      const scheduleMatch = artText.match(timeRegex);
      const dateCardMatch = artHtml.match(/<[^>]*class=["'][^"']*(?:date-card)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      const dateCardLabel = dateCardMatch ? decodeHtmlEntities(dateCardMatch[1].replace(/<[^>]*>/g, '')) : '';
      const schedule = dateCardLabel || (scheduleMatch ? `Début à ${scheduleMatch[0].replace(':', 'h')}` : undefined);

      const priceMatch = artText.match(/\b(\d+[\.,]?\d*)\s*€\b/i) || artText.match(/\b(gratuit|en entrée libre|libre accès)\b/i);
      const priceOrRegistration = priceMatch ? (priceMatch[0].toLowerCase().includes('gratuit') ? 'Entrée gratuite' : `${priceMatch[0]}`) : 'Consulter le site officiel';

      const description = artText.slice(0, 300).replace(/\s+/g, ' ');
      const category = classifyEventCategory(title, `${artText} ${catHint}`, catHint);

      let city = 'Occitanie';
      let department = 'Occitanie';
      const geoSearchSpace = `${siteName} ${cleanUrl} ${rawLieu} ${artText}`;
      for (const hint of CITY_DEPARTMENT_HINTS) {
        if (hint.rx.test(geoSearchSpace)) {
          city = hint.city;
          department = hint.department;
          break;
        }
      }
      if (department === 'Occitanie') {
        const postalMatch = geoSearchSpace.match(/\b((?:0[1-9]|[1-8]\d|9[0-5])\d{3})\b/);
        if (postalMatch) {
          department = postalMatch[1].slice(0, 2);
        }
      }

      const locationDetails = rawLieu && rawLieu.length >= 2 ? `${rawLieu} (${city})` : siteName;

      // --- IMAGE EXTRACTION FROM ARTICLE ---
      let articleImageUrl: string | undefined;
      const imgMatches = Array.from(
        artHtml.matchAll(/<img\b[^>]*?(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/gi)
      );
      for (const iMatch of imgMatches) {
        const rawImg = iMatch[1].trim();
        if (!rawImg || rawImg.startsWith('data:')) continue;
        try {
          const resolvedImg = new URL(rawImg, cleanUrl).toString();
          if (isUsablePromoImageUrl(resolvedImg)) {
            articleImageUrl = resolvedImg;
            break;
          }
        } catch {
          // Ignore invalid img URL
        }
      }

      extractedEvents.push({
        title,
        category,
        startDate: validStartDate,
        endDate: validEndDate,
        city,
        department,
        region: 'Occitanie',
        locationDetails,
        description: description.length > 30 ? description : `${title} - Manifestation extraite de la programmation de ${siteName}.`,
        detailLevel: 'high',
        practicalInfo: {
          schedule,
          priceOrRegistration,
          organizer: siteName,
          ticketingUrl: ticketUrl,
        },
        sourceName: `${siteName} (Direct)`,
        sourceUrl: eventUrl,
        ticketUrl,
        imageUrl: articleImageUrl || pageOgImage,
        sourceType: 'specialized_site',
        relevanceScore: 95,
      });
    }

    // 3. Schema.org JSON-LD extraction as complementary source (runs always)
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    let jsonLdCount = 0;
    if (jsonLdMatches) {
      for (const scriptTag of jsonLdMatches) {
        try {
          const content = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const parsed = JSON.parse(content);
          const rawItems = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);

          for (const item of rawItems) {
            const itemType = String(item['@type'] || '');
            if (itemType.includes('Event') || itemType.includes('MusicEvent') || itemType.includes('SportsEvent')) {
              const title = item.name || item.headline;
              if (title && typeof title === 'string') {
                if (pastYearRegex.test(title)) continue;

                const rawLdStart = typeof item.startDate === 'string' ? item.startDate.split('T')[0] : undefined;
                const rawLdEnd = typeof item.endDate === 'string' ? item.endDate.split('T')[0] : undefined;
                const ldWindow = normalizeEventDateWindow(rawLdStart, rawLdEnd, horizonMonths);
                if (!ldWindow) continue;
                const startDate = ldWindow.startDate;
                const endDate = ldWindow.endDate;
                const location = item.location || {};
                const city = location.address?.addressLocality || location.name || 'Occitanie';
                const locationDetails = location.name ? `${location.name} (${location.address?.streetAddress || city})` : city;
                const ldLat = Number(location.geo?.latitude ?? item.geo?.latitude);
                const ldLng = Number(location.geo?.longitude ?? item.geo?.longitude);
                const latitude = Number.isFinite(ldLat) && ldLat !== 0 ? ldLat : undefined;
                const longitude = Number.isFinite(ldLng) && ldLng !== 0 ? ldLng : undefined;

                const desc = (item.description || `${title} - Événement programmé sur ${siteName}`).replace(/<[^>]*>/g, '').slice(0, 300);
                const category = classifyEventCategory(title, desc);

                const rawLdImg = Array.isArray(item.image) ? item.image[0] : item.image;
                const rawLdImgUrl = typeof rawLdImg === 'string' ? rawLdImg : rawLdImg?.url;
                let jsonLdImageUrl: string | undefined = pageOgImage;
                if (typeof rawLdImgUrl === 'string' && rawLdImgUrl.trim()) {
                  try {
                    const resolvedLdImg = new URL(rawLdImgUrl.trim(), cleanUrl).toString();
                    if (isUsablePromoImageUrl(resolvedLdImg)) {
                      jsonLdImageUrl = resolvedLdImg;
                    }
                  } catch {
                    // Keep fallback
                  }
                }

                extractedEvents.push({
                  title: title.trim(),
                  category,
                  startDate,
                  endDate,
                  city: city.trim(),
                  department: location.address?.postalCode ? `${location.address.postalCode.slice(0, 2)} - ${city}` : 'Occitanie',
                  region: 'Occitanie',
                  locationDetails,
                  latitude,
                  longitude,
                  description: desc,
                  detailLevel: 'high',
                  practicalInfo: {
                    priceOrRegistration: item.offers?.price ? `${item.offers.price} ${item.offers.priceCurrency || 'EUR'}` : 'Consulter billetterie du site',
                    organizer: item.organizer?.name || siteName,
                    schedule: item.doorTime ? `Ouverture à ${item.doorTime}` : undefined,
                  },
                  sourceName: `${siteName} (Direct)`,
                  sourceUrl: item.url || cleanUrl,
                  imageUrl: jsonLdImageUrl,
                  sourceType: 'specialized_site',
                  relevanceScore: 98,
                });
                jsonLdCount++;
              }
            }
          }
        } catch {
          // Skip invalid JSON-LD block
        }
      }
    }

    // Deduplicate events extracted from both <article> and JSON-LD on the same page
    const seenLocal = new Set<string>();
    const uniqueEvents: ApiEventCandidate[] = [];
    for (const ev of extractedEvents) {
      const k = `${ev.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 22)}__${ev.startDate}__${ev.sourceUrl.slice(-24)}`;
      if (!seenLocal.has(k)) {
        seenLocal.add(k);
        uniqueEvents.push(ev);
      }
    }

    const method: 'article-tags' | 'json-ld' | undefined =
      articleCount > 0 ? 'article-tags' : (jsonLdCount > 0 ? 'json-ld' : undefined);

    const errorMessage =
      uniqueEvents.length === 0
        ? "Aucune manifestation trouvée dans les balises <article> ou JSON-LD de cette page. Les liens de menu, en-têtes et pieds de page ont été strictement ignorés."
        : undefined;

    return {
      url: cleanUrl,
      name: siteName,
      success: uniqueEvents.length > 0,
      eventsCount: uniqueEvents.length,
      count: uniqueEvents.length,
      events: uniqueEvents,
      extractionMethod: method,
      method,
      errorMessage,
    };
  } catch (err: any) {
    return {
      url: targetUrl,
      name: siteName,
      success: false,
      eventsCount: 0,
      count: 0,
      events: [],
      errorMessage: err?.message || 'Erreur lors de la connexion au site.',
    };
  }
}
