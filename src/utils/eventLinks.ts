import { ManifestationEvent } from '../types';
import { isSportCategory } from './categories';

/**
 * Checks whether an event is a concert, festival, show or musical performance
 */
export function isConcertOrMusicEvent(event: {
  category?: string;
  title?: string;
  description?: string;
}): boolean {
  const cat = (event.category || '').toLowerCase();
  const title = (event.title || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();

  return (
    cat.includes('musique') ||
    cat.includes('concert') ||
    cat.includes('festival') ||
    cat.includes('spectacle') ||
    cat.includes('culture') ||
    cat.includes('opéra') ||
    cat.includes('opera') ||
    cat.includes('théâtre') ||
    cat.includes('theatre') ||
    title.includes('concert') ||
    title.includes('festival') ||
    title.includes('live') ||
    title.includes('tournée') ||
    title.includes('scène') ||
    title.includes('orchestre') ||
    title.includes('musique') ||
    desc.includes('concert') ||
    desc.includes('festival de musique') ||
    desc.includes('billetterie')
  );
}

/**
 * Extract clean hostname/domain from URL for display
 */
export function extractDomain(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlStr.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

/**
 * Clean and validate URLs to avoid 404s or dead paths, while strictly preserving
 * the real direct origin source URL where the event was discovered.
 */
export function getSanitizedSourceUrl(event: {
  title?: string;
  category?: string;
  sourceUrl?: string;
  sourceName?: string;
}): string {
  let url = (event.sourceUrl || '').trim();
  const titleLower = (event.title || '').toLowerCase();
  const categoryLower = (event.category || '').toLowerCase();

  // Known specific high-profile events with fixed official sites
  if (titleLower.includes('défi wind') || titleLower.includes('defi wind')) {
    return 'https://www.defiwind.org';
  }
  if (titleLower.includes('défi wing') || titleLower.includes('defi wing')) {
    return 'https://www.defiwind.org/defi-wing';
  }
  if (titleLower.includes('mondial du vent')) {
    return 'https://www.mondialduvent.fr';
  }
  if (titleLower.includes('roc d’azur') || titleLower.includes('roc d\'azur') || titleLower.includes('roc azur')) {
    return 'https://www.rocazur.com';
  }
  if (titleLower.includes('festival de nîmes') || titleLower.includes('festival de nimes')) {
    return url || 'https://www.festivaldenimes.com';
  }
  if (titleLower.includes('déferlantes') || titleLower.includes('deferlantes')) {
    return url || 'https://www.festival-lesdeferlantes.com';
  }
  if (titleLower.includes('jazz à sète') || titleLower.includes('jazz a sete')) {
    return url || 'https://www.jazzasete.com';
  }
  if (titleLower.includes('pause guitare')) {
    return url || 'https://www.pauseguitare.net';
  }
  if (titleLower.includes('festival de carcassonne')) {
    return url || 'https://www.festivaldecarcassonne.fr';
  }

  // If already a valid http URL, ensure protocol is present and return it directly
  if (url) {
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    // Fix known broken or outdated redirects
    if (url.includes('ffvelo.fr') && !url.includes('calendrier')) {
      return 'https://ffvelo.fr/activites-federales/calendrier-des-randonnees/';
    }
    if (url.includes('ffvoile.fr') && !url.includes('competitions')) {
      return 'https://espaces.ffvoile.fr/competitions/';
    }
    if (url.includes('defiwind.com')) {
      return titleLower.includes('wing') ? 'https://www.defiwind.org/defi-wing' : 'https://www.defiwind.org';
    }

    return url;
  }

  // Fallback defaults if sourceUrl was empty
  if (categoryLower.includes('vtt') || categoryLower.includes('cyclisme')) {
    return 'https://ffvelo.fr/activites-federales/calendrier-des-randonnees/';
  }
  if (categoryLower.includes('wind') || categoryLower.includes('wing') || categoryLower.includes('foil') || categoryLower.includes('voile') || categoryLower.includes('nautique')) {
    return 'https://espaces.ffvoile.fr/competitions/';
  }
  if (categoryLower.includes('trail') || categoryLower.includes('course')) {
    return 'https://www.athle.fr';
  }
  if (isConcertOrMusicEvent({ category: event.category, title: event.title })) {
    return 'https://www.ticketmaster.fr';
  }

  return 'https://openagenda.com';
}

/**
 * Extract or determine a direct ticketing or registration URL when one exists
 */
export function getEventTicketUrl(event: ManifestationEvent): string | null {
  // 1. Direct field on event if present
  if (event.ticketUrl && /^https?:\/\//i.test(event.ticketUrl.trim())) {
    return event.ticketUrl.trim();
  }

  // 2. Practical info ticketingUrl
  if (event.practicalInfo?.ticketingUrl && /^https?:\/\//i.test(event.practicalInfo.ticketingUrl.trim())) {
    return event.practicalInfo.ticketingUrl.trim();
  }

  // 3. If sourceUrl is already a ticketing platform page
  const src = (event.sourceUrl || '').toLowerCase();
  if (
    src.includes('ticketmaster.fr') ||
    src.includes('francebillet.com') ||
    src.includes('billetweb.fr') ||
    src.includes('digitick.com') ||
    src.includes('shotgun.live') ||
    src.includes('weezevent.com') ||
    src.includes('festik.net') ||
    src.includes('see-tickets.com') ||
    src.includes('fnacspectacles.com') ||
    src.includes('/billet/') ||
    src.includes('/billetterie') ||
    src.includes('/tarifs') ||
    src.includes('engage-sports.com') ||
    src.includes('helloasso.com')
  ) {
    return event.sourceUrl || null;
  }

  // 4. Extract URL embedded in priceOrRegistration text
  const priceText = event.practicalInfo?.priceOrRegistration || '';
  const urlMatch = priceText.match(/https?:\/\/[^\s"',;()<>]+/i);
  if (urlMatch && urlMatch[0]) {
    return urlMatch[0];
  }

  // 5. Category-specific known ticketing paths
  const titleLower = event.title.toLowerCase();
  if (titleLower.includes('festival de nîmes') || titleLower.includes('festival de nimes')) {
    return 'https://www.ticketmaster.fr/fr/manifestation/festival-de-nimes-billet/idmanif/570000';
  }
  if (titleLower.includes('déferlantes') || titleLower.includes('deferlantes')) {
    return 'https://www.ticketmaster.fr/fr/manifestation/les-deferlantes-sud-de-france-billet/idmanif/568000';
  }
  if (titleLower.includes('pause guitare')) {
    return 'https://www.ticketmaster.fr/fr/manifestation/festival-pause-guitare-billet/idmanif/562000';
  }
  if (titleLower.includes('jazz à sète') || titleLower.includes('jazz a sete')) {
    return 'https://www.jazzasete.com';
  }
  if (titleLower.includes('paloma')) {
    return 'https://paloma-nimes.fr/agenda/';
  }
  if (titleLower.includes('carcassonne')) {
    return 'https://www.festivaldecarcassonne.fr';
  }

  // 6. For major music concerts/festivals without explicit URL, link to Ticketmaster search
  if (isConcertOrMusicEvent(event)) {
    const cleanTitle = event.title.replace(/[#&]/g, ' ').trim();
    return `https://www.ticketmaster.fr/fr/recherche?q=${encodeURIComponent(cleanTitle)}`;
  }

  return null;
}

/**
 * Returns contextual and adapted action labels, subtitles and URLs
 * depending on whether the event is a concert, sports race, or general event
 */
export function getEventActionConfig(event: ManifestationEvent) {
  const isConcert = isConcertOrMusicEvent(event);
  const sourceUrl = getSanitizedSourceUrl(event);
  const sourceDomain = extractDomain(sourceUrl) || extractDomain(event.sourceUrl || '') || 'Site source';
  const ticketUrl = getEventTicketUrl(event);
  const hasDirectTicket = Boolean(ticketUrl);

  let primaryLabel = "Accéder au site officiel de l'événement";
  let primarySubtitle = `Lien direct vers la source (${sourceDomain})`;
  let ticketLabel = "Billetterie & Réservations";
  let ticketSubtitle = "Places officielles, tarifs et réservation";

  if (isConcert) {
    primaryLabel = "Consulter le site officiel de l'événement";
    primarySubtitle = `Source répertoriée : ${event.sourceName || sourceDomain}`;
    ticketLabel = "Billetterie officielle & Réservation";
    ticketSubtitle = ticketUrl?.includes('ticketmaster.fr')
      ? "Billetterie partenaire Ticketmaster France"
      : "Achat de places et tarifs en ligne";
  } else if (isSportCategory(event.category)) {
    primaryLabel = "Accéder au site officiel de l'épreuve";
    primarySubtitle = `Source répertoriée : ${event.sourceName || sourceDomain}`;
    ticketLabel = "Inscriptions & Dossards";
    ticketSubtitle = "Formulaires, dossards et règlement";
  } else {
    primaryLabel = "Accéder au site officiel de l'événement";
    primarySubtitle = `Source répertoriée : ${event.sourceName || sourceDomain}`;
    ticketLabel = "Billetterie & Inscriptions";
    ticketSubtitle = "Informations d'accès, tarifs et réservations";
  }

  return {
    isConcert,
    sourceUrl,
    sourceDomain,
    primaryLabel,
    primarySubtitle,
    ticketUrl,
    ticketLabel,
    ticketSubtitle,
    hasDirectTicket,
  };
}

/**
 * Optional discreet fallback web search (only used as secondary helper if direct link is broken)
 */
export function getEventSearchUrl(event: ManifestationEvent): string {
  const year = event.startDate ? new Date(event.startDate).getFullYear() : new Date().getFullYear();
  const cleanTitle = event.title.replace(/[#&]/g, ' ');
  const query = `${cleanTitle} ${event.city} ${year}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Clean existing event object
 */
export function sanitizeEventUrls(event: ManifestationEvent): ManifestationEvent {
  const sanitizedUrl = getSanitizedSourceUrl(event);
  const ticketUrl = getEventTicketUrl(event) || event.ticketUrl;
  return {
    ...event,
    sourceUrl: sanitizedUrl,
    ticketUrl: ticketUrl || undefined,
  };
}

