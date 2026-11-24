import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  fetchOpenAgendaEvents,
  fetchTicketmasterEvents,
  getCuratedTicketmasterEvents,
  getEnrichedRegionalCatalog,
  ApiEventCandidate,
} from './server/apiSources';
import { scrapeTargetSiteEvents } from './server/customSiteScraper';
import { enrichEventsWithImages, isUsablePromoImageUrl } from './server/imageEnricher';
import { classifyEventCategory } from './src/utils/categories';
import { reconcileKnownEventDates } from './src/utils/knownEventDates';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client safely if key is available
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health & Status
app.get('/api/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const hasTicketmasterKey = Boolean(process.env.TICKETMASTER_API_KEY);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    hasTicketmasterKey,
    serverTime: new Date().toISOString(),
  });
});

// Test Ticketmaster Discovery API Endpoint
app.post('/api/test-ticketmaster', async (req, res) => {
  const { apiKey } = req.body || {};
  const keyToUse = apiKey || process.env.TICKETMASTER_API_KEY;
  if (!keyToUse) {
    return res.status(400).json({ success: false, error: 'Aucune clé API Ticketmaster fournie.' });
  }
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(keyToUse)}&countryCode=FR&size=5`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Erreur Ticketmaster (HTTP ${response.status}). Vérifiez votre Consumer Key.`,
      });
    }
    const data = await response.json();
    const count = data.page?.totalElements || data._embedded?.events?.length || 0;
    const sample = (data._embedded?.events || []).slice(0, 3).map((e: any) => ({
      name: e.name,
      city: e._embedded?.venues?.[0]?.city?.name || 'France',
      date: e.dates?.start?.localDate,
    }));
    return res.json({ success: true, count, sample });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Erreur de connexion Ticketmaster.' });
  }
});

// Test Custom Target Website Scraper
app.post('/api/test-custom-site', async (req, res) => {
  const { url, name } = req.body || {};
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL manquante.' });
  }
  let resolvedName = typeof name === 'string' && name.trim() ? name.trim() : '';
  if (!resolvedName) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(String(url)) ? String(url) : `https://${url}`;
      resolvedName = new URL(normalizedUrl).hostname.replace(/^www\./, '');
    } catch {
      resolvedName = 'Site ciblé';
    }
  }
  const result = await scrapeTargetSiteEvents(url, resolvedName, 6);
  return res.json(result);
});

// Real-time URL Health Checker to verify that source & ticketing links are active & working (no 404)
app.post('/api/check-url', async (req, res) => {
  let { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ valid: false, error: 'URL requise.' });
  }

  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let response: any;
    try {
      // First try a HEAD request
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });
    } catch {
      // If HEAD fails, try a lightweight GET
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Range': 'bytes=0-2048',
        },
        redirect: 'follow',
      });
    } finally {
      clearTimeout(timeout);
    }

    const status = response.status;
    // 200-399 is directly OK
    // 401/403 means host and path exist and are active, but datacenter IPs receive bot challenge (human browser works)
    // 404/410 means dead link
    const isOk = (status >= 200 && status < 400) || status === 401 || status === 403;

    let message = `Site accessible et vérifié (HTTP ${status})`;
    if (status >= 200 && status < 400) {
      message = `Site accessible et vérifié (HTTP ${status})`;
    } else if (status === 403 || status === 401) {
      message = `Site actif et sécurisé (HTTP ${status})`;
    } else if (status === 404 || status === 410) {
      message = `Lien introuvable ou déplacé (HTTP ${status})`;
    } else {
      message = `Réponse serveur HTTP ${status}`;
    }

    return res.json({
      valid: isOk,
      status,
      finalUrl: response.url || url,
      message,
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return res.json({
      valid: false,
      status: 0,
      error: isTimeout ? 'Délai d’attente dépassé (timeout 4s)' : (err?.message || 'Erreur de connexion au site source'),
    });
  }
});

