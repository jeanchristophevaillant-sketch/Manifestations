/**
 * Canonical discipline categories for user preferences (Settings)
 * and clean event classification across all scanners and views.
 */

export const DISCIPLINE_CATEGORIES = [
  'Sports nautiques',
  'Sports & Plein air',
  'Sports collectifs & Raquettes',
  'Culture & Musique',
  'Culture & Spectacles',
  'Patrimoine & Terroir',
  'Sciences & Nature',
  'Loisirs & Vie locale',
  'Autre',
] as const;

export type DisciplineCategory = (typeof DISCIPLINE_CATEGORIES)[number];

/**
 * Unicode-safe whole-word / phrase matcher for French text.
 * Unlike JS `\b`, treats accented letters (é, è, ê, à, ç, î, ô, ù...) as word characters
 * so e.g. "supérieur" never matches "sup" and "dévoile" never matches "voile".
 */
function buildWordRegex(alternation: string): RegExp {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])(?:${alternation})(?:$|[^\\p{L}\\p{N}_])`, 'iu');
}

const RX_INF_NAUTICAL = buildWordRegex(
  'voile|régate|régates|regates|windfoil|wingfoil|wing[- ]foil|wing|windsurf|planche à voile|kitesurf|kite|kitefoil|paddle|stand[- ]up[- ]paddle|sup|canoë|canoe|kayak|aviron|surf|bodyboard|plongée|apnée|natation|nage|nautique|nautisme|catamaran|dériveur|voilier|yachting|foil'
);
const RX_INF_TEAM_RACQUET = buildWordRegex(
  'tennis|padel|badminton|squash|tennis de table|ping[- ]pong|football|futsal|rugby|basketball|basket|handball|volleyball|volley|hockey|golf|baseball|escrime|judo|karaté|boxe'
);
const RX_INF_OUTDOOR = buildWordRegex(
  'vtt|mountain bike|cyclisme|vélo|velo|gravel|bmx|trail|ultra[- ]trail|running|marathon|course à pied|randonnée|rando|marche nordique|escalade|alpinisme|via ferrata|canyoning|spéléo|speleo|triathlon|duathlon|équitation|equitation|parapente|ski|snowboard'
);
const RX_INF_MUSIC = buildWordRegex(
  'concert|musique|jazz|rock|électro|electro|festival musical|opéra|opera|chanson'
);
const RX_INF_SPECTACLES = buildWordRegex(
  'théâtre|theatre|cirque|danse|arts de la rue|humour|spectacle|cinéma|cinema|exposition'
);
const RX_INF_PATRIMOINE = buildWordRegex(
  'terroir|gastronomie|vin|vendanges|médiévale|medievale|patrimoine|truffe|fromage|marché gourmand'
);
const RX_INF_SCIENCES = buildWordRegex(
  'astronomie|étoiles|etoiles|science|biodiversité|biodiversite|ornithologie|botanique|écologie|ecologie'
);
const RX_INF_LOISIRS = buildWordRegex(
  'brocante|vide[- ]greniers|antiquités|antiquites|puces|salon|foire|jeux|artisanat'
);

/**
 * Normalizes legacy/variant discipline category names in user preferences
 * and detects misclassified sports (e.g., Voile/Windfoil placed outside Sports nautiques).
 */
export function inferDisciplineCategory(name: string, currentCategory?: string): string {
  const n = (name || '').toLowerCase().trim();
  const cur = (currentCategory || '').trim();

  // Normalize legacy category labels first
  let normalizedCurrent = cur;
  if (/^culture\s*&\s*spectacle$/i.test(cur)) normalizedCurrent = 'Culture & Spectacles';
  if (/^sciences\s*&\s*savoirs$/i.test(cur)) normalizedCurrent = 'Sciences & Nature';
  if (/^culture\s*&\s*festivals$/i.test(cur)) normalizedCurrent = 'Culture & Musique';
  if (/^autre discipline$/i.test(cur)) normalizedCurrent = 'Autre';

  // Detect clearly nautical sports that were misclassified (e.g. because "Sports nautiques" was missing)
  if (RX_INF_NAUTICAL.test(n)) {
    return 'Sports nautiques';
  }

  // Detect clearly racquet / team sports misplaced in outdoor or generic categories
  if (RX_INF_TEAM_RACQUET.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre' || normalizedCurrent === 'Sports & Plein air') {
      return 'Sports collectifs & Raquettes';
    }
  }

  // Detect outdoor / endurance sports misplaced in Autre or Culture
  if (RX_INF_OUTDOOR.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre' || normalizedCurrent === 'Sports nautiques') {
      return 'Sports & Plein air';
    }
  }

  // Detect music/culture misplaced
  if (RX_INF_MUSIC.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre') {
      return 'Culture & Musique';
    }
  }

  // Detect spectacles/theatre misplaced
  if (RX_INF_SPECTACLES.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre') {
      return 'Culture & Spectacles';
    }
  }

  // Detect patrimoine/terroir
  if (RX_INF_PATRIMOINE.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre') {
      return 'Patrimoine & Terroir';
    }
  }

  // Detect sciences/nature
  if (RX_INF_SCIENCES.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre') {
      return 'Sciences & Nature';
    }
  }

  // Detect loisirs/brocantes
  if (RX_INF_LOISIRS.test(n)) {
    if (!normalizedCurrent || normalizedCurrent === 'Autre') {
      return 'Loisirs & Vie locale';
    }
  }

  return normalizedCurrent || 'Sports & Plein air';
}

const RX_CONCERT_TITLE = buildWordRegex(
  'concert|concerts|jazz|rock|indie rock|britpop|électro|electro|symphonique|orchestre|philharmonique|chanson|rap|hip[- ]hop|dj set|tournée|musiques actuelles|musiques du monde|opéra|opera|chorale|récital|recital'
);
const RX_CONCERT_DESC = buildWordRegex(
  'concert|groupe d[\'’]indie rock|groupe de rock|indie rock|britpop|tournée|premier album|scène musicale|musiques actuelles|dj set|orchestre symphonique|philharmonique|quatuor|opéra'
);
const RX_FESTIVAL = buildWordRegex('festival');
const RX_FESTIVAL_SPORT_EXCLUSION = buildWordRegex('vent|glisse|vtt|sport|nautique|voile|trail|vélo|velo');

const RX_PRO_LOCAL_EVENT = buildWordRegex(
  'france travail|créateurs d[\'’]entreprise|entrepreneurs|gestion de votre entreprise|recherche d[\'’]emploi|job dating|recrutement|atelier cv|reconversion|bts|formation professionnelle|orientation scolaire|forum emploi'
);
const RX_SPORT_TITLE_GUARD = buildWordRegex(
  'voile|régate|windfoil|wingfoil|kitesurf|paddle|kayak|aviron|surf|nautique|vtt|cyclisme|vélo|trail|marathon|course|randonnée|tennis|rugby|football|triathlon'
);

const RX_VOILE_FALSE_POSITIVE = buildWordRegex(
  'voile de la mariée|voile islamique|sous le voile|lever le voile|lève le voile|sans voile|voile de brume|voile pictural'
);
const RX_NAUTICAL_STRICT = buildWordRegex(
  'windfoil|iqfoil|windsurf|planche à voile|funboard|défi wind|defi wind|slalom foil|wingfoil|wing[- ]foil|défi wing|defi wing|gwa wing|wing surf|wingsurf|voile|voilier habitable|voiliers habitables|croisière habitable|régate|regates|régates|nautique|nautisme|salon nautique|catamaran|dériveur|kitesurf|kitefoil|paddle|stand[- ]up[- ]paddle|canoë|canoe|kayak|aviron|surf|bodyboard|plongée sous[- ]marine|baptême de plongée|club de plongée|apnée sportive|natation|nage en eau libre|yacht club|skipper'
);

const RX_VTT_CYCLISME = buildWordRegex(
  'vtt|mountain bike|vélo|velo|cyclisme|cyclosportive|cyclotourisme|gravel|bmx|enduro vtt|roc d[\'’]azur|roc azur|ffvélo|ffvelo|ffc'
);
const RX_TRAIL_FALSE_POSITIVE = buildWordRegex('trailer park|bande[- ]annonce');
const RX_TRAIL_RUNNING = buildWordRegex(
  'trail|ultra[- ]trail|marathon|semi[- ]marathon|course à pied|running|foulées|foulees|ekiden|corrida|10\\s*km|20\\s*km|urban trail|course nature|cross[- ]country'
);
const RX_RANDO_PLEIN_AIR = buildWordRegex(
  'randonnée|rando|marche nordique|escalade|alpinisme|via ferrata|canyoning|spéléo|speleo|triathlon|duathlon|swimrun|course d[\'’]orientation|raid multisport|équitation|equitation'
);
const RX_SPORTS_COMP = buildWordRegex(
  'tennis|atp|wta|padel|badminton|squash|golf|rugby|football|basketball|basket|handball|volleyball|volley|escrime|judo|karaté|athlétisme|athletisme|boxe|tournoi sportif|championnat|open sud de france'
);
const RX_CULTURE_SPECTACLES = buildWordRegex(
  'théâtre|theatre|spectacle|cirque|danse|arts de la rue|comédien|comedien|humour|one[- ]man|marionnette|exposition|musée|musee|vernissage|conférence culturelle|cinéma|cinema'
);
const RX_CULTURE_MUSIQUE = buildWordRegex(
  'musique|festival|scène musicale|musiciens|chanteur|chanteuse|bal|guinguette'
);
const RX_PATRIMOINE_TERROIR = buildWordRegex(
  'médiéval|medieval|vendanges|terroir|gastronomie|vigneron|vin|truffe|huître|huitre|châtaigne|olives|fromage|patrimoine|visite guidée|monument|marché gourmand|fête votive|feria'
);
const RX_SCIENCES_NATURE = buildWordRegex(
  'astronomie|étoiles|etoiles|télescope|telescope|planétarium|planetarium|fête de la science|science|chercheur|laboratoire|biodiversité|biodiversite|ornithologie|botanique|nature|environnement|parc national'
);
const RX_LOISIRS_LOCAL = buildWordRegex(
  'brocante|vide[- ]greniers|antiquités|antiquites|puces|salon|foire|artisanat|marché nocturne|marché artisanal|jeux|loto|carnaval|fête locale|kermesse'
);

/**
 * Cleanly classifies an event into a standardized, human-readable category.
 * Uses Unicode-safe whole-word boundaries and ordered specificity to prevent misclassifications
 * (e.g., "supérieur" matching "sup", "dévoile" matching "voile", or concerts at nautical venues).
 */
export function classifyEventCategory(
  title: string,
  description: string = '',
  rawCategory: string = ''
): string {
  const titleText = (title || '').toLowerCase();
  const descText = (description || '').toLowerCase();
  const contentText = `${titleText} ${descText}`;
  const rawLow = (rawCategory || '').toLowerCase().trim();

  // 1. Check explicit Music / Concert / Theatre first when title or description clearly indicates music
  // (avoids e.g. "Théâtre de la Mer" or concerts at "Les Marins d'Eau Douce" being misclassified as nautical)
  const isClearlyConcertOrFestival =
    RX_CONCERT_TITLE.test(titleText) ||
    (RX_CONCERT_DESC.test(descText) && !RX_SPORT_TITLE_GUARD.test(titleText)) ||
    (RX_FESTIVAL.test(titleText) && !RX_FESTIVAL_SPORT_EXCLUSION.test(titleText));

  if (isClearlyConcertOrFestival) {
    return 'Culture & Musique';
  }

  // 2. Clear local professional / employment / workshop events with no sport title
  if (RX_PRO_LOCAL_EVENT.test(contentText) && !RX_SPORT_TITLE_GUARD.test(titleText)) {
    return 'Loisirs & Vie locale';
  }

  // 3. Sports nautiques (strict Unicode word matching on title + description, avoiding false positives)
  if (
    !RX_VOILE_FALSE_POSITIVE.test(contentText) &&
    (RX_NAUTICAL_STRICT.test(contentText) ||
      rawLow === 'windfoil' ||
      rawLow === 'wingfoil' ||
      rawLow === 'voile & sports nautiques')
  ) {
    return 'Sports nautiques';
  }

  // 4. VTT & Cyclisme (STRICTLY cycling/MTB — NEVER pedestrian trail or generic sport!)
  if (RX_VTT_CYCLISME.test(contentText) || rawLow === 'vtt') {
    return 'VTT & Cyclisme';
  }

  // 5. Trail & Course à pied (avoids "Trailer Park" cinema false positive)
  if (!RX_TRAIL_FALSE_POSITIVE.test(contentText) && (RX_TRAIL_RUNNING.test(contentText) || rawLow === 'trail')) {
    return 'Trail & Course à pied';
  }

  // 6. Randonnée & Plein air (hiking, climbing, triathlon, outdoor raids)
  if (RX_RANDO_PLEIN_AIR.test(contentText)) {
    return 'Randonnée & Plein air';
  }

  // 7. Sports & Compétitions (tennis, padel, rugby, football, basketball, handball, golf, athletics, etc.)
  if (
    RX_SPORTS_COMP.test(contentText) ||
    rawLow === 'sports_outdoor' ||
    rawLow === 'sport' ||
    rawLow === 'sports'
  ) {
    return 'Sports & Compétitions';
  }

  // 8. Culture & Spectacles (theatre, circus, dance, street arts, exhibitions)
  if (RX_CULTURE_SPECTACLES.test(contentText) || rawLow.includes('théâtre') || rawLow.includes('spectacle')) {
    return 'Culture & Spectacles';
  }

  // 9. Culture & Musique (remaining music/festivals)
  if (RX_CULTURE_MUSIQUE.test(contentText) || rawLow.includes('musique') || rawLow.includes('festival')) {
    return 'Culture & Musique';
  }

  // 10. Patrimoine & Terroir
  if (RX_PATRIMOINE_TERROIR.test(contentText) || rawLow.includes('patrimoine') || rawLow.includes('terroir')) {
    return 'Patrimoine & Terroir';
  }

  // 11. Sciences & Nature
  if (RX_SCIENCES_NATURE.test(contentText) || rawLow.includes('sciences')) {
    return 'Sciences & Nature';
  }

  // 12. Loisirs & Vie locale
  if (RX_LOISIRS_LOCAL.test(contentText) || rawLow.includes('loisirs') || rawLow.includes('vie locale')) {
    return 'Loisirs & Vie locale';
  }

  // 13. Clean fallback: do NOT preserve an unverified 'Sports nautiques' or generic 'Autres' tag
  if (
    rawCategory &&
    !rawCategory.includes('_') &&
    rawCategory !== 'Manifestation & Événement' &&
    rawCategory !== 'Culture & Événement' &&
    rawLow !== 'sports nautiques' &&
    rawLow !== 'autre' &&
    rawLow !== 'autres'
  ) {
    if (rawLow === 'culture & festivals') return 'Culture & Musique';
    if (rawLow.includes('conférence') || rawLow.includes('conference')) return 'Culture & Spectacles';
    return rawCategory.trim();
  }

  return 'Loisirs & Vie locale';
}

/**
 * Returns consistent Tailwind badge classes for any event category
 */
export function getCategoryBadgeClasses(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('vtt') || c.includes('cyclisme')) {
    return 'bg-amber-100 text-amber-900 border border-amber-200';
  }
  if (c.includes('windfoil') || c.includes('wingfoil')) {
    return 'bg-sky-100 text-sky-900 border border-sky-200';
  }
  if (c.includes('voile') || c.includes('nautique')) {
    return 'bg-cyan-100 text-cyan-900 border border-cyan-200';
  }
  if (c.includes('trail') || c.includes('randonnée') || c.includes('plein air')) {
    return 'bg-emerald-100 text-emerald-900 border border-emerald-200';
  }
  if (c.includes('compétition') || c.includes('tennis') || c.includes('sports')) {
    return 'bg-indigo-100 text-indigo-900 border border-indigo-200';
  }
  if (c.includes('musique')) {
    return 'bg-violet-100 text-violet-900 border border-violet-200';
  }
  if (c.includes('spectacle') || c.includes('théâtre')) {
    return 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-200';
  }
  if (c.includes('patrimoine') || c.includes('terroir')) {
    return 'bg-orange-100 text-orange-900 border border-orange-200';
  }
  if (c.includes('sciences') || c.includes('nature')) {
    return 'bg-lime-100 text-lime-900 border border-lime-200';
  }
  return 'bg-teal-100 text-teal-900 border border-teal-200';
}

/**
 * Checks whether an event category represents a sport or outdoor/nautical discipline.
 */
export function isSportCategory(category: string): boolean {
  const c = (category || '').toLowerCase();
  return (
    c.includes('vtt') ||
    c.includes('cyclisme') ||
    c.includes('trail') ||
    c.includes('randonnée') ||
    c.includes('wind') ||
    c.includes('wing') ||
    c.includes('foil') ||
    c.includes('voile') ||
    c.includes('nautique') ||
    c.includes('sport') ||
    c.includes('compétition')
  );
}
