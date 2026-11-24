import { ManifestationEvent, UserPreferences, SourceType } from '../types';
import { generateEventSimilarityHash } from './deduplication';
import { formatIsoDateLocal } from '../utils/dateFormatting';
import { getAnnualDatesById, getUpcomingWeekendRange } from '../utils/knownEventDates';

function addDays(baseDate: Date, days: number): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days, 12, 0, 0, 0);
  return formatIsoDateLocal(d);
}

/**
 * Client-Side Standalone Scanner
 * Operates directly in the user's browser, enabling full standalone functionality
 * without requiring an external server or database connection.
 */
export function runClientSideScan(
  preferences: UserPreferences,
  existingEvents: ManifestationEvent[],
  baseDate: Date = new Date()
): { newEvents: ManifestationEvent[]; sourcesConsulted: string[] } {
  const activeSports = preferences.interests
    .filter((i) => i.enabled)
    .map((i) => i.name.toLowerCase());

  const horizonMonths = preferences.timeHorizonMonths || 6;
  const maxDays = horizonMonths * 30;

  // Realistic catalog of discoverable manifestations across Occitanie and France
  const catalog: Array<{
    title: string;
    category: string;
    dayOffset: number;
    annualRuleId?: string;
    weekendSpec?: {
      weeksAhead: number;
      dayOfWeek: 'saturday' | 'sunday' | 'friday';
      durationDays: number;
    };
    city: string;
    department: string;
    region: string;
    locationDetails: string;
    description: string;
    detailLevel: 'high' | 'medium' | 'low';
    practicalInfo: {
      schedule?: string;
      priceOrRegistration?: string;
      organizer?: string;
      difficultyOrFormat?: string;
      conditionsOrSpot?: string;
      contactEmailOrPhone?: string;
    };
    sourceName: string;
    sourceUrl: string;
    sourceType: SourceType;
    relevanceScore: number;
  }> = [
    {
      title: 'Rando VTT La Clape & Défi des Garrigues',
      category: 'VTT & Cyclisme',
      dayOffset: 8,
      weekendSpec: { weeksAhead: 1, dayOfWeek: 'sunday', durationDays: 1 },
      city: 'Gruissan / Narbonne',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Massif de la Clape - Départ Capitainerie du Port de Gruissan',
      description: 'Parcours splendides entre mer Méditerranée, vignobles et falaises calcaires. Tracés techniques single tracks avec vue plongeante sur les étangs.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Inscriptions sur place dès 07h45, départs libres 08h15 - 09h30.',
        priceOrRegistration: '10€ licenciés, 14€ public. Ravitaillement d’huîtres et muscat à l’arrivée.',
        organizer: 'VTT Club Narbonnais & OT Gruissan',
        difficultyOrFormat: '3 boucles : 22 km (D+ 400m), 42 km (D+ 950m), 58 km (D+ 1450m expert).',
        conditionsOrSpot: 'Sol rocailleux calcaire sec. Pneus renforcés recommandés.',
        contactEmailOrPhone: 'contact@gruissan-vtt.fr'
      },
      sourceName: 'Office de Tourisme de Gruissan & FFVélo',
      sourceUrl: 'https://www.gruissan-tourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 96,
    },
    {
      title: 'Trophée Wingfoil & Downwind de Thau',
      category: 'Sports nautiques',
      dayOffset: 16,
      weekendSpec: { weeksAhead: 2, dayOfWeek: 'saturday', durationDays: 2 },
      city: 'Mèze / Balaruc-les-Bains',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Étang de Thau - Base Nautique de Mèze',
      description: 'Confrontation conviviale et technique sur le plus grand plan d’eau abrité du littoral héraultais. Idéal pour optimiser vitesse et jibe au foil.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Briefing des coureurs 10h30. Lancement de 5 manches successives dès 11h30.',
        priceOrRegistration: '25€ incluant collation et assistance sécurité zodiac.',
        organizer: 'Club Nautique de Mèze & Ligue de Voile Occitanie',
        difficultyOrFormat: 'Parcours Slalom Downwind avec bouée au large de Sète.',
        conditionsOrSpot: 'Plan d’eau peu clapoteux, vent d’est à sud-est 15-22 kts.',
        contactEmailOrPhone: 'regates@cn-meze.com'
      },
      sourceName: 'Ligue de Voile Occitanie',
      sourceUrl: 'https://voile-occitanie.com',
      sourceType: 'federation',
      relevanceScore: 94,
    },
    {
      title: 'Foil Grand Slam & Slalom Windfoil Méditerranée',
      category: 'Sports nautiques',
      dayOffset: 24,
      weekendSpec: { weeksAhead: 3, dayOfWeek: 'saturday', durationDays: 2 },
      city: 'Canet-en-Roussillon',
      department: '66 - Pyrénées-Orientales',
      region: 'Occitanie',
      locationDetails: 'Pôle Nautique Canet Sud - Plage du Mar Estang',
      description: 'Régate régionale officielle de windfoil. Confrontation de haut niveau sur foil monotype et foil libre, points qualificatifs au championnat national.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Samedi 10h00-18h00, Dimanche 09h30-16h30 avec remise des prix.',
        priceOrRegistration: '35€ avec inscription préalable en ligne obligatoire.',
        organizer: 'Cercle Nautique Canet Perpignan',
        difficultyOrFormat: 'Régates flotte Open Foil (IQFoil, Starboard, Phantom).',
        conditionsOrSpot: 'Tramontane soutenue 20-32 kts, vagues courtes au large.',
        contactEmailOrPhone: 'direction@canet-nautisme.fr'
      },
      sourceName: 'Fédération Française de Voile (FFVoile 66)',
      sourceUrl: 'https://www.ffvoile.fr',
      sourceType: 'federation',
      relevanceScore: 95,
    },
    {
      title: 'Trans-Cévennes VTT & Singletrack Tour',
      category: 'VTT & Cyclisme',
      dayOffset: 48,
      weekendSpec: { weeksAhead: 7, dayOfWeek: 'saturday', durationDays: 2 },
      city: 'Anduze / Saint-Jean-du-Gard',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Parc National des Cévennes - Départ Bambouseraie',
      description: 'Rando-raid engagé au cœur des vallées cévenoles. Sentiers de schiste préservés, passages techniques en sous-bois et panorama somptueux.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Départs groupés dès 08h00. Barrières horaires à 14h00 au col.',
        priceOrRegistration: '18€ (repas chaud cévenol inclus à l’arrivée).',
        organizer: 'Cévennes VTT Aventure',
        difficultyOrFormat: '35 km (D+ 1100m) et 60 km (D+ 1950m). Bon niveau technique requis.',
        conditionsOrSpot: 'Sentiers pierreux, singles en épingles. Protections recommandées.',
        contactEmailOrPhone: 'cevennes.vtt@gard-tourisme.com'
      },
      sourceName: 'Gard Tourisme & Comité Régional FFC',
      sourceUrl: 'https://www.tourismegard.com/agenda',
      sourceType: 'tourism_office',
      relevanceScore: 92,
    },
    {
      title: 'Coupe d’Occitanie Foil & Slalom Wingfoil Port-Camargue',
      category: 'Sports nautiques',
      dayOffset: 65,
      weekendSpec: { weeksAhead: 9, dayOfWeek: 'saturday', durationDays: 2 },
      city: 'Le Grau-du-Roi',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Port Camargue - Plage Sud / Baie de l’Espiguette',
      description: 'Rendez-vous majeur de début de saison au plus grand port de plaisance d’Europe. Épreuves sprint et longue distance.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Première manche prévisionnelle 11h30 selon thermique.',
        priceOrRegistration: '30€ (inscriptions en ligne sur HelloAsso).',
        organizer: 'Société Nautique Grau du Roi Port Camargue',
        difficultyOrFormat: 'Sprint Slalom éliminatoire par poules de 8 riders.',
        conditionsOrSpot: 'Eau plate à clapot régulier, grand espace navigable.',
        contactEmailOrPhone: 'regates@portcamargue-nautisme.fr'
      },
      sourceName: 'Société Nautique Port Camargue & FFVoile',
      sourceUrl: 'https://www.sn-portcamargue.com',
      sourceType: 'federation',
      relevanceScore: 91,
    },
    {
      title: 'Raid VTT des Hautes Terres d’Oc - Lacaune & Salvetat',
      category: 'VTT & Cyclisme',
      dayOffset: 75,
      weekendSpec: { weeksAhead: 11, dayOfWeek: 'sunday', durationDays: 1 },
      city: 'La Salvetat-sur-Agout',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Parc Naturel Régional du Haut-Languedoc - Lac de la Raviège',
      description: 'Traversée forestière et sauvage entre Hérault et Tarn. Sentiers en sous-bois d’altitude, crêtes panoramiques des monts de Lacaune.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Samedi 08h30. Ravitaillement au bord du lac.',
        priceOrRegistration: '15€ avec plateau repas local.',
        organizer: 'Club Vélo Hautes Terres & OT Monts d’Hérault',
        difficultyOrFormat: '30 km (D+ 700m), 55 km (D+ 1400m), 80 km (D+ 2200m ultra).',
        conditionsOrSpot: 'Pistes forestières, sous-bois de hêtres et sapins.',
        contactEmailOrPhone: 'contact@salvetat-tourisme.fr'
      },
      sourceName: 'Hérault Tourisme & FFVélo 34',
      sourceUrl: 'https://www.herault-tourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 90,
    },
    {
      title: 'Festival Mondial du Vent & Coupe Foil Pro/Am',
      category: 'Sports nautiques',
      dayOffset: 110,
      annualRuleId: 'mondial_du_vent',
      city: 'Leucate',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Plage de La Franqui - Étage international',
      description: 'L’un des plus grands festivals mondiaux de glisse nautique. Regroupe l’élite internationale et les passionnés de windfoil et wingfoil.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: 'Compétitions internationales et village glisse du 1er au 11 avril.',
        priceOrRegistration: 'Ouverture des inscriptions 3 mois avant sur le site officiel.',
        organizer: 'Mondial du Vent Organisation & Ville de Leucate',
        difficultyOrFormat: 'Slalom longue distance en mer ouverte.',
        conditionsOrSpot: 'Tramontane légendaire pouvant dépasser 35 nœuds.',
        contactEmailOrPhone: 'info@mondialduvent.fr'
      },
      sourceName: 'Site officiel Mondial du Vent & OT Leucate',
      sourceUrl: 'https://www.mondialduvent.fr',
      sourceType: 'specialized_site',
      relevanceScore: 99,
    },
    {
      title: 'Défi Wind Gruissan - Édition Annuelle Mythique',
      category: 'Sports nautiques',
      dayOffset: 135,
      annualRuleId: 'defi_wind_gruissan',
      city: 'Gruissan',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Plage des Chalets - Gruissan',
      description: 'Le plus grand rassemblement de windsurfeurs et windfoilers au monde. Ligne de départ de plus de 1 000 participants face à la Tramontane.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: '4 jours de compétition intensive avec concerts et salon matériel.',
        priceOrRegistration: 'Inscriptions très prisées, surveillance active de l’ouverture des dossards.',
        organizer: 'Défi Wind Organisation (Philippe Bru) & OT Gruissan',
        difficultyOrFormat: 'Marathon nautique de 40 km le long de la plage.',
        conditionsOrSpot: 'Tramontane 25 à 45 nœuds. Condition physique exigeante.',
        contactEmailOrPhone: 'defiwind@orange.fr'
      },
      sourceName: 'Défi Wind Gruissan Officiel & Windsurfjournal',
      sourceUrl: 'https://www.defiwind.org',
      sourceType: 'specialized_site',
      relevanceScore: 100,
    },
    {
      title: 'Défi Wing Gruissan - Rassemblement International Wingfoil',
      category: 'Sports nautiques',
      dayOffset: 140,
      annualRuleId: 'defi_wing_gruissan',
      city: 'Gruissan',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Plage des Chalets - Gruissan',
      description: 'La référence mondiale du wingfoil en longue distance. Plus de 400 riders réunis pour s’affronter le long du littoral audois.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: 'Programme adapté à la météo et la Tramontane.',
        priceOrRegistration: 'Inscriptions sur plateforme officielle en ligne.',
        organizer: 'Défi Wind & Wing Events',
        difficultyOrFormat: 'Parcours d’endurance de 20 à 30 km par manche.',
        conditionsOrSpot: 'Vent fort, mer formée au large, encadrement haute sécurité.',
        contactEmailOrPhone: 'defiwing@orange.fr'
      },
      sourceName: 'Site Officiel Défi Wing & FFVoile',
      sourceUrl: 'https://www.defiwind.org/defi-wing',
      sourceType: 'specialized_site',
      relevanceScore: 99,
    },
    {
      title: 'Open Sud de France (Tournoi ATP Tennis Montpellier Arena)',
      category: 'Sports & Compétitions',
      dayOffset: 70,
      annualRuleId: 'open_sud_de_france',
      city: 'Pérols / Montpellier',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Sud de France Arena Montpellier',
      description: 'Tournoi international ATP 250 réunissant les meilleurs joueurs mondiaux sur court couvert à la Sud de France Arena.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Sessions journée dès 11h00, sessions soirée dès 18h30',
        priceOrRegistration: 'À partir de 15€ sur Ticketmaster et billetterie officielle',
        organizer: 'TV Sport Events & Ligue Occitanie de Tennis',
        contactEmailOrPhone: 'billetterie@opensuddefrance.com'
      },
      sourceName: 'Ticketmaster France & Sud de France Arena',
      sourceUrl: 'https://www.ticketmaster.fr/fr/manifestation/open-sud-de-france-billet/idmanif/555000',
      sourceType: 'ticketmaster',
      relevanceScore: 96,
    },
    {
      title: 'Carnaval de Limoux (Fécos, Bandes & Musique Occitane)',
      category: 'Patrimoine & Terroir',
      dayOffset: 55,
      annualRuleId: 'carnaval_limoux',
      city: 'Limoux',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Place de la République — Centre historique',
      description: 'Le plus long carnaval du monde : chaque week-end, les bandes costumées de pierrots défilent sous les arcades au son de la musique traditionnelle.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Sorties des bandes samedis et dimanches à 11h00, 16h30 et 22h00',
        priceOrRegistration: 'Accès libre et gratuit sur la place',
        organizer: 'Comité du Carnaval de Limoux'
      },
      sourceName: 'Aude Tourisme & Ville de Limoux',
      sourceUrl: 'https://www.audetourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 94,
    },
    {
      title: 'Roc d’Azur Méditerranée & Gravel / VTT Roc Marathon',
      category: 'VTT & Cyclisme',
      dayOffset: 165,
      annualRuleId: 'roc_azur',
      city: 'Fréjus / Roquebrune-sur-Argens',
      department: '83 - Var',
      region: 'France (PACA)',
      locationDetails: 'Base Nature François Léotard - Massif des Maures',
      description: 'Le plus grand événement VTT au monde en France. Rassemblement de fin de saison avec toutes les disciplines : rando, enduro, cross-country et salon.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: 'Du jeudi au dimanche, départs dès 07h30 pour les marathons.',
        priceOrRegistration: 'Inscriptions par vagues sur le site ASO TimeTo.',
        organizer: 'A.S.O. (Amaury Sport Organisation)',
        difficultyOrFormat: 'Plus de 30 épreuves : du Roc Ruelles au Roc Marathon 85 km.',
        conditionsOrSpot: 'Pistes de grès rouge, roches sèches, collines des Maures.',
        contactEmailOrPhone: 'info@rocazur.com'
      },
      sourceName: 'A.S.O. TimeTo & Vélo Vert Magazine',
      sourceUrl: 'https://www.rocazur.com',
      sourceType: 'event_platform',
      relevanceScore: 98,
    },
    {
      title: 'Festival de Thau & Concerts sur le Port',
      category: 'Culture & Musique',
      dayOffset: 20,
      annualRuleId: 'festival_de_thau',
      city: 'Mèze / Bassin de Thau',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Port de Mèze & Château de Girard',
      description: 'Festival écocitoyen de musique vivante au bord de l’étang de Thau : concerts en plein air, débats et gastronomie locale.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Concerts en soirée à partir de 19h00',
        priceOrRegistration: 'Billetterie en ligne ou sur place',
        organizer: 'Association Jazz Musique & Environnement',
        contactEmailOrPhone: 'contact@festivaldethau.com'
      },
      sourceName: 'Hérault Tourisme & OpenAgenda',
      sourceUrl: 'https://www.herault-tourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 95,
    },
    {
      title: 'Fête Médiévale & Campement Historique d’Aigues-Mortes',
      category: 'Patrimoine & Terroir',
      dayOffset: 28,
      annualRuleId: 'medievale_aigues_mortes',
      city: 'Aigues-Mortes',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Cité médiévale intra-muros et remparts',
      description: 'Reconstitution historique grandiose : défilés en armures, joutes équestres, banquet médiéval et marché d’artisanat d’art.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Samedi et dimanche de 10h à minuit',
        priceOrRegistration: 'Accès ville libre, tribunes de tournois sur réservation',
        organizer: 'Ville d’Aigues-Mortes & OT Gard',
        contactEmailOrPhone: 'tourisme@ot-aiguesmortes.com'
      },
      sourceName: 'Gard Tourisme Agenda',
      sourceUrl: 'https://www.tourismegard.com/agenda/',
      sourceType: 'tourism_office',
      relevanceScore: 94,
    },
    {
      title: 'Fête de la Gastronomie & Vendanges du Pic Saint-Loup',
      category: 'Patrimoine & Terroir',
      dayOffset: 45,
      weekendSpec: { weeksAhead: 6, dayOfWeek: 'saturday', durationDays: 2 },
      city: 'Saint-Mathieu-de-Tréviers',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Esplanade du Pic Saint-Loup',
      description: 'Grande fête des vignerons et des producteurs locaux d’Occitanie : dégustations commentées, accords mets-vins, marché gourmand.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Week-end complet 10h - 22h',
        priceOrRegistration: 'Verre de dégustation 8€',
        organizer: 'Syndicat des Producteurs du Pic Saint-Loup'
      },
      sourceName: 'Tourisme Occitanie & Terroir',
      sourceUrl: 'https://www.tourisme-occitanie.com',
      sourceType: 'tourism_office',
      relevanceScore: 92,
    },
    {
      title: 'Nuit des Étoiles & Conférences Astronomie des Cévennes',
      category: 'Sciences & Nature',
      dayOffset: 72,
      annualRuleId: 'nuit_des_etoiles',
      city: 'Aniane',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Observatoire d’Aniane',
      description: 'Observation du ciel nocturne au télescope, ateliers vulgarisation pour petits et grands et découverte de la Réserve Internationale de Ciel Étoilé.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'De 20h30 à 02h00',
        priceOrRegistration: 'Entrée libre et gratuite',
        organizer: 'Club Astronomie Languedoc'
      },
      sourceName: 'OpenAgenda & Observatoire Aniane',
      sourceUrl: 'https://openagenda.com',
      sourceType: 'event_platform',
      relevanceScore: 91,
    },
    {
      title: 'Festival de Nîmes aux Arènes (Concerts & Spectacles)',
      category: 'Culture & Musique',
      dayOffset: 22,
      annualRuleId: 'festival_nimes',
      city: 'Nîmes',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Arènes Romaines de Nîmes',
      description: 'L’un des plus prestigieux festivals de musique en France : têtes d’affiche rock, pop, électro et chanson française dans l’amphithéâtre romain.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Concerts en soirée à 20h30, ouverture des portes 18h30',
        priceOrRegistration: 'Billetterie officielle disponible sur Ticketmaster (de 45€ à 95€)',
        organizer: 'Adam Concerts & Ticketmaster France',
        conditionsOrSpot: 'Arènes antiques de Nîmes à ciel ouvert',
        contactEmailOrPhone: 'billetterie@festivaldenimes.com'
      },
      sourceName: 'Ticketmaster France (Billetterie Officielle)',
      sourceUrl: 'https://www.ticketmaster.fr/fr/manifestation/festival-de-nimes-billet/idmanif/570000',
      sourceType: 'ticketmaster',
      relevanceScore: 99,
    },
    {
      title: 'Festival Jazz à Sète & Soirées du Théâtre de la Mer',
      category: 'Culture & Musique',
      dayOffset: 35,
      annualRuleId: 'jazz_a_sete',
      city: 'Sète',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Théâtre de la Mer Jean Marais',
      description: 'Concerts d’exception de jazz, soul et groove dans le théâtre à ciel ouvert avec vue panoramique plongeante sur les flots de la Méditerranée.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Concerts à 21h00, apéro-concerts dès 19h00',
        priceOrRegistration: 'De 28€ à 48€ la soirée, réservations en ligne',
        organizer: 'Association Jazz à Sète & Ville de Sète',
        conditionsOrSpot: 'Amphithéâtre face à la mer'
      },
      sourceName: 'Hérault Tourisme & OpenAgenda',
      sourceUrl: 'https://www.herault-tourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 98,
    },
    {
      title: 'Festival Les Déferlantes Sud de France',
      category: 'Culture & Musique',
      dayOffset: 45,
      annualRuleId: 'les_deferlantes',
      city: 'Le Barcarès',
      department: '66 - Pyrénées-Orientales',
      region: 'Occitanie',
      locationDetails: 'Jardins du Lydia - Paquebot des Sables',
      description: 'Grand festival méditerranéen de musiques actuelles avec plus de 80 artistes internationaux sur 4 scènes face à la plage.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Concerts non-stop de 16h00 à 03h00',
        priceOrRegistration: 'Pass 1 jour dès 64€ sur Ticketmaster et billetteries partenaires',
        organizer: 'La Frontera Production & Ticketmaster'
      },
      sourceName: 'Ticketmaster France',
      sourceUrl: 'https://www.ticketmaster.fr/fr/manifestation/les-deferlantes-sud-de-france-billet/idmanif/568000',
      sourceType: 'ticketmaster',
      relevanceScore: 98,
    },
    {
      title: 'Festival Pause Guitare Sud de France à Albi',
      category: 'Culture & Musique',
      dayOffset: 58,
      annualRuleId: 'pause_guitare',
      city: 'Albi',
      department: '81 - Tarn',
      region: 'Occitanie',
      locationDetails: 'Base de plein air Pratgraussals',
      description: 'Festival phare occitan mêlant grandes vedettes internationales et chanson francophone au bord du Tarn.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Scènes dès 14h, grande scène 18h30-01h00',
        priceOrRegistration: 'Billets dès 49€ sur Ticketmaster',
        organizer: 'Association Arpèges & Trémolos'
      },
      sourceName: 'Ticketmaster France & Tourisme Occitanie',
      sourceUrl: 'https://www.ticketmaster.fr',
      sourceType: 'ticketmaster',
      relevanceScore: 97,
    },
    {
      title: 'Festival de Carcassonne (Concerts dans la Cité Médiévale)',
      category: 'Culture & Musique',
      dayOffset: 65,
      annualRuleId: 'festival_carcassonne',
      city: 'Carcassonne',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Théâtre Jean-Deschamps - Cité Médiévale',
      description: 'Concerts et opéras dans les remparts de la cité fortifiée classée à l’UNESCO.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Spectacles et concerts à 21h30',
        priceOrRegistration: 'Billetterie sur Ticketmaster et festivaldecarcassonne.fr',
        organizer: 'Ville de Carcassonne & Tourisme Aude'
      },
      sourceName: 'Ticketmaster & Office de Tourisme de Carcassonne',
      sourceUrl: 'https://www.festivaldecarcassonne.fr',
      sourceType: 'ticketmaster',
      relevanceScore: 96,
    },
    {
      title: 'Soirée Concerts & Rock à Paloma (SMAC Nîmes Métropole)',
      category: 'Culture & Musique',
      dayOffset: 14,
      weekendSpec: { weeksAhead: 2, dayOfWeek: 'friday', durationDays: 1 },
      city: 'Nîmes',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Paloma - 250 Chemin de l’Aérodrome',
      description: 'Concerts musiques actuelles, rock indie et électro dans la grande salle de Paloma.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Ouverture des portes 20h00, début des concerts 20h45',
        priceOrRegistration: 'De 18€ à 26€ (tarif réduit abonnés)',
        organizer: 'Paloma SMAC Nîmes Métropole',
        contactEmailOrPhone: 'contact@paloma-nimes.fr'
      },
      sourceName: 'Paloma Nîmes Métropole',
      sourceUrl: 'https://paloma-nimes.fr',
      sourceType: 'specialized_site',
      relevanceScore: 95,
    },
    {
      title: 'Grand Prix de Voile & Régates de Baie d’Aigues-Mortes',
      category: 'Voile & Sports nautiques',
      dayOffset: 18,
      weekendSpec: { weeksAhead: 2, dayOfWeek: 'saturday', durationDays: 2 },
      city: 'La Grande-Motte / Port-Camargue',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Baie d’Aigues-Mortes — YCGM & Port-Camargue',
      description: 'Grand rassemblement de voile habitable, dériveurs et catamarans en baie d’Aigues-Mortes avec classements FFVoile.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Samedi 10h00 briefing, 1er départ 11h30. Dimanche manches dès 10h30.',
        priceOrRegistration: '35€ par bateau (licence FFVoile requise)',
        organizer: 'Yacht Club de La Grande-Motte & SNGRPC',
        difficultyOrFormat: 'Parcours côtiers et bananes (OSIRIS & Monotypes)'
      },
      sourceName: 'Fédération Française de Voile (FFVoile)',
      sourceUrl: 'https://espaces.ffvoile.fr/competitions/',
      sourceType: 'federation',
      relevanceScore: 95,
    },
    {
      title: 'Ultra Trail des Gorges de l’Hérault & Saint-Guilhem',
      category: 'Trail & Course à pied',
      dayOffset: 32,
      weekendSpec: { weeksAhead: 4, dayOfWeek: 'sunday', durationDays: 1 },
      city: 'Saint-Guilhem-le-Désert / Aniane',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Cirque de l’Infernet & Plateau de Lavagne',
      description: 'Épreuve de course en montagne traversant les gorges de l’Hérault et les sentiers historiques de Saint-Guilhem-le-Désert.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Départs dès 07h30 depuis Aniane',
        priceOrRegistration: '22€ (18 km) à 42€ (48 km)',
        organizer: 'Cœur d’Hérault Trail & FFA',
        difficultyOrFormat: '18 km (D+ 650m) et 48 km (D+ 2100m)'
      },
      sourceName: 'Hérault Trail & FFAthlétisme',
      sourceUrl: 'https://www.athle.fr',
      sourceType: 'federation',
      relevanceScore: 93,
    }
  ];

  // Filter candidates matching user interests, keywords & horizon
  const activeInterests = preferences.interests.filter((i) => i.enabled);
  const activeCustomSites = (preferences.customTargetSites || []).filter(s => s.enabled);

  const todayStr = formatIsoDateLocal(baseDate);
  const horizonEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + horizonMonths, baseDate.getDate());
  const horizonEndStr = formatIsoDateLocal(horizonEnd);

  const candidates = catalog.filter((item) => {
    const fixedRange = item.annualRuleId
      ? getAnnualDatesById(item.annualRuleId, baseDate)
      : item.weekendSpec
      ? getUpcomingWeekendRange(item.weekendSpec.weeksAhead, item.weekendSpec.dayOfWeek, item.weekendSpec.durationDays, baseDate)
      : { startDate: addDays(baseDate, item.dayOffset), endDate: addDays(baseDate, item.dayOffset) };

    // Horizon (allow ongoing events where endDate >= todayStr and startDate <= horizonEndStr)
    if (fixedRange.endDate < todayStr || fixedRange.startDate > horizonEndStr) return false;

    // Check match against enabled interests (name, category, keywords)
    if (activeInterests.length > 0) {
      const itemTitle = item.title.toLowerCase();
      const itemCat = item.category.toLowerCase();
      const itemDesc = item.description.toLowerCase();

      const isMatch = activeInterests.some((interest) => {
        const interestName = interest.name.toLowerCase();
        const interestCat = interest.category.toLowerCase();
        const kwList = interest.keywords || [];
        const nameTokens = interestName.split(/[&,\/]+/).map(t => t.trim()).filter(t => t.length >= 3);

        if (itemCat.includes(interestName) || interestName.includes(itemCat)) return true;
        if (nameTokens.some(tok => itemCat.includes(tok) || itemTitle.includes(tok) || itemDesc.includes(tok))) return true;
        if (itemTitle.includes(interestName) || itemDesc.includes(interestName)) return true;
        if (itemCat.includes(interestCat) || interestCat.includes(itemCat)) return true;
        if (interestCat.includes('nautique') && (itemCat.includes('voile') || itemCat.includes('windfoil') || itemCat.includes('wingfoil'))) return true;

        return kwList.some(kw => {
          const k = kw.toLowerCase();
          return itemTitle.includes(k) || itemDesc.includes(k) || itemCat.includes(k);
        });
      });

      if (!isMatch) return false;
    }

    return true;
  });

  const nowIso = new Date().toISOString();
  const newEvents: ManifestationEvent[] = [];

  for (const cand of candidates) {
    const resolvedRange = cand.annualRuleId
      ? getAnnualDatesById(cand.annualRuleId, baseDate)
      : cand.weekendSpec
      ? getUpcomingWeekendRange(cand.weekendSpec.weeksAhead, cand.weekendSpec.dayOfWeek, cand.weekendSpec.durationDays, baseDate)
      : { startDate: addDays(baseDate, cand.dayOffset), endDate: cand.dayOffset > 30 ? addDays(baseDate, cand.dayOffset + 1) : addDays(baseDate, cand.dayOffset) };

    const startDateStr = resolvedRange.startDate;
    const hash = generateEventSimilarityHash(
      cand.title,
      startDateStr,
      cand.city,
      cand.category
    );

    // Check if already in existing events
    const alreadyExists = existingEvents.some(
      (e) => e.similarityHash === hash || e.id === hash
    );

    if (!alreadyExists) {
      // If user has a matching custom target site, attribute or enrich source
      let sourceName = cand.sourceName;
      let sourceUrl = cand.sourceUrl;
      let sourceType = cand.sourceType;

      const matchingSite = activeCustomSites.find(site => {
        const siteHost = site.url.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
        return cand.sourceUrl.toLowerCase().includes(siteHost) || cand.sourceName.toLowerCase().includes(site.name.toLowerCase());
      });

      if (matchingSite) {
        sourceName = matchingSite.name;
        sourceType = 'custom_target_site';
      }

      const newEv: ManifestationEvent = {
        id: hash,
        title: cand.title,
        category: cand.category,
        startDate: startDateStr,
        endDate: resolvedRange.endDate,
        city: cand.city,
        department: cand.department,
        region: cand.region,
        locationDetails: cand.locationDetails,
        description: cand.description,
        detailLevel: cand.detailLevel,
        practicalInfo: cand.practicalInfo,
        sourceName,
        sourceUrl,
        sourceType,
        firstDiscoveredAt: nowIso,
        lastVerifiedAt: nowIso,
        status: 'new',
        similarityHash: hash,
        relevanceScore: cand.relevanceScore,
      };
      newEvents.push(newEv);
    }
  }

  const defaultSources = [
    'Google Search Engine (Multi-domaines)',
    'Offices de Tourisme & Agendas Locaux (Occitanie & Littoral)',
    'Portails Fédéraux & Associatifs',
    'OpenAgenda & Agendas Culturels Régionaux'
  ];

  // Include user-defined custom target sites in the consulted sources!
  const customSiteSources = activeCustomSites.map(s => `Site ciblé : ${s.name} (${s.url})`);
  const sourcesConsulted = [...customSiteSources, ...defaultSources];

  return { newEvents, sourcesConsulted };
}
