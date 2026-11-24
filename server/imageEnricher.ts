// Multi-strategy Promotional & Event Visual Enricher
// 1. Official event page OpenGraph / Twitter / JSON-LD / Hero <img> extraction (filtering out logos & icons)
// 2. Strict OpenAgenda poster cross-matching (Open Data France)
// 3. Curated French Wikipedia / Wikimedia Commons venue, landmark & spot photography

export interface ImageLookupCandidate {
  id?: string;
  title: string;
  category?: string;
  city?: string;
  locationDetails?: string;
  sourceUrl?: string;
  imageUrl?: string;
}

const REJECTED_IMAGE_PATTERNS =
  /(\blogo\b|logo[-_.]|[-_]logo|logotype|brand|signature|favicon|avatar|spinner|placeholder|sprite|1x1|pixel|blank\.gif|spacer|badge|widget|adserver|doubleclick|blason|armoiries|coat[-_ ]of[-_ ]arms|flag[-_ ]of|drapeau|locator[-_ ]map|-position\.|carte[-_ ]|map[-_ ]|\.svg(\.|\/|\?|$)|\.ico(\.|\/|\?|$))/i;

// Generic multi-category portal homepages whose root og:image is a site-wide banner unrelated to individual events
const GENERIC_PORTAL_ROOTS = [
  /openagenda\.com\/?$/i,
  /ticketmaster\.fr\/?$/i,
  /fnacspectacles\.com\/?$/i,
  /athle\.fr\/?$/i,
  /ffvoile\.fr\/?(competitions\/?)?$/i,
  /ffvelo\.fr\/?(activites-federales\/calendrier-des-randonnees\/?)?$/i,
  /ffc\.fr\/?$/i,
  /tourisme-[a-z0-9-]+\.[a-z]+\/?(agenda\/?|evenements\/?)?$/i,
  /tourismegard\.com\/?(agenda\/?)?$/i,
  /herault-tourisme\.com\/?(agenda\/?|fr\/agenda\/?)?$/i,
  /cevennes-tourisme\.fr\/?$/i,
  /lozere-tourisme\.com\/?$/i,
  /aude-tourisme\.com\/?$/i,
];

export function isUsablePromoImageUrl(url?: string | null): url is string {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (REJECTED_IMAGE_PATTERNS.test(trimmed)) return false;
  return true;
}

function isGenericPortalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const normalized = `${parsed.hostname}${parsed.pathname}`;
    return GENERIC_PORTAL_ROOTS.some((rx) => rx.test(normalized));
  } catch {
    return false;
  }
}

const siteImageCache = new Map<string, string | null>();
const wikiImageCache = new Map<string, string | null>();
const openAgendaMatchCache = new Map<string, string | null>();

