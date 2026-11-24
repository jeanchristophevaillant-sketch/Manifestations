import { ManifestationEvent } from '../types';
import { generateEventSimilarityHash } from './deduplication';
import { formatIsoDateLocal } from '../utils/dateFormatting';
import { getAnnualDatesById, getUpcomingWeekendRange } from '../utils/knownEventDates';

export function generateInitialManifestations(
  baseDate: Date = new Date(),
  horizonMonths: number = 6
): ManifestationEvent[] {
  const maxHorizon = new Date(baseDate.getFullYear(), baseDate.getMonth() + horizonMonths, baseDate.getDate());
  const maxHorizonStr = formatIsoDateLocal(maxHorizon);

  const randoSalagou = getUpcomingWeekendRange(1, 'sunday', 1, baseDate);
  const wingfoilOccitanie = getUpcomingWeekendRange(2, 'friday', 3, baseDate);
  const windfoilGrandeMotte = getUpcomingWeekendRange(3, 'saturday', 2, baseDate);
  const nocturneCapitelles = getUpcomingWeekendRange(4, 'saturday', 1, baseDate);
  const regateThau = getUpcomingWeekendRange(2, 'saturday', 2, baseDate);
  const trailGarrigues = getUpcomingWeekendRange(3, 'sunday', 1, baseDate);
  const raidCevennes = getUpcomingWeekendRange(8, 'saturday', 2, baseDate);
  const coupeMarseille = getUpcomingWeekendRange(10, 'friday', 3, baseDate);
  const transbrac = getUpcomingWeekendRange(18, 'saturday', 2, baseDate);
  const festivalThau = getAnnualDatesById('festival_de_thau', baseDate);
  const medievaleAigues = getAnnualDatesById('medievale_aigues_mortes', baseDate);
  const vendangesPic = getUpcomingWeekendRange(6, 'saturday', 2, baseDate);
  const nuitEtoiles = getAnnualDatesById('nuit_des_etoiles', baseDate);
  const festivalNimes = getAnnualDatesById('festival_nimes', baseDate);
  const jazzSete = getAnnualDatesById('jazz_a_sete', baseDate);
  const deferlantes = getAnnualDatesById('les_deferlantes', baseDate);
  const pauseGuitare = getAnnualDatesById('pause_guitare', baseDate);
  const festivalCarca = getAnnualDatesById('festival_carcassonne', baseDate);
  const fiestaSete = getAnnualDatesById('fiesta_sete', baseDate);
  const defiWing = getAnnualDatesById('defi_wing_gruissan', baseDate);
  const defiWind = getAnnualDatesById('defi_wind_gruissan', baseDate);
  const mondialVent = getAnnualDatesById('mondial_du_vent', baseDate);
  const rocAzur = getAnnualDatesById('roc_azur', baseDate);
  const openSud = getAnnualDatesById('open_sud_de_france', baseDate);
  const truffeUzes = getAnnualDatesById('fete_truffe_uzes', baseDate);
  const carnavalLimoux = getAnnualDatesById('carnaval_limoux', baseDate);

  const rawEvents: Omit<ManifestationEvent, 'id' | 'similarityHash' | 'firstDiscoveredAt' | 'lastVerifiedAt' | 'status'>[] = [
    // --- PÉRIODE 1 : SEMAINE 1 À 4 (NIVEAU DE DÉTAIL TRÈS ÉLEVÉ) ---
    {
      title: 'Rando VTT du Lac du Salagou & Monts d’Hérault',
      category: 'VTT & Cyclisme',
      startDate: randoSalagou.startDate,
      endDate: randoSalagou.endDate,
      city: 'Clermont-l’Hérault',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Base de plein air du Salagou - Rive des Vailhés',
      description: 'Épreuve emblématique sur les ruffes rouges du Salagou. 4 parcours au choix avec ravitaillements de produits du terroir occitan et assistance technique sur place.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Accueil dès 07h30, départs échelonnés 08h00 - 09h30, remise des prix 13h30',
        priceOrRegistration: '12€ licenciés FFC/FFVélo, 16€ non-licenciés (en ligne jusqu’à la veille 20h)',
        organizer: 'Club VTT Salagou Aventure & Comité Départemental FFC 34',
        difficultyOrFormat: '4 parcours : 20 km (D+ 350m famille), 38 km (D+ 850m sportif), 52 km (D+ 1300m expert), 30 km spécial VAE',
        conditionsOrSpot: 'Terrain sec/terre rouge argileuse. Casque rigide obligatoire, kit anti-crevaison conseillé.',
        contactEmailOrPhone: 'contact@vtt-salagou-rando.fr'
      },
      sourceName: 'FFVélo Occitanie & OT Salagou',
      sourceUrl: 'https://ffvelo.fr/activites-federales/calendrier-des-randonnees/',
      sourceType: 'federation',
      relevanceScore: 98
    },
    {
      title: 'Session & Contest Wingfoil Occitanie Cup - Étape 1',
      category: 'Sports nautiques',
      startDate: wingfoilOccitanie.startDate,
      endDate: wingfoilOccitanie.endDate,
      city: 'Leucate / La Franqui',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Spot de La Franqui - Plage des Coussoules',
      description: 'Rassemblement de wingfoil ouvert aux compétiteurs et amateurs avec manches de Slalom et Freefly, tests de matériel en présence des marques partenaires.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Briefing vendredi 14h, premières manches 15h. Samedi & Dimanche 10h-18h selon vent.',
        priceOrRegistration: '35€ incluant dossard, repas du samedi soir et sécurité zodiac',
        organizer: 'Pôle Nautique Leucate & Ligue de Voile Occitanie',
        difficultyOrFormat: 'Slalom 4 bouées en 8 + Expression Freefly. Classements Open, Féminines et U19.',
        conditionsOrSpot: 'Tramontane 18-30 kts prévisionnelle, plan d’eau plat à clapoteux. Gilet et leash d’aile obligatoires.',
        contactEmailOrPhone: 'contact@leucate-nautisme.fr'
      },
      sourceName: 'Ligue de Voile Occitanie & Office de Tourisme Leucate',
      sourceUrl: 'https://www.tourisme-leucate.fr',
      sourceType: 'tourism_office',
      relevanceScore: 95
    },
    {
      title: 'Régate Windfoil & Foil Sélectif Interrégional Sud',
      category: 'Sports nautiques',
      startDate: windfoilGrandeMotte.startDate,
      endDate: windfoilGrandeMotte.endDate,
      city: 'La Grande-Motte',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Yacht Club de La Grande Motte - Esplanade Jean Baumel',
      description: 'Épreuve officielle qualificative Windfoil Open et IQFoil. Deux jours de régates intenses en baie d’Aigues-Mortes avec suivi GPS en direct.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Samedi : Émargement 09h30, 1er signal d’avertissement 11h00. Dimanche : Courses 10h30-16h00.',
        priceOrRegistration: '40€ (licence FFVoile compétition exigée + certificat médical)',
        organizer: 'Yacht Club de La Grande Motte (YCGM)',
        difficultyOrFormat: 'Courses en flotte parcours banane et Course Racing. Ouvert à partir de 14 ans.',
        conditionsOrSpot: 'Brise thermique ou mistral dévié. Mise à l’eau facile depuis la plage du Couchant.',
        contactEmailOrPhone: 'regate@ycgm.fr'
      },
      sourceName: 'Fédération Française de Voile (FFVoile)',
      sourceUrl: 'https://espaces.ffvoile.fr/competitions/',
      sourceType: 'federation',
      relevanceScore: 94
    },
    {
      title: 'Nocturne VTT & Enduro des Capitelles',
      category: 'VTT & Cyclisme',
      startDate: nocturneCapitelles.startDate,
      endDate: nocturneCapitelles.endDate,
      city: 'Nîmes / Sommières',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Domaine de Campagne - Garrigues sommiéroises',
      description: 'Rando nocturne conviviale à la frontale à travers la garrigue gardoise. Tracé ludique entre single-tracks techniques et passage près des capitelles centenaires.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Retrait dossards 19h00, départ groupé 20h30, soupe à l’oignon et brasucade à l’arrivée 23h',
        priceOrRegistration: '14€ (inclus ravitaillement nocturne + collation chaude terroir)',
        organizer: 'Association Cyclo & VTT Gard Occitan',
        difficultyOrFormat: '2 boucles : 18 km (accessible) ou 32 km (technique avec franchissements de roches)',
        conditionsOrSpot: 'Éclairage avant mini 800 lumens + lumière arrière clignotante obligatoires',
        contactEmailOrPhone: 'gard.vtt.events@gmail.com'
      },
      sourceName: 'Agenda Événements Gard Tourisme',
      sourceUrl: 'https://www.tourismegard.com/agenda/',
      sourceType: 'tourism_office',
      relevanceScore: 89
    },
    {
      title: 'Régate d’Occitanie & Trophée Voile Légère en Baie de Thau',
      category: 'Sports nautiques',
      startDate: regateThau.startDate,
      endDate: regateThau.endDate,
      city: 'Sète / Mèze',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Bassin de Thau & Base Nautique de Mèze',
      description: 'Régate inter-séries FFVoile ouverte aux dériveurs, catamarans et habitables. Parcours construits et côtiers sur l’étang de Thau.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Confirmation inscriptions 09h00, 1er départ 11h00 samedi et dimanche',
        priceOrRegistration: '30€ par équipage (licence FFVoile valide requise)',
        organizer: 'Yacht Club de Mèze & Ligue de Voile Occitanie',
        difficultyOrFormat: 'Séries Osiris Habitable, Catamaran C1/C3 et Dériveurs',
        conditionsOrSpot: 'Plan d’eau protégé, brise thermique 12 à 18 nœuds'
      },
      sourceName: 'Ligue de Voile d’Occitanie (FFVoile)',
      sourceUrl: 'https://espaces.ffvoile.fr/competitions/',
      sourceType: 'federation',
      relevanceScore: 95
    },
    {
      title: 'Trail des Garrigues & Pic Saint-Loup',
      category: 'Trail & Course à pied',
      startDate: trailGarrigues.startDate,
      endDate: trailGarrigues.endDate,
      city: 'Saint-Mathieu-de-Tréviers',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Sentiers du Pic Saint-Loup et Hortus',
      description: 'Course nature chronométrée sur les crêtes calcaires du Pic Saint-Loup avec vue panoramique sur la Méditerranée et les Cévennes.',
      detailLevel: 'high',
      practicalInfo: {
        schedule: 'Retrait dossards dès 07h30, départ 25 km à 09h00, départ 12 km à 09h30',
        priceOrRegistration: '16€ (12 km) / 24€ (25 km), ravitaillements terroir inclus',
        organizer: 'Association Foulées du Pic',
        difficultyOrFormat: '12 km (D+ 350m) et 25 km (D+ 950m)',
        conditionsOrSpot: 'Sentiers techniques pierreux, chaussures de trail recommandées'
      },
      sourceName: 'FFAthlétisme Occitanie & Hérault Sport',
      sourceUrl: 'https://www.athle.fr',
      sourceType: 'federation',
      relevanceScore: 94
    },

    // --- ÉVÉNEMENTS CALENDAIRES HIVER / PRINTEMPS & GRANDS RENDEZ-VOUS ---
    {
      title: 'Fête de la Truffe & Terroir d’Uzès',
      category: 'Patrimoine & Terroir',
      startDate: truffeUzes.startDate,
      endDate: truffeUzes.endDate,
      city: 'Uzès',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Place aux Herbes & Évêché',
      description: 'Week-end d’excellence gastronomique : cavage au chien, vente de truffes fraîches certifiées et repas gastronomiques 100% truffe.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Marché dès 09h00, démonstrations à 11h et 15h',
        priceOrRegistration: 'Accès libre au marché, repas sur réservation',
        organizer: 'Comité de Promotion Agricole d’Uzès & Syndicat des Trufficulteurs'
      },
      sourceName: 'Gard Tourisme & Office d’Uzès',
      sourceUrl: 'https://www.tourismegard.com/agenda/',
      sourceType: 'tourism_office',
      relevanceScore: 95
    },
    {
      title: 'Carnaval de Limoux (Fécos, Bandes & Musique Occitane)',
      category: 'Patrimoine & Terroir',
      startDate: carnavalLimoux.startDate,
      endDate: carnavalLimoux.endDate,
      city: 'Limoux',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Place de la République — Centre historique',
      description: 'Le plus long carnaval du monde : chaque week-end de janvier à mars, les bandes costumées de pierrots et meuniers défilent sous les arcades au son de la musique traditionnelle.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Sorties des bandes samedis et dimanches à 11h00, 16h30 et 22h00',
        priceOrRegistration: 'Accès libre et gratuit sur la place',
        organizer: 'Comité du Carnaval de Limoux & Ville de Limoux'
      },
      sourceName: 'Aude Tourisme & Ville de Limoux',
      sourceUrl: 'https://www.audetourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 94
    },
    {
      title: 'Open Sud de France (Tournoi ATP Tennis Montpellier Arena)',
      category: 'Sports & Compétitions',
      startDate: openSud.startDate,
      endDate: openSud.endDate,
      city: 'Pérols / Montpellier',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Sud de France Arena Montpellier',
      description: 'Tournoi international ATP 250 réunissant les meilleurs joueurs mondiaux de tennis sur court couvert à la Sud de France Arena.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Sessions journée dès 11h00, sessions soirée dès 18h30',
        priceOrRegistration: 'À partir de 15€ (qualifications) jusqu’à 75€ (finale) sur Ticketmaster',
        organizer: 'TV Sport Events & Ligue Occitanie de Tennis',
        contactEmailOrPhone: 'billetterie@opensuddefrance.com'
      },
      sourceName: 'Ticketmaster France & Sud de France Arena',
      sourceUrl: 'https://www.ticketmaster.fr/fr/manifestation/open-sud-de-france-billet/idmanif/555000',
      sourceType: 'ticketmaster',
      relevanceScore: 96
    },
    {
      title: 'Grand Rassemblement Défi Wing Gruissan',
      category: 'Sports nautiques',
      startDate: defiWing.startDate,
      endDate: defiWing.endDate,
      city: 'Gruissan',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Plage des Chalets - Spot historique de la Tramontane',
      description: 'Le plus grand rassemblement de wingfoil au monde réunissant plus de 400 rideurs professionnels et passionnés sur une ligne de départ mythique de plusieurs kilomètres.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: '3 jours de festival avec runs de longue distance par manche de 20 à 40 km',
        priceOrRegistration: 'Inscriptions en ligne sur le site officiel',
        organizer: 'Philippe Bru Organisation (PBO) & Ville de Gruissan',
        difficultyOrFormat: 'Format longue distance en peloton. Niveau intermédiaire à expert exigé.',
        conditionsOrSpot: 'Spot légendaire de Gruissan, Tramontane offshore sécurisée par dispositif maritime.'
      },
      sourceName: 'Site Spécialisé Défi Wing & Wind Magazine',
      sourceUrl: 'https://www.defiwind.org/defi-wing',
      sourceType: 'specialized_site',
      relevanceScore: 99
    },
    {
      title: 'Raid VTT Trans-Cévennes & Gorges du Tarn',
      category: 'VTT & Cyclisme',
      startDate: raidCevennes.startDate,
      endDate: raidCevennes.endDate,
      city: 'Meyrueis / Florac',
      department: '48 - Lozère',
      region: 'Occitanie',
      locationDetails: 'Parc National des Cévennes - Mont Aigoual',
      description: 'Deux étapes grandioses entre Causse Méjean et Gorges du Tarn. Rando sportive et formules chronométrées avec panoramas d’exception.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Étape 1 : 65 km D+ 1800m. Étape 2 : 55 km D+ 1450m. Hébergement en gîtes d’étape proposé.',
        priceOrRegistration: 'Formule 2 jours avec dîner du terroir : 68€',
        organizer: 'Lozère Pleine Nature & Comité Régional FFC',
        difficultyOrFormat: 'Parcours montagneux, portions cassantes en calcaire et descentes en sous-bois de châtaigniers.'
      },
      sourceName: 'Lozère Tourisme & Cévennes Espace Nature',
      sourceUrl: 'https://www.cevennes-tourisme.fr',
      sourceType: 'federation',
      relevanceScore: 92
    },
    {
      title: 'Coupe de France Windfoil & IQFoil Méditerranée',
      category: 'Sports nautiques',
      startDate: coupeMarseille.startDate,
      endDate: coupeMarseille.endDate,
      city: 'Marseille / Hyères',
      department: '13 - Bouches-du-Rhône',
      region: 'France (PACA)',
      locationDetails: 'Rade Sud de Marseille - Stade Nautique du Roucas Blanc',
      description: 'Étape nationale majeure sur le site olympique réunissant l’élite française et internationale du Windfoil.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Régates de vendredi à dimanche, format Course Racing et Marathon',
        priceOrRegistration: 'Inscriptions fédérales FFVoile, quota limité à 120 coureurs',
        organizer: 'Yacht Club de la Pointe Rouge & Fédération Française de Voile'
      },
      sourceName: 'Fédération Française de Voile (FFVoile)',
      sourceUrl: 'https://espaces.ffvoile.fr/competitions/',
      sourceType: 'federation',
      relevanceScore: 90
    },
    {
      title: 'Mythique Défi Wind de Gruissan',
      category: 'Sports nautiques',
      startDate: defiWind.startDate,
      endDate: defiWind.endDate,
      city: 'Gruissan',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Plage des Chalets',
      description: 'Le plus grand marathon nautique de planche à voile et windfoil au monde. Plus de 1200 participants alignés au départ.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: 'Dates fixées au calendrier international, ouverture du village exposant 4 jours.',
        priceOrRegistration: 'Ouverture des inscriptions 3 mois avant sur le site officiel (surveiller l’alerte)',
        organizer: 'PBO Organisation'
      },
      sourceName: 'Calendrier International Défi Wind & Gruissan Tourisme',
      sourceUrl: 'https://www.defiwind.org',
      sourceType: 'specialized_site',
      relevanceScore: 99
    },
    {
      title: 'Transbrac VTT & Marathon des Pyrénées Orientales',
      category: 'VTT & Cyclisme',
      startDate: transbrac.startDate,
      endDate: transbrac.endDate,
      city: 'Prades / Font-Romeu',
      department: '66 - Pyrénées-Orientales',
      region: 'Occitanie',
      locationDetails: 'Massif du Canigou',
      description: 'Épreuve d’endurance VTT de haute altitude reliant les contreforts du Canigou aux plateaux cerdans.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: 'Week-end prévisionnel, parcours 85 km marathon et 45 km rando sportive',
        priceOrRegistration: 'Inscriptions prévues vers J-60'
      },
      sourceName: 'Comité Régional Cyclisme Occitanie',
      sourceUrl: 'https://www.cyclismeoccitanie.fr',
      sourceType: 'federation',
      relevanceScore: 88
    },
    {
      title: 'Festival Mondial du Vent & Wingfoil Cup',
      category: 'Sports nautiques',
      startDate: mondialVent.startDate,
      endDate: mondialVent.endDate,
      city: 'Leucate',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'La Franqui',
      description: 'Le rendez-vous incontournable des sports de glisse aérotractés : étape de coupe du monde de Wingfoil, démonstrations, salon et initiations.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: 'Festival international du 1er au 11 avril avec compétitions pros et village grand public',
        priceOrRegistration: 'Accès public gratuit au village, inscriptions régate via GWA'
      },
      sourceName: 'Office de Tourisme de Leucate & Mondial du Vent',
      sourceUrl: 'https://www.mondialduvent.fr',
      sourceType: 'tourism_office',
      relevanceScore: 97
    },
    {
      title: 'Salon des Vins & Terroir du Pic Saint-Loup',
      category: 'Patrimoine & Terroir',
      startDate: vendangesPic.startDate,
      endDate: vendangesPic.endDate,
      city: 'Saint-Mathieu-de-Tréviers / Pic Saint-Loup',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Esplanade du Galion et domaines viticoles partenaires',
      description: 'Grand rassemblement des vignerons et producteurs du terroir languedocien. Dégustations AOP Pic Saint-Loup, ateliers œnologiques et marché des saveurs.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Samedi 11h-23h et dimanche 10h-18h',
        priceOrRegistration: 'Verre de dégustation à l’entrée (8 € incluant carnets de dégustation)',
        organizer: 'Syndicat des Vignerons du Pic Saint-Loup',
        contactEmailOrPhone: 'contact@pic-saint-loup.com'
      },
      sourceName: 'Hérault Tourisme & Terroirs d’Occitanie',
      sourceUrl: 'https://www.herault-tourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 93
    },
    // --- ÉVÉNEMENTS ÉTÉ / AUTOMNE (AFFICHÉS SELON L'HORIZON 9-12 MOIS) ---
    {
      title: 'Roc d’Azur Méditerranée (Édition Annuelle)',
      category: 'VTT & Cyclisme',
      startDate: rocAzur.startDate,
      endDate: rocAzur.endDate,
      city: 'Fréjus / Massif des Maures',
      department: '83 - Var',
      region: 'France (PACA)',
      locationDetails: 'Base Nature François Léotard',
      description: 'Le plus grand salon et rassemblement VTT & Gravel d’Europe avec plus de 20 000 participants et 300 exposants.',
      detailLevel: 'low',
      practicalInfo: {
        schedule: '5 jours d’épreuves (Roc Marathon, Rando Noire, Roc Gravel, Électrique, Rando Déguisée)',
        priceOrRegistration: 'Inscriptions selon épreuve sur la plateforme A.S.O.'
      },
      sourceName: 'Plateforme Officielle Roc d’Azur',
      sourceUrl: 'https://www.rocazur.com',
      sourceType: 'event_platform',
      relevanceScore: 96
    },
    {
      title: 'Festival de Thau & Scènes Musicales Éco-responsables',
      category: 'Culture & Musique',
      startDate: festivalThau.startDate,
      endDate: festivalThau.endDate,
      city: 'Mèze / Bassin de Thau',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Port de Mèze, Parc du Château de Girard & rives de la lagune',
      description: 'Festival musical majeur au bord de la lagune de Thau mêlant musiques du monde, concerts engagés, tables rondes citoyennes et dégustations de coquillages.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Concerts en soirée dès 18h30, débats et ateliers l’après-midi',
        priceOrRegistration: 'Concerts payants (Pass 3 soirs ou billet unitaire) / Ateliers gratuits',
        organizer: 'Association Jazz Musique & Environnement',
        contactEmailOrPhone: 'contact@festivaldethau.com'
      },
      sourceName: 'Office de Tourisme Archipel de Thau & OpenAgenda',
      sourceUrl: 'https://www.herault-tourisme.com',
      sourceType: 'tourism_office',
      relevanceScore: 96
    },
    {
      title: 'Fête Médiévale d’Aigues-Mortes & Reconstitution Historique',
      category: 'Patrimoine & Terroir',
      startDate: medievaleAigues.startDate,
      endDate: medievaleAigues.endDate,
      city: 'Aigues-Mortes',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Remparts historiques et place Saint-Louis',
      description: 'Plongée dans le XIIIe siècle au temps de Saint Louis : campements d’époque, défilés en costumes, tournois de chevalerie, tavernes médiévales et marché d’artisans d’art.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'De 10h à minuit le samedi et dimanche, grand défilé aux flambeaux samedi soir',
        priceOrRegistration: 'Accès libre dans la cité fortifiée, spectacles de chevalerie avec billetterie',
        organizer: 'Ville d’Aigues-Mortes & Office de Tourisme',
        contactEmailOrPhone: 'tourisme@ot-aiguesmortes.com'
      },
      sourceName: 'Gard Tourisme & Ville d’Aigues-Mortes',
      sourceUrl: 'https://www.tourismegard.com/agenda/',
      sourceType: 'tourism_office',
      relevanceScore: 94
    },
    {
      title: 'Nuit des Étoiles & Rencontres d’Astronomie des Cévennes',
      category: 'Sciences & Nature',
      startDate: nuitEtoiles.startDate,
      endDate: nuitEtoiles.endDate,
      city: 'Aniane / Causse de Blandas',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Observatoire Astronomique d’Aniane (Réserve Internationale de Ciel Étoilé)',
      description: 'Observation du ciel profond et de la Voie Lactée sous l’un des ciels les plus purs d’Europe. Ateliers planétarium, télescopes géants en libre accès et conférences de chercheurs.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Observations nocturnes de 21h à 2h, animations jeunesse dès 16h',
        priceOrRegistration: 'Entrée gratuite sur réservation préalable recommandée',
        organizer: 'Club Astronomie Languedoc & Parc National des Cévennes',
        contactEmailOrPhone: 'contact@astronomie-aniane.fr'
      },
      sourceName: 'Réseau Ciel Étoilé & Tourisme Occitanie',
      sourceUrl: 'https://www.tourisme-occitanie.com',
      sourceType: 'tourism_office',
      relevanceScore: 91
    },
    {
      title: 'Festival de Nîmes aux Arènes (Concerts & Têtes d’affiche)',
      category: 'Culture & Musique',
      startDate: festivalNimes.startDate,
      endDate: festivalNimes.endDate,
      city: 'Nîmes',
      department: '30 - Gard',
      region: 'Occitanie',
      locationDetails: 'Arènes Romaines de Nîmes',
      description: 'Grand rendez-vous musical estival dans l’écrin des arènes antiques : plus de 20 soirées de concerts prestigieux avec les plus grands artistes nationaux et internationaux.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Concerts en soirée à 20h30, ouverture des grilles dès 18h30',
        priceOrRegistration: 'Billetterie officielle disponible sur Ticketmaster (de 45€ à 95€)',
        organizer: 'Adam Concerts & Ticketmaster France',
        conditionsOrSpot: 'Amphithéâtre romain bimillénaire à ciel ouvert',
        contactEmailOrPhone: 'billetterie@festivaldenimes.com'
      },
      sourceName: 'Ticketmaster France (Billetterie Officielle)',
      sourceUrl: 'https://www.ticketmaster.fr/fr/manifestation/festival-de-nimes-billet/idmanif/570000',
      sourceType: 'ticketmaster',
      relevanceScore: 99
    },
    {
      title: 'Festival Jazz à Sète & Soirées du Théâtre de la Mer',
      category: 'Culture & Musique',
      startDate: jazzSete.startDate,
      endDate: jazzSete.endDate,
      city: 'Sète',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Théâtre de la Mer Jean Marais - Promenade Maréchal Leclerc',
      description: 'Semaine de concerts d’exception dans l’amphithéâtre à ciel ouvert suspendu au-dessus des vagues méditerranéennes. Jazz moderne, soul, groove et improvisations.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Concerts à 21h00 face à la mer, apéro-concerts dès 19h00',
        priceOrRegistration: 'De 28€ à 48€ la soirée, pass semaine disponible',
        organizer: 'Association Jazz à Sète & Ville de Sète',
        conditionsOrSpot: 'Vue panoramique sur la Méditerranée',
        contactEmailOrPhone: 'contact@jazzasete.com'
      },
      sourceName: 'Hérault Tourisme & Ville de Sète',
      sourceUrl: 'https://www.jazzasete.com',
      ticketUrl: 'https://www.jazzasete.com',
      sourceType: 'official_site',
      relevanceScore: 98
    },
    {
      title: 'Festival Les Déferlantes Sud de France',
      category: 'Culture & Musique',
      startDate: deferlantes.startDate,
      endDate: deferlantes.endDate,
      city: 'Le Barcarès',
      department: '66 - Pyrénées-Orientales',
      region: 'Occitanie',
      locationDetails: 'Jardins du Lydia - Grand Paquebot des Sables',
      description: 'Le festival géant de musiques actuelles de la côte catalane : 4 scènes, têtes d’affiche pop, rap, électro et rock avec des milliers de festivaliers.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Concerts de 16h00 à 03h00, village festival et food-trucks du terroir',
        priceOrRegistration: 'Pass 1 jour dès 64€, Pass 4 jours sur Ticketmaster et billetteries officielles',
        organizer: 'La Frontera Production & Ticketmaster',
        conditionsOrSpot: 'En bord de mer au pied du paquebot ensablé Le Lydia',
        contactEmailOrPhone: 'contact@festival-lesdeferlantes.com',
        ticketingUrl: 'https://www.ticketmaster.fr/fr/manifestation/les-deferlantes-sud-de-france-billet/idmanif/568000'
      },
      sourceName: 'Ticketmaster France (Billetterie)',
      sourceUrl: 'https://www.festival-lesdeferlantes.com',
      ticketUrl: 'https://www.ticketmaster.fr/fr/manifestation/les-deferlantes-sud-de-france-billet/idmanif/568000',
      sourceType: 'ticketmaster',
      relevanceScore: 98
    },
    {
      title: 'Festival Pause Guitare Sud de France',
      category: 'Culture & Musique',
      startDate: pauseGuitare.startDate,
      endDate: pauseGuitare.endDate,
      city: 'Albi',
      department: '81 - Tarn',
      region: 'Occitanie',
      locationDetails: 'Parc de Pratgraussals & Cité Épiscopale',
      description: 'Festival phare de musiques actuelles et de chanson francophone au bord du Tarn avec scènes découvertes gratuites en journée et grands concerts en soirée.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Scènes en ville dès 14h, concerts grande scène 18h30-01h00',
        priceOrRegistration: 'Billetterie journées dès 49€ sur Ticketmaster et site officiel',
        organizer: 'Association Arpèges & Trémolos',
        contactEmailOrPhone: 'billetterie@pauseguitare.net',
        ticketingUrl: 'https://www.ticketmaster.fr/fr/manifestation/festival-pause-guitare-billet/idmanif/562000'
      },
      sourceName: 'Pause Guitare & Ticketmaster France',
      sourceUrl: 'https://www.pauseguitare.net',
      ticketUrl: 'https://www.ticketmaster.fr/fr/manifestation/festival-pause-guitare-billet/idmanif/562000',
      sourceType: 'ticketmaster',
      relevanceScore: 97
    },
    {
      title: 'Festival de Carcassonne (Concerts dans la Cité Médiévale)',
      category: 'Culture & Musique',
      startDate: festivalCarca.startDate,
      endDate: festivalCarca.endDate,
      city: 'Carcassonne',
      department: '11 - Aude',
      region: 'Occitanie',
      locationDetails: 'Théâtre Jean-Deschamps - Cité Médiévale UNESCO',
      description: 'Musique, variété, opéra et chanson dans l’écrin des remparts millénaires de Carcassonne. Une programmation artistique de haut rang.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Spectacles et concerts à 21h30',
        priceOrRegistration: 'Réservations sur festivaldecarcassonne.fr et Ticketmaster',
        organizer: 'Ville de Carcassonne & Festival de Carcassonne',
        ticketingUrl: 'https://www.festivaldecarcassonne.fr'
      },
      sourceName: 'Festival de Carcassonne (Site Officiel)',
      sourceUrl: 'https://www.festivaldecarcassonne.fr',
      ticketUrl: 'https://www.festivaldecarcassonne.fr',
      sourceType: 'official_site',
      relevanceScore: 96
    },
    {
      title: 'Fiest’A Sète (Festival des Musiques du Monde)',
      category: 'Culture & Musique',
      startDate: fiestaSete.startDate,
      endDate: fiestaSete.endDate,
      city: 'Sète',
      department: '34 - Hérault',
      region: 'Occitanie',
      locationDetails: 'Théâtre de la Mer Jean Marais & Plages de Sète',
      description: 'Grand festival cosmopolite des musiques du monde métissées : soirées thématiques afro-cubaines, cumbia, funk et afrobeat face aux flots.',
      detailLevel: 'medium',
      practicalInfo: {
        schedule: 'Expos et projections dès 18h, concerts au Théâtre de la Mer à 21h00',
        priceOrRegistration: 'Billetterie de 24€ à 38€ la soirée',
        organizer: 'Association Métisète',
        ticketingUrl: 'https://www.fiestasete.com'
      },
      sourceName: 'Fiest’A Sète (Site Officiel)',
      sourceUrl: 'https://www.fiestasete.com',
      ticketUrl: 'https://www.fiestasete.com',
      sourceType: 'official_site',
      relevanceScore: 95
    }
  ];

  return rawEvents
    .filter((ev) => ev.startDate <= maxHorizonStr)
    .map((ev) => {
      const similarityHash = generateEventSimilarityHash(ev.title, ev.startDate, ev.city, ev.category);
      const id = `evt_${similarityHash.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      return {
        ...ev,
        id,
        similarityHash,
        firstDiscoveredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        status: 'new' as const,
      };
    });
}