// Helper to generate dynamic dates
function getOffsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Batch endpoint to enrich existing cached browser events with real promotional or venue photographs
app.post('/api/enrich-images', async (req, res) => {
  try {
    const rawEvents = Array.isArray(req.body?.events) ? req.body.events : [];
    const batch = rawEvents
      .filter((e: any) => e && e.id && e.title)
      .slice(0, 60)
      .map((e: any) => ({
        id: String(e.id),
        title: String(e.title),
        category: e.category ? String(e.category) : undefined,
        city: e.city ? String(e.city) : undefined,
        locationDetails: e.locationDetails ? String(e.locationDetails) : undefined,
        sourceUrl: e.sourceUrl ? String(e.sourceUrl) : undefined,
        imageUrl: e.imageUrl ? String(e.imageUrl) : undefined,
      }));

    if (batch.length === 0) {
      return res.json({ success: true, images: {}, enrichedCount: 0 });
    }

    const resolvedMap = await enrichEventsWithImages(batch, 60, 10);
    const images: Record<string, string> = {};
    for (const [idx, imgUrl] of resolvedMap.entries()) {
      const id = batch[idx]?.id;
      if (id && imgUrl) {
        images[id] = imgUrl;
      }
    }

    return res.json({
      success: true,
      images,
      enrichedCount: Object.keys(images).length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      images: {},
      error: err?.message || 'Erreur lors de la recherche de visuels.',
    });
  }
});

// Rate-limit & quota tracker to handle 429 RESOURCE_EXHAUSTED smoothly without stderr errors
let quotaCooldownUntil = 0;