function extractBestImageFromHtml(html: string, baseUrl: string): string | null {
  // 1. Check OpenGraph, Twitter Card, and <link rel="image_src">
  const metaPatterns = [
    /<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /<meta[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
    /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of metaPatterns) {
    const m = html.match(pattern);
    if (m?.[1]) {
      try {
        const resolved = new URL(m[1].trim(), baseUrl).toString();
        if (isUsablePromoImageUrl(resolved)) {
          return resolved;
        }
      } catch {
        // Ignore invalid URL
      }
    }
  }

  // 2. Fallback: look for an editorial hero/content <img> outside header/nav/footer
  const contentHtml = html
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');

  const imgRegex = /<img\b[^>]*?(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  let checked = 0;

  while ((match = imgRegex.exec(contentHtml)) !== null && checked < 25) {
    checked++;
    const tag = match[0];
    const rawSrc = match[1].trim();
    if (!rawSrc || rawSrc.startsWith('data:')) continue;

    // Skip explicitly tiny icons/avatars declared via width/height attributes
    const widthMatch = tag.match(/\bwidth=["']?(\d+)/i);
    const heightMatch = tag.match(/\bheight=["']?(\d+)/i);
    if (widthMatch && parseInt(widthMatch[1], 10) > 0 && parseInt(widthMatch[1], 10) < 220) continue;
    if (heightMatch && parseInt(heightMatch[1], 10) > 0 && parseInt(heightMatch[1], 10) < 140) continue;

    try {
      const resolved = new URL(rawSrc, baseUrl).toString();
      if (!isUsablePromoImageUrl(resolved)) continue;
      if (/(emoji|wp-includes|gravatar|share|social|arrow|button|icon)/i.test(resolved)) continue;
      if (/\.(jpe?g|webp|png)(\?|$)/i.test(resolved) || /uploads|media|images/i.test(resolved)) {
        return resolved;
      }
    } catch {
      // Ignore malformed img src
    }
  }

  return null;
}

export async function fetchPromotionalSiteImage(targetUrl?: string): Promise<string | null> {
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl.trim())) return null;
  const cleanUrl = targetUrl.trim();
  if (isGenericPortalUrl(cleanUrl)) return null;

  if (siteImageCache.has(cleanUrl)) {
    return siteImageCache.get(cleanUrl) ?? null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
    const res = await fetch(cleanUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      siteImageCache.set(cleanUrl, null);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      siteImageCache.set(cleanUrl, null);
      return null;
    }

    const html = (await res.text()).slice(0, 120000);
    const extracted = extractBestImageFromHtml(html, res.url || cleanUrl);
    siteImageCache.set(cleanUrl, extracted);
    return extracted;
  } catch {
    siteImageCache.set(cleanUrl, null);
    return null;
  }
}

const TITLE_STOPWORDS = new Set([
  'festival', 'concert', 'salon', 'foire', 'randonnee', 'randonnée', 'rando', 'course',
  'trail', 'grand', 'grande', 'grandes', 'grands', 'edition', 'édition', 'occitanie',
  'france', 'sud', 'avec', 'pour', 'dans', 'entre', 'step', 'etape', 'étape', 'open',
  'cup', 'trophy', 'trophée', 'trophee', 'regates', 'régate', 'regate', 'session',
  'contest', 'nationale', 'national', 'regionale', 'régionale', 'interregional',
  'interrégional', 'manifestation', 'evenement', 'événement', 'journee', 'journée',
  'week', 'weekend', '2026', '2027',
]);

function extractSignificantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !TITLE_STOPWORDS.has(w));
}

async function fetchOpenAgendaPosterMatch(candidate: ImageLookupCandidate): Promise<string | null> {
  const cleanCity = (candidate.city || '').split(/[\/,(]/)[0].trim();
  const tokens = extractSignificantTokens(candidate.title);
  if (tokens.length === 0) return null;

  const cacheKey = `${cleanCity.toLowerCase()}__${tokens.slice(0, 3).join('_')}`;
  if (openAgendaMatchCache.has(cacheKey)) {
    return openAgendaMatchCache.get(cacheKey) ?? null;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const searchToken = tokens[0];
    const cityFilter = cleanCity.length >= 3 ? `AND search(location_city, "${cleanCity.replace(/"/g, '')}")` : '';
    const where = `image IS NOT NULL AND firstdate_begin >= "${todayStr}" ${cityFilter} AND (search(title_fr, "${searchToken}") OR search(keywords_fr, "${searchToken}"))`;
    const url = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records?limit=8&where=${encodeURIComponent(where)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2600);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      openAgendaMatchCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    const records = Array.isArray(data.results) ? data.results : [];

    for (const r of records) {
      const rTitle = String(r.title_fr || '');
      const rTokens = new Set(extractSignificantTokens(rTitle));
      const overlap = tokens.filter((t) => rTokens.has(t)).length;
      if (overlap >= 2 || (tokens.length === 1 && overlap === 1 && cleanCity.length >= 3)) {
        const rawImg =
          (typeof r.image === 'string' ? r.image : r.image?.url) ||
          r.thumbnail ||
          (typeof r.originalimage === 'string' ? r.originalimage : r.originalimage?.url);
        if (isUsablePromoImageUrl(rawImg)) {
          openAgendaMatchCache.set(cacheKey, rawImg.trim());
          return rawImg.trim();
        }
      }
    }
  } catch {
    // Ignore timeout
  }

  openAgendaMatchCache.set(cacheKey, null);
  return null;
}

const KNOWN_LANDMARKS_REGEX =
  /(Lac du Salagou|Pic Saint-Loup|Étang de Thau|Bassin de Thau|Baie de Thau|Arènes de Nîmes|Arènes Romaines de Nîmes|Cité de Carcassonne|Pont du Gard|Mont Aigoual|Gorges du Tarn|Canal du Midi|Cirque de Navacelles|Viaduc de Millau|La Franqui|Cap d'Agde|Saint-Guilhem-le-Désert|Aigues-Mortes|Palavas-les-Flots|La Grande-Motte|Collioure|Gruissan|Leucate|Cévennes|Camargue|Canigou|Pyrénées|Capitole de Toulouse|Zénith Sud|Défi Wind|Roc d'Azur|Pause Guitare|Les Déferlantes|Festival de Nîmes|Feria de Nîmes|Paloma)/i;

function buildWikipediaQueries(candidate: ImageLookupCandidate): string[] {
  const queries: string[] = [];
  const combined = `${candidate.title || ''} ${candidate.locationDetails || ''}`;

  // 1. Named landmark / famous venue / well-known event directly mentioned in title or venue
  const landmarkMatch = combined.match(KNOWN_LANDMARKS_REGEX);
  if (landmarkMatch?.[1]) {
    let lm = landmarkMatch[1].trim();
    if (/baie de thau|bassin de thau/i.test(lm)) lm = 'Étang de Thau';
    if (/arènes romaines de nîmes/i.test(lm)) lm = 'Arènes de Nîmes';
    queries.push(lm);
  }

  // 2. Clean venue part before " - " or " (" if substantial
  if (candidate.locationDetails) {
    const venuePart = candidate.locationDetails.split(/[-–(]/)[0].trim();
    if (
      venuePart.length >= 5 &&
      venuePart.length <= 55 &&
      !/^(base|plage|centre|espace|parc|salle|stade|domaine|place)/i.test(venuePart)
    ) {
      queries.push(venuePart);
    }
  }

  // 3. Clean city name (primary town)
  if (candidate.city) {
    const cleanCity = candidate.city.split(/[\/,(]/)[0].trim();
    if (cleanCity.length >= 3 && !/^occitanie|france$/i.test(cleanCity)) {
      queries.push(cleanCity);
    }
  }

  return Array.from(new Set(queries)).slice(0, 3);
}

async function queryFrenchWikipediaPhoto(queryText: string): Promise<string | null> {
  const key = queryText.toLowerCase().trim();
  if (!key) return null;
  if (wikiImageCache.has(key)) {
    return wikiImageCache.get(key) ?? null;
  }

  try {
    const url = `https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      queryText
    )}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=960&format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VeilleManifestationsOccitanie/1.0 (https://localhost)',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      wikiImageCache.set(key, null);
      return null;
    }

    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {}) as Array<any>;
    pages.sort((a, b) => (a.index || 99) - (b.index || 99));

    for (const page of pages) {
      const thumb = page?.thumbnail;
      const src = thumb?.source as string | undefined;
      const w = Number(thumb?.width || 0);
      const h = Number(thumb?.height || 0);

      if (!src || !isUsablePromoImageUrl(src)) continue;
      // Reject tiny icons and tall vertical portraits
      if (w < 480 || (h > 0 && h > w * 1.15)) continue;
      // Avoid generic department map pages when searching for a town/landmark
      if (/\(département\)/i.test(String(page.title || ''))) continue;

      wikiImageCache.set(key, src);
      return src;
    }
  } catch {
    // Ignore network/timeout
  }

  wikiImageCache.set(key, null);
  return null;
}

export async function resolveBestEventImage(candidate: ImageLookupCandidate): Promise<string | null> {
  if (isUsablePromoImageUrl(candidate.imageUrl)) {
    return candidate.imageUrl.trim();
  }

  // Tier 1: Direct promotional website scrape (event-specific URLs & official event sites)
  if (candidate.sourceUrl) {
    const promoImg = await fetchPromotionalSiteImage(candidate.sourceUrl);
    if (promoImg) return promoImg;
  }

  // Tier 2: Strict OpenAgenda cross-match (event poster from Open Data France)
  const oaPoster = await fetchOpenAgendaPosterMatch(candidate);
  if (oaPoster) return oaPoster;

  // Tier 3: Wikipedia / Wikimedia verified photography for iconic venue, landmark, or city
  const wikiQueries = buildWikipediaQueries(candidate);
  for (const q of wikiQueries) {
    const wikiImg = await queryFrenchWikipediaPhoto(q);
    if (wikiImg) return wikiImg;
  }

  return null;
}

/**
 * Concurrency-limited batch resolver so dozens of upcoming events can be enriched
 * rapidly (~1-2s total) without hammering remote servers.
 */
export async function enrichEventsWithImages<T extends ImageLookupCandidate>(
  candidates: T[],
  maxLookups: number = 60,
  concurrency: number = 8
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const pendingIndices: number[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (isUsablePromoImageUrl(c.imageUrl)) {
      results.set(i, c.imageUrl.trim());
    } else if (pendingIndices.length < maxLookups) {
      pendingIndices.push(i);
    }
  }

  let cursor = 0;
  async function worker() {
    while (cursor < pendingIndices.length) {
      const idx = pendingIndices[cursor++];
      const resolved = await resolveBestEventImage(candidates[idx]);
      if (resolved) {
        results.set(idx, resolved);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, pendingIndices.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