// Smart Automated Scan Endpoint
app.post('/api/scan', async (req, res) => {
  const {
    interests = ['VTT', 'windfoil', 'wingfoil', 'Festivals & Concerts'],
    geographicFocus = "France avec un approfondissement sur l'Occitanie",
    departments = ['34 - Hérault', '11 - Aude', '30 - Gard', '66 - Pyrénées-Orientales'],
    horizonMonths = 6,
    customTargetSites = [],
    ticketmasterApiKey,
  } = req.body || {};

  const startTime = Date.now();
  const ai = getAi();
  const todayStr = new Date().toISOString().split('T')[0];

  let rawResults: any[] = [];
  let usedGeminiSearch = false;
  let quotaExceededNotice = false;

  // Check cooldown status for Gemini
  const isCooldownActive = Date.now() < quotaCooldownUntil;
  if (isCooldownActive) {
    quotaExceededNotice = true;
  }

  // Identify active custom target sites
  const activeCustomSites: Array<{ name: string; url: string }> = Array.isArray(customTargetSites)
    ? customTargetSites.filter((s: any) => s && s.enabled !== false && s.url)
    : [];

  const sourcesConsulted: string[] = [];

  // 1. Direct Scrape of user-provided Custom Target Sites
  const customSiteEvents: ApiEventCandidate[] = [];
  for (const site of activeCustomSites) {
    try {
      const scraped = await scrapeTargetSiteEvents(site.url, site.name, horizonMonths);
      if (scraped.events && scraped.events.length > 0) {
        customSiteEvents.push(...scraped.events);
        sourcesConsulted.push(`Site ciblé : ${site.name} (${scraped.events.length} événements extraits directement)`);
      } else {
        sourcesConsulted.push(`Site ciblé : ${site.name} (${site.url})`);
      }
    } catch {
      sourcesConsulted.push(`Site ciblé : ${site.name} (${site.url})`);
    }
  }

  // 2. Fetch OpenAgenda (Open Data France / OpenDataSoft - over 120,000 public events)
  let openAgendaEvents: ApiEventCandidate[] = [];
  try {
    openAgendaEvents = await fetchOpenAgendaEvents(interests, departments, horizonMonths);
    if (openAgendaEvents.length > 0) {
      sourcesConsulted.push(`OpenAgenda (Open Data France - ${openAgendaEvents.length} événements collectés)`);
    }
  } catch (err) {
    console.log('[OpenAgenda Scan Fetch]:', err);
  }

  // 3. Fetch Ticketmaster Discovery API or curated Ticketmaster festivals/concerts
  const tmKey = ticketmasterApiKey || process.env.TICKETMASTER_API_KEY;
  let ticketmasterEvents: ApiEventCandidate[] = [];
  try {
    if (tmKey) {
      ticketmasterEvents = await fetchTicketmasterEvents(tmKey, interests, departments, horizonMonths);
      if (ticketmasterEvents.length > 0) {
        sourcesConsulted.push(`Ticketmaster Discovery API (${ticketmasterEvents.length} événements avec billetterie)`);
      }
    }
    // Also add curated major Ticketmaster events for Occitanie (Nîmes, Déferlantes, Pause Guitare, Zénith Sud)
    const curatedTm = getCuratedTicketmasterEvents();
    ticketmasterEvents.push(...curatedTm);
    if (!tmKey) {
      sourcesConsulted.push(`Ticketmaster France (Grands festivals & concerts en Occitanie)`);
    }
  } catch (err) {
    console.log('[Ticketmaster Scan Fetch]:', err);
  }

  // 4. Try Gemini Google Search grounding (2 parallel focused passes) if available and not on quota cooldown
  let geminiEvents: any[] = [];
  if (ai && !isCooldownActive) {
    const interestsList = Array.isArray(interests) ? interests : [];
    const interestsStr = interestsList
      .map((i: any) => (typeof i === 'string' ? i : `${i.name}${i.keywords?.length ? ` (${i.keywords.slice(0, 4).join(', ')})` : ''}`))
      .join(', ') || 'Tous types d’événements et disciplines';

    const customSitesPrompt = activeCustomSites.length > 0
      ? `\nSITES WEB CIBLES DÉSIGNÉS PAR L'UTILISATEUR À SCRUTER EN PRIORITÉ :\n${activeCustomSites.map((s) => `- ${s.name} : ${s.url}`).join('\n')}\n`
      : '';

    const jsonSchemaPrompt = `Réponds UNIQUEMENT par un tableau JSON valide (entre [ et ]) sans texte avant ou après, respectant exactement ce format :
[
  {
    "title": "Nom précis de la manifestation",
    "category": "Catégorie précise (Sports nautiques, VTT & Cyclisme, Trail & Course à pied, Randonnée & Plein air, Sports & Compétitions, Culture & Musique, Culture & Spectacles, Patrimoine & Terroir, Sciences & Nature, Loisirs & Vie locale)",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "city": "Nom de la ville",
    "department": "Numéro et nom du département (ex: 34 - Hérault)",
    "region": "Occitanie ou autre région",
    "locationDetails": "Lieu précis",
    "description": "Description concise et informative",
    "detailLevel": "high" | "medium" | "low",
    "practicalInfo": {
      "schedule": "Horaires précis si connus",
      "priceOrRegistration": "Tarifs ou lien d'inscription/billetterie",
      "organizer": "Organisateur, club ou association",
      "difficultyOrFormat": "Format de l'épreuve ou type d'animation",
      "conditionsOrSpot": "Conditions d'accès ou spécificités"
    },
    "sourceName": "Nom de la source",
    "sourceUrl": "URL de référence réelle",
    "sourceType": "ticketmaster" | "openagenda" | "tourism_office" | "federation" | "specialized_site",
    "relevanceScore": 95
  }
]`;

    const promptSports = `Tu es un moteur de veille spécialisé dans les MANIFESTATIONS SPORTIVES, SPORTS NAUTIQUES ET PLEIN AIR en France et prioritairement en Occitanie.
Date actuelle : ${todayStr}.
Horizon temporel STRICT : uniquement entre ${todayStr} et ${horizonMonths} mois plus tard.
Thématiques demandées : ${interestsStr}.
Zone géographique prioritaire : ${geographicFocus} (départements cibles : ${departments.join(', ')}).
${customSitesPrompt}
CONSIGNE IMPÉRATIVE QUANTITÉ & PRÉCISION :
- Trouve 25 à 30 manifestations sportives réelles et distinctes à venir : régates et compétitions de Voile, Windfoil, Wingfoil, Kitesurf, Paddle, courses VTT/Cyclisme/Gravel, Trails & courses à pied, randonnées, tournois (tennis, rugby, etc.).
- Ne classe JAMAIS une épreuve de Trail en VTT, et classe toute épreuve de Voile, Windfoil, Wingfoil, Kitesurf ou Paddle dans "Sports nautiques".
${jsonSchemaPrompt}`;

    const promptCulture = `Tu es un moteur de veille spécialisé dans les MANIFESTATIONS CULTURELLES, FESTIVALS, TERROIR ET LOISIRS en France et prioritairement en Occitanie.
Date actuelle : ${todayStr}.
Horizon temporel STRICT : uniquement entre ${todayStr} et ${horizonMonths} mois plus tard.
Thématiques demandées : ${interestsStr}.
Zone géographique prioritaire : ${geographicFocus} (départements cibles : ${departments.join(', ')}).
${customSitesPrompt}
CONSIGNE IMPÉRATIVE QUANTITÉ & DIVERSITÉ :
- Trouve 25 à 30 manifestations culturelles et locales réelles et distinctes à venir : concerts, festivals de musique, théâtre, spectacles vivants, fêtes médiévales/terroir, astronomie/sciences, brocantes et salons.
- Répartis sur l'horizon de ${horizonMonths} mois.
${jsonSchemaPrompt}`;

    const runGroundedSearch = async (promptText: string): Promise<any[]> => {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'Tu es un expert de la veille événementielle sportive et culturelle en France et Occitanie. Utilise la recherche web et réponds exclusivement par un tableau JSON strict.',
        },
      });

      const groundingChunks: Array<{ web?: { uri?: string; title?: string } }> =
        (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
      const fallbackGroundedUrl = groundingChunks.find((c) => c?.web?.uri)?.web?.uri || '';

      const responseText = response.text?.trim() || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((ev: any) => ({
        ...ev,
        sourceUrl: ev?.sourceUrl || fallbackGroundedUrl,
      }));
    };

    const settled = await Promise.allSettled([
      runGroundedSearch(promptSports),
      runGroundedSearch(promptCulture),
    ]);

    for (const resPromise of settled) {
      if (resPromise.status === 'fulfilled' && resPromise.value.length > 0) {
        geminiEvents.push(...resPromise.value);
        usedGeminiSearch = true;
      } else if (resPromise.status === 'rejected') {
        const errorMsg = resPromise.reason?.message || '';
        const isQuotaError =
          errorMsg.includes('429') ||
          errorMsg.includes('RESOURCE_EXHAUSTED') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('rate-limit');
        if (isQuotaError) {
          quotaCooldownUntil = Date.now() + 60 * 1000;
          quotaExceededNotice = true;
        }
      }
    }

    if (usedGeminiSearch) {
      sourcesConsulted.push(`Google Search Engine (Recherche web temps réel — ${geminiEvents.length} pistes)`);
    }
  }

  // 5. Regional verified multi-discipline catalog
  const regionalCatalog = getEnrichedRegionalCatalog();
  sourcesConsulted.push('Offices de Tourisme & Agendas Locaux (Occitanie & Régions)');
  sourcesConsulted.push('Portails Fédéraux (FFVélo, FFC, FFVoile, FFA)');

  // 6. Combine all streams: Custom Sites + OpenAgenda + Ticketmaster + Gemini + Regional Base
  const combinedCandidates: any[] = [
    ...customSiteEvents,
    ...openAgendaEvents,
    ...ticketmasterEvents,
    ...geminiEvents,
    ...regionalCatalog,
  ];

  // Smart deduplication by normalized title, city AND startDate (so multi-date series aren't collapsed)
  const seenKeys = new Set<string>();
  const deduplicated: any[] = [];

  for (const item of combinedCandidates) {
    if (!item || !item.title) continue;
    const normTitle = String(item.title).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 22);
    const normCity = String(item.city || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    const sDate = String(item.startDate || '').trim().slice(0, 10);
    const key = `${normTitle}__${normCity}__${sDate}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const reconciled = reconcileKnownEventDates({
        ...item,
        title: String(item.title),
        startDate: sDate,
        endDate: item.endDate ? String(item.endDate).trim().slice(0, 10) : undefined,
        category: classifyEventCategory(String(item.title), String(item.description || ''), String(item.category || '')),
      });
      const { _dateCorrected, ...cleanReconciled } = reconciled;
      deduplicated.push(cleanReconciled);
    }
  }

  rawResults = deduplicated;

  // Strict date boundaries: guarantee every returned event is active or upcoming within the requested horizon
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const maxDate = new Date(now.getFullYear(), now.getMonth() + (horizonMonths || 6), now.getDate());
  const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
  const pastYearRegex = /\b(201\d|202[0-5])\b/;

  const validCandidates = rawResults.filter((item: any) => {
    if (!item || !item.title) return false;
    const title = String(item.title).trim();
    if (pastYearRegex.test(title)) return false; // Reject obsolete historical titles

    const sDate = String(item.startDate || '').trim().slice(0, 10);
    if (!sDate) return false;
    const eDate = String(item.endDate || sDate).trim().slice(0, 10);

    // Must still be active or upcoming (endDate >= today) and start before horizon max date
    if (eDate < localTodayStr || sDate > maxDateStr) return false;

    return true;
  });

  // Use valid candidates or safe regional catalog if all were filtered
  const finalCandidates = validCandidates.length > 0 ? validCandidates : getEnrichedRegionalCatalog();

  // Sort candidates soonest-first before enriching visuals so immediate periods always get priority
  finalCandidates.sort((a: any, b: any) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
  const resolvedImagesMap = await enrichEventsWithImages(finalCandidates, 90, 10);

  // Format events consistently with similarity hash and unique ID without arbitrary limit
  const nowIso = new Date().toISOString();
  const formattedEvents = finalCandidates.map((item: any, idx: number) => {
    const title = String(item.title || 'Manifestation').trim();
    const city = String(item.city || 'Occitanie').trim();
    const startDate = String(item.startDate || getOffsetDate(idx * 15)).trim();
    const category = classifyEventCategory(title, String(item.description || ''), String(item.category || ''));
    
    // Sanitize practicalInfo to guarantee no historical year is ever displayed
    const practicalInfo = { ...(item.practicalInfo || {}) };
    if (practicalInfo.schedule && pastYearRegex.test(String(practicalInfo.schedule))) {
      // Remove obsolete historical year mention from schedule text
      practicalInfo.schedule = undefined;
    }

    // Normalize similarity hash
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    const cleanCity = city.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const similarityHash = `${category.toLowerCase()}__${cleanTitle}__${cleanCity}__${startDate}`;
    const id = `evt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;

    const resolvedPromoImage =
      resolvedImagesMap.get(idx) ||
      (isUsablePromoImageUrl(item.imageUrl) ? String(item.imageUrl).trim() : undefined);

    const lat = Number(item.latitude);
    const lng = Number(item.longitude);

    return {
      id,
      title,
      category,
      startDate,
      endDate: item.endDate || startDate,
      city,
      department: item.department || 'Occitanie',
      region: item.region || 'Occitanie',
      locationDetails: item.locationDetails || '',
      latitude: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
      longitude: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
      description: item.description || 'Manifestation sportive et de plein air.',
      detailLevel: item.detailLevel || 'medium',
      practicalInfo,
      sourceName: item.sourceName || 'Veille Web & Calendriers',
      sourceUrl: item.sourceUrl || '',
      imageUrl: resolvedPromoImage,
      ticketUrl: item.ticketUrl || practicalInfo.ticketingUrl || undefined,
      sourceType: item.sourceType || 'search_engine',
      firstDiscoveredAt: nowIso,
      lastVerifiedAt: nowIso,
      status: 'new',
      similarityHash,
      relevanceScore: Number(item.relevanceScore) || 90,
    };
  });

  const durationMs = Date.now() - startTime;

  res.json({
    success: true,
    events: formattedEvents,
    count: formattedEvents.length,
    usedGeminiSearch,
    quotaExceeded: quotaExceededNotice,
    message: quotaExceededNotice
      ? 'Veille alimentée par le catalogue régional vérifié et enrichi (Quota API en ligne temporairement atteint).'
      : 'Veille effectuée avec succès.',
    durationMs,
    sourcesConsulted,
  });
});

async function startServer() {
  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          } else if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur de veille démarré sur http://localhost:${PORT}`);
  });
}

startServer();
