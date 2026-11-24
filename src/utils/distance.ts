// Utility for calculating and formatting distances between event locations and user reference location,
// plus shared multi-criteria sorting (Date -> Favori -> Distance)
import { ManifestationEvent, UserPreferences } from '../types';
import { getEffectiveStartDate } from './dateFormatting';

export interface Coordinates {
  lat: number;
  lng: number;
}

// Comprehensive dictionary of communes and points of interest in Occitanie and major French cities
// Normalized lowercase keys (no accents, no hyphens, spaces/punctuation stripped via normalizePlaceName)
const PRESET_COORDINATES: Record<string, Coordinates> = {
  // Occitanie - Hérault (34)
  'montpellier': { lat: 43.6108, lng: 3.8767 },
  'beziers': { lat: 43.3442, lng: 3.2158 },
  'sete': { lat: 43.4079, lng: 3.6967 },
  'clermontlherault': { lat: 43.6278, lng: 3.4306 },
  'lodeve': { lat: 43.7317, lng: 3.3197 },
  'agde': { lat: 43.3108, lng: 3.4758 },
  'capdagde': { lat: 43.2844, lng: 3.5042 },
  'lecapdagde': { lat: 43.2844, lng: 3.5042 },
  'lunel': { lat: 43.6750, lng: 4.1347 },
  'lunelviel': { lat: 43.6778, lng: 4.0928 },
  'marsillargues': { lat: 43.6656, lng: 4.1786 },
  'mauguio': { lat: 43.6167, lng: 4.0111 },
  'carnon': { lat: 43.5414, lng: 3.9786 },
  'palavaslesflots': { lat: 43.5286, lng: 3.9317 },
  'palavas': { lat: 43.5286, lng: 3.9317 },
  'lagrandemotte': { lat: 43.5606, lng: 4.0847 },
  'saintjeandevedas': { lat: 43.5786, lng: 3.8258 },
  'castelnaulelez': { lat: 43.6339, lng: 3.9017 },
  'frontignan': { lat: 43.4475, lng: 3.7553 },
  'marseillan': { lat: 43.3564, lng: 3.5289 },
  'marseillanplage': { lat: 43.3197, lng: 3.5558 },
  'pezenas': { lat: 43.4608, lng: 3.4242 },
  'bedarieux': { lat: 43.6167, lng: 3.1583 },
  'saintguilhemledesert': { lat: 43.7333, lng: 3.5500 },
  'salagou': { lat: 43.6558, lng: 3.3764 },
  'lacdusalagou': { lat: 43.6558, lng: 3.3764 },
  'octon': { lat: 43.6544, lng: 3.3025 },
  'moureze': { lat: 43.6194, lng: 3.3567 },
  'picsaintloup': { lat: 43.7719, lng: 3.7917 },
  'juvignac': { lat: 43.6136, lng: 3.8117 },
  'villeneuvelesmaguelone': { lat: 43.5322, lng: 3.8628 },
  'lattes': { lat: 43.5678, lng: 3.9028 },
  'perols': { lat: 43.5639, lng: 3.9508 },
  'saintgelydufesc': { lat: 43.6931, lng: 3.8058 },
  'saintmathieudetreviers': { lat: 43.7697, lng: 3.8686 },
  'jacou': { lat: 43.6625, lng: 3.9114 },
  'vendargues': { lat: 43.6589, lng: 3.9686 },
  'baillargues': { lat: 43.6611, lng: 4.0131 },
  'castries': { lat: 43.6778, lng: 3.9819 },
  'lecers': { lat: 43.3275, lng: 3.2981 },
  'serignan': { lat: 43.2803, lng: 3.2817 },
  'valrasplage': { lat: 43.2458, lng: 3.2917 },
  'villeneuvelesbeziers': { lat: 43.3147, lng: 3.2806 },
  'portiragnes': { lat: 43.3044, lng: 3.3347 },
  'vias': { lat: 43.3125, lng: 3.4186 },
  'meze': { lat: 43.4258, lng: 3.6067 },
  'balaruc': { lat: 43.4408, lng: 3.6775 },
  'balaruclesbains': { lat: 43.4408, lng: 3.6775 },
  'balaruclevieux': { lat: 43.4606, lng: 3.6856 },
  'bouzigues': { lat: 43.4481, lng: 3.6578 },
  'loupian': { lat: 43.4494, lng: 3.6139 },
  'poussan': { lat: 43.4883, lng: 3.6708 },
  'gigean': { lat: 43.5003, lng: 3.7114 },
  'viclagardiole': { lat: 43.4894, lng: 3.7972 },
  'mireval': { lat: 43.5086, lng: 3.8003 },
  'bassindethau': { lat: 43.4167, lng: 3.6167 },
  'aniane': { lat: 43.6847, lng: 3.5858 },
  'saintjeandefos': { lat: 43.7025, lng: 3.5519 },
  'gignac': { lat: 43.6519, lng: 3.5508 },
  'ganges': { lat: 43.9344, lng: 3.7086 },
  'lasalvetatsuragout': { lat: 43.6011, lng: 2.7033 },
  'lamaloulesbains': { lat: 43.5986, lng: 3.0811 },
  'saintponsdethomieres': { lat: 43.4889, lng: 2.7594 },
  'olargues': { lat: 43.5569, lng: 2.9150 },
  'capestang': { lat: 43.3292, lng: 3.0444 },
  'servian': { lat: 43.4275, lng: 3.2994 },
  'pignan': { lat: 43.5836, lng: 3.7619 },
  'fabregues': { lat: 43.5514, lng: 3.7764 },
  'clapiers': { lat: 43.6575, lng: 3.8883 },
  'montferriersurlez': { lat: 43.6683, lng: 3.8572 },
  'grabels': { lat: 43.6478, lng: 3.8022 },

  // Occitanie - Gard (30)
  'nimes': { lat: 43.8367, lng: 4.3601 },
  'aiguesmortes': { lat: 43.5672, lng: 4.1917 },
  'ales': { lat: 44.1278, lng: 4.0833 },
  'legrauduroi': { lat: 43.5358, lng: 4.1358 },
  'portcamargue': { lat: 43.5222, lng: 4.1328 },
  'uzes': { lat: 44.0125, lng: 4.4194 },
  'sommieres': { lat: 43.7833, lng: 4.0900 },
  'calvisson': { lat: 43.7850, lng: 4.1919 },
  'quissac': { lat: 43.9094, lng: 3.9983 },
  'beaucaire': { lat: 43.8078, lng: 4.6433 },
  'bagnolssurceze': { lat: 44.1625, lng: 4.6194 },
  'pontsaintesprit': { lat: 44.2564, lng: 4.6486 },
  'pontdugard': { lat: 43.9514, lng: 4.5353 },
  'anduze': { lat: 44.0539, lng: 3.9856 },
  'saintjeandugard': { lat: 44.1047, lng: 3.8861 },
  'sainthippolytedufort': { lat: 43.9656, lng: 3.8561 },
  'levigan': { lat: 43.9917, lng: 3.6067 },
  'villeneuvelesavignon': { lat: 43.9667, lng: 4.7967 },
  'vauvert': { lat: 43.6936, lng: 4.2753 },
  'saintgilles': { lat: 43.6767, lng: 4.4308 },
  'marguerittes': { lat: 43.8603, lng: 4.4447 },
  'bellegarde': { lat: 43.7547, lng: 4.5139 },
  'saintlaurentdaigouze': { lat: 43.6350, lng: 4.1931 },

  // Occitanie - Aude (11)
  'carcassonne': { lat: 43.2130, lng: 2.3537 },
  'narbonne': { lat: 43.1837, lng: 3.0042 },
  'narbonneplage': { lat: 43.1622, lng: 3.1658 },
  'leucate': { lat: 42.9092, lng: 3.0278 },
  'lafranqui': { lat: 42.9292, lng: 3.0333 },
  'gruissan': { lat: 43.1072, lng: 3.0847 },
  'portlanouvelle': { lat: 43.0214, lng: 3.0442 },
  'castelnaudary': { lat: 43.3181, lng: 1.9536 },
  'limoux': { lat: 43.0539, lng: 2.2178 },
  'quillan': { lat: 42.8753, lng: 2.1839 },
  'lezignancorbieres': { lat: 43.2017, lng: 2.7583 },
  'sigean': { lat: 43.0289, lng: 2.9978 },
  'coursan': { lat: 43.2328, lng: 3.0592 },
  'fleury': { lat: 43.2297, lng: 3.1336 },
  'saintpierrelamer': { lat: 43.1811, lng: 3.1886 },
  'trebes': { lat: 43.2097, lng: 2.4414 },
  'bram': { lat: 43.2439, lng: 2.1144 },
  'lagrasse': { lat: 43.0914, lng: 2.6194 },

  // Occitanie - Pyrénées-Orientales (66)
  'perpignan': { lat: 42.6986, lng: 2.8956 },
  'canetenroussillon': { lat: 42.7058, lng: 3.0078 },
  'canet': { lat: 42.7058, lng: 3.0078 },
  'argelessurmer': { lat: 42.5461, lng: 3.0236 },
  'argeles': { lat: 42.5461, lng: 3.0236 },
  'collioure': { lat: 42.5250, lng: 3.0828 },
  'portvendres': { lat: 42.5200, lng: 3.1072 },
  'banyulssurmer': { lat: 42.4828, lng: 3.1286 },
  'banyuls': { lat: 42.4828, lng: 3.1286 },
  'ceret': { lat: 42.4858, lng: 2.7486 },
  'prades': { lat: 42.6181, lng: 2.4239 },
  'fontromeu': { lat: 42.4981, lng: 2.0408 },
  'saintcyprien': { lat: 42.6167, lng: 3.0028 },
  'rivesaltes': { lat: 42.7694, lng: 2.8744 },
  'saintesteve': { lat: 42.7139, lng: 2.8428 },
  'lebarcares': { lat: 42.7878, lng: 3.0339 },
  'barcares': { lat: 42.7878, lng: 3.0339 },
  'portbarcares': { lat: 42.7878, lng: 3.0339 },
  'lesangles': { lat: 42.5767, lng: 2.0736 },
  'elne': { lat: 42.6003, lng: 2.9711 },
  'thuir': { lat: 42.6328, lng: 2.7556 },
  'leboulou': { lat: 42.5239, lng: 2.8350 },
  'amelielesbains': { lat: 42.4731, lng: 2.6714 },
  'torreilles': { lat: 42.7550, lng: 2.9939 },
  'tautavel': { lat: 42.8142, lng: 2.7469 },

  // Occitanie - Haute-Garonne (31)
  'toulouse': { lat: 43.6047, lng: 1.4442 },
  'blagnac': { lat: 43.6364, lng: 1.3931 },
  'colomiers': { lat: 43.6142, lng: 1.3347 },
  'tournefeuille': { lat: 43.5850, lng: 1.3436 },
  'muret': { lat: 43.4608, lng: 1.3267 },
  'saintgaudens': { lat: 43.1072, lng: 0.7236 },
  'bagneresdeluchon': { lat: 42.7908, lng: 0.5933 },
  'luchon': { lat: 42.7908, lng: 0.5933 },
  'revel': { lat: 43.4586, lng: 2.0044 },
  'ramonvillesaintagne': { lat: 43.5436, lng: 1.4772 },
  'castanettolosan': { lat: 43.5161, lng: 1.4981 },
  'balma': { lat: 43.6108, lng: 1.4992 },
  'labege': { lat: 43.5361, lng: 1.5300 },
  'cugnaux': { lat: 43.5378, lng: 1.3442 },

  // Occitanie - Tarn (81) & Tarn-et-Garonne (82)
  'albi': { lat: 43.9298, lng: 2.1480 },
  'castres': { lat: 43.6056, lng: 2.2403 },
  'gaillac': { lat: 43.9017, lng: 1.8967 },
  'graulhet': { lat: 43.7611, lng: 1.9897 },
  'mazamet': { lat: 43.4897, lng: 2.3742 },
  'lavaur': { lat: 43.6989, lng: 1.8192 },
  'carmaux': { lat: 44.0486, lng: 2.1592 },
  'cordessurciel': { lat: 44.0633, lng: 1.9508 },
  'montauban': { lat: 44.0175, lng: 1.3550 },
  'moissac': { lat: 44.1039, lng: 1.0850 },
  'castelsarrasin': { lat: 44.0397, lng: 1.1072 },

  // Occitanie - Aveyron (12) & Lozère (48)
  'rodez': { lat: 44.3516, lng: 2.5750 },
  'millau': { lat: 44.0984, lng: 3.0782 },
  'villefranchederouergue': { lat: 44.3528, lng: 2.0361 },
  'espalion': { lat: 44.5219, lng: 2.7633 },
  'saintaffrique': { lat: 43.9575, lng: 2.8856 },
  'decazeville': { lat: 44.5594, lng: 2.2550 },
  'mende': { lat: 44.5178, lng: 3.5008 },
  'florac': { lat: 44.3242, lng: 3.5931 },
  'meyrueis': { lat: 44.1783, lng: 3.4294 },
  'marvejols': { lat: 44.5539, lng: 3.2906 },
  'langogne': { lat: 44.7267, lng: 3.8547 },
  'saintchelydapcher': { lat: 44.8017, lng: 3.2758 },

  // Occitanie - Hautes-Pyrénées (65), Gers (32), Lot (46), Ariège (09)
  'tarbes': { lat: 43.2329, lng: 0.0781 },
  'lourdes': { lat: 43.0944, lng: -0.0458 },
  'bagneresdebigorre': { lat: 43.0639, lng: 0.1494 },
  'cauterets': { lat: 42.8889, lng: -0.1147 },
  'saintlarysoulan': { lat: 42.8175, lng: 0.3236 },
  'auch': { lat: 43.6453, lng: 0.5849 },
  'condom': { lat: 43.9583, lng: 0.3725 },
  'lislejourdain': { lat: 43.6133, lng: 1.0825 },
  'cahors': { lat: 44.4475, lng: 1.4419 },
  'figeac': { lat: 44.6083, lng: 2.0333 },
  'gourdon': { lat: 44.7369, lng: 1.3828 },
  'souillac': { lat: 44.8964, lng: 1.4783 },
  'foix': { lat: 42.9647, lng: 1.6053 },
  'pamiers': { lat: 43.1167, lng: 1.6111 },
  'saintgirons': { lat: 42.9842, lng: 1.1444 },
  'axlesthermes': { lat: 42.7214, lng: 1.8394 },
  'mirepoix': { lat: 43.0886, lng: 1.8739 },

  // Major French cities & neighboring PACA/Auvergne/Nouvelle-Aquitaine hubs
  'paris': { lat: 48.8566, lng: 2.3522 },
  'marseille': { lat: 43.2965, lng: 5.3698 },
  'lyon': { lat: 45.7640, lng: 4.8357 },
  'bordeaux': { lat: 44.8378, lng: -0.5792 },
  'nice': { lat: 43.7102, lng: 7.2620 },
  'nantes': { lat: 47.2184, lng: -1.5536 },
  'strasbourg': { lat: 48.5734, lng: 7.7521 },
  'lille': { lat: 50.6292, lng: 3.0573 },
  'rennes': { lat: 48.1173, lng: -1.6778 },
  'grenoble': { lat: 45.1885, lng: 5.7245 },
  'avignon': { lat: 43.9493, lng: 4.8055 },
  'arles': { lat: 43.6767, lng: 4.6300 },
  'aixenprovence': { lat: 43.5297, lng: 5.4474 },
  'toulon': { lat: 43.1242, lng: 5.9280 },
  'clermontferrand': { lat: 45.7772, lng: 3.0870 },
  'pau': { lat: 43.2951, lng: -0.3708 },
  'biarritz': { lat: 43.4832, lng: -1.5586 },
  'bayonne': { lat: 43.4929, lng: -1.4748 },
  'valence': { lat: 44.9333, lng: 4.8917 },
  'dijon': { lat: 47.3220, lng: 5.0415 },
  'brest': { lat: 48.3904, lng: -4.4861 },
  'saintetienne': { lat: 45.4397, lng: 4.3872 },
  'hyeres': { lat: 43.1206, lng: 6.1286 },
  'frejus': { lat: 43.4331, lng: 6.7370 },
  'roquebrunesurargens': { lat: 43.4436, lng: 6.6378 },
  'cannes': { lat: 43.5528, lng: 7.0174 },
  'antibes': { lat: 43.5804, lng: 7.1251 },
  'orange': { lat: 44.1383, lng: 4.8075 },
  'carpentras': { lat: 44.0550, lng: 5.0481 },
  'martigues': { lat: 43.4056, lng: 5.0478 },
  'istres': { lat: 43.5144, lng: 4.9889 },
  'salon': { lat: 43.6406, lng: 5.0972 },
  'salondeprovence': { lat: 43.6406, lng: 5.0972 },
  'aubagne': { lat: 43.2928, lng: 5.5708 },
  'laciotat': { lat: 43.1753, lng: 5.6050 },
  'annecy': { lat: 45.8992, lng: 6.1294 },
  'chambery': { lat: 45.5646, lng: 5.9178 },
  'tours': { lat: 47.3941, lng: 0.6848 },
  'orleans': { lat: 47.9029, lng: 1.9093 },
  'angers': { lat: 47.4784, lng: -0.5632 },
  'larochelle': { lat: 46.1603, lng: -1.1511 },
  'limoges': { lat: 45.8336, lng: 1.2611 },
  'poitiers': { lat: 46.5802, lng: 0.3404 },
  'reims': { lat: 49.2583, lng: 4.0317 },
  'metz': { lat: 49.1193, lng: 6.1757 },
  'nancy': { lat: 48.6921, lng: 6.1844 },
  'rouen': { lat: 49.4432, lng: 1.0999 },
  'caen': { lat: 49.1829, lng: -0.3707 },
  'ajaccio': { lat: 41.9192, lng: 8.7386 },
  'bastia': { lat: 42.6973, lng: 9.4509 },
  'aurillac': { lat: 44.9258, lng: 2.4414 },
  'lepuyenvelay': { lat: 45.0428, lng: 3.8829 },
  'privas': { lat: 44.7353, lng: 4.5992 },
  'gap': { lat: 44.5594, lng: 6.0786 },
  'digne': { lat: 44.0922, lng: 6.2356 },
};

// All Metropolitan French Department centroids (used when only department code/name or postal code is known)
const DEPT_CENTROIDS: Record<string, Coordinates> = {
  '01': { lat: 46.20, lng: 5.22 },
  '02': { lat: 49.56, lng: 3.62 },
  '03': { lat: 46.57, lng: 3.33 },
  '04': { lat: 44.09, lng: 6.24 },
  '05': { lat: 44.56, lng: 6.08 },
  '06': { lat: 43.71, lng: 7.26 },
  '07': { lat: 44.74, lng: 4.60 },
  '08': { lat: 49.76, lng: 4.72 },
  '09': { lat: 42.96, lng: 1.61 },
  '10': { lat: 48.30, lng: 4.08 },
  '11': { lat: 43.21, lng: 2.35 },
  '12': { lat: 44.35, lng: 2.57 },
  '13': { lat: 43.30, lng: 5.37 },
  '14': { lat: 49.18, lng: -0.37 },
  '15': { lat: 44.93, lng: 2.44 },
  '16': { lat: 45.65, lng: 0.16 },
  '17': { lat: 46.16, lng: -1.15 },
  '18': { lat: 47.08, lng: 2.40 },
  '19': { lat: 45.27, lng: 1.77 },
  '2A': { lat: 41.92, lng: 8.74 },
  '2B': { lat: 42.70, lng: 9.45 },
  '21': { lat: 47.32, lng: 5.04 },
  '22': { lat: 48.51, lng: -2.76 },
  '23': { lat: 46.17, lng: 1.87 },
  '24': { lat: 45.18, lng: 0.72 },
  '25': { lat: 47.24, lng: 6.02 },
  '26': { lat: 44.93, lng: 4.89 },
  '27': { lat: 49.02, lng: 1.15 },
  '28': { lat: 48.45, lng: 1.49 },
  '29': { lat: 48.00, lng: -4.10 },
  '30': { lat: 43.84, lng: 4.36 },
  '31': { lat: 43.60, lng: 1.44 },
  '32': { lat: 43.65, lng: 0.58 },
  '33': { lat: 44.84, lng: -0.58 },
  '34': { lat: 43.61, lng: 3.87 },
  '35': { lat: 48.12, lng: -1.68 },
  '36': { lat: 46.81, lng: 1.69 },
  '37': { lat: 47.39, lng: 0.68 },
  '38': { lat: 45.19, lng: 5.72 },
  '39': { lat: 46.67, lng: 5.55 },
  '40': { lat: 43.89, lng: -0.50 },
  '41': { lat: 47.59, lng: 1.33 },
  '42': { lat: 45.44, lng: 4.39 },
  '43': { lat: 45.04, lng: 3.88 },
  '44': { lat: 47.22, lng: -1.55 },
  '45': { lat: 47.90, lng: 1.91 },
  '46': { lat: 44.45, lng: 1.44 },
  '47': { lat: 44.20, lng: 0.62 },
  '48': { lat: 44.52, lng: 3.50 },
  '49': { lat: 47.48, lng: -0.56 },
  '50': { lat: 49.12, lng: -1.09 },
  '51': { lat: 48.96, lng: 4.36 },
  '52': { lat: 48.11, lng: 5.14 },
  '53': { lat: 48.07, lng: -0.77 },
  '54': { lat: 48.69, lng: 6.18 },
  '55': { lat: 48.77, lng: 5.16 },
  '56': { lat: 47.66, lng: -2.76 },
  '57': { lat: 49.12, lng: 6.18 },
  '58': { lat: 46.99, lng: 3.16 },
  '59': { lat: 50.63, lng: 3.06 },
  '60': { lat: 49.43, lng: 2.08 },
  '61': { lat: 48.43, lng: 0.09 },
  '62': { lat: 50.29, lng: 2.78 },
  '63': { lat: 45.78, lng: 3.09 },
  '64': { lat: 43.30, lng: -0.37 },
  '65': { lat: 43.23, lng: 0.08 },
  '66': { lat: 42.70, lng: 2.90 },
  '67': { lat: 48.57, lng: 7.75 },
  '68': { lat: 48.08, lng: 7.36 },
  '69': { lat: 45.76, lng: 4.84 },
  '70': { lat: 47.62, lng: 6.15 },
  '71': { lat: 46.31, lng: 4.83 },
  '72': { lat: 48.00, lng: 0.20 },
  '73': { lat: 45.56, lng: 5.92 },
  '74': { lat: 45.90, lng: 6.13 },
  '75': { lat: 48.86, lng: 2.35 },
  '76': { lat: 49.44, lng: 1.10 },
  '77': { lat: 48.54, lng: 2.66 },
  '78': { lat: 48.80, lng: 2.13 },
  '79': { lat: 46.32, lng: -0.46 },
  '80': { lat: 49.89, lng: 2.30 },
  '81': { lat: 43.93, lng: 2.15 },
  '82': { lat: 44.02, lng: 1.35 },
  '83': { lat: 43.12, lng: 5.93 },
  '84': { lat: 43.95, lng: 4.81 },
  '85': { lat: 46.67, lng: -1.43 },
  '86': { lat: 46.58, lng: 0.34 },
  '87': { lat: 45.83, lng: 1.26 },
  '88': { lat: 48.17, lng: 6.45 },
  '89': { lat: 47.80, lng: 3.57 },
  '90': { lat: 47.64, lng: 6.86 },
  '91': { lat: 48.63, lng: 2.43 },
  '92': { lat: 48.89, lng: 2.24 },
  '93': { lat: 48.91, lng: 2.45 },
  '94': { lat: 48.79, lng: 2.46 },
  '95': { lat: 49.05, lng: 2.10 },
};

// Map normalized department names (without code prefix, as returned by OpenAgenda) to 2-digit department codes
const DEPT_NAME_TO_CODE: Record<string, string> = {
  'ain': '01',
  'aisne': '02',
  'allier': '03',
  'alpesdehauteprovence': '04',
  'hautesalpes': '05',
  'alpesmaritimes': '06',
  'ardeche': '07',
  'ardennes': '08',
  'ariege': '09',
  'aube': '10',
  'aude': '11',
  'aveyron': '12',
  'bouchesdurhone': '13',
  'calvados': '14',
  'cantal': '15',
  'charente': '16',
  'charentemaritime': '17',
  'cher': '18',
  'correze': '19',
  'corsedusud': '2A',
  'hautecorse': '2B',
  'cotedor': '21',
  'cotesdarmor': '22',
  'creuse': '23',
  'dordogne': '24',
  'doubs': '25',
  'drome': '26',
  'eure': '27',
  'eureetloir': '28',
  'finistere': '29',
  'gard': '30',
  'hautegaronne': '31',
  'gers': '32',
  'gironde': '33',
  'herault': '34',
  'illeetvilaine': '35',
  'indre': '36',
  'indreetloire': '37',
  'isere': '38',
  'jura': '39',
  'landes': '40',
  'loiretcher': '41',
  'loire': '42',
  'hauteloire': '43',
  'loireatlantique': '44',
  'loiret': '45',
  'lot': '46',
  'lotetgaronne': '47',
  'lozere': '48',
  'maineetloire': '49',
  'manche': '50',
  'marne': '51',
  'hautemarne': '52',
  'mayenne': '53',
  'meurtheetmoselle': '54',
  'meuse': '55',
  'morbihan': '56',
  'moselle': '57',
  'nievre': '58',
  'nord': '59',
  'oise': '60',
  'orne': '61',
  'pasdecalais': '62',
  'puydedome': '63',
  'pyreneesatlantiques': '64',
  'hautespyrenees': '65',
  'pyreneesorientales': '66',
  'basrhin': '67',
  'hautrhin': '68',
  'rhone': '69',
  'hautesaone': '70',
  'saoneetloire': '71',
  'sarthe': '72',
  'savoie': '73',
  'hautesavoie': '74',
  'paris': '75',
  'seinemaritime': '76',
  'seineetmarne': '77',
  'yvelines': '78',
  'deuxsevres': '79',
  'somme': '80',
  'tarn': '81',
  'tarnetgaronne': '82',
  'var': '83',
  'vaucluse': '84',
  'vendee': '85',
  'vienne': '86',
  'hautevienne': '87',
  'vosges': '88',
  'yonne': '89',
  'territoiredebelfort': '90',
  'essonne': '91',
  'hautsdeseine': '92',
  'seinesaintdenis': '93',
  'valdemarne': '94',
  'valdoise': '95',
};

// In-memory geocoding cache for client-side queries
const geocodeCache = new Map<string, Coordinates>();

/**
 * Normalizes a place name for lookup (removes accents, hyphens, prefixes, special chars)
 */
export function normalizePlaceName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’\-\/\.]/g, ' ')
    .replace(/\b(ville|commune|lac|plage|spot|base|pole|port)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeRawAlpha(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extracts a 2-digit department number from a string:
 * - "34 - Hérault" -> "34"
 * - "34540" (postal code) -> "34"
 * - "Hérault" or "Pyrénées-Orientales" -> "34" / "66"
 */
export function extractDeptCode(deptStr?: string): string | null {
  if (!deptStr) return null;

  // 5-digit French postal code (e.g. 34540 -> 34, 20000 -> 2A)
  const postalMatch = deptStr.match(/\b((?:0[1-9]|[1-8]\d|9[0-5])\d{3})\b/);
  if (postalMatch) {
    return postalMatch[1].slice(0, 2);
  }
  const corsicaPostal = deptStr.match(/\b(20\d{3})\b/);
  if (corsicaPostal) {
    return Number(corsicaPostal[1]) < 20200 ? '2A' : '2B';
  }

  // Direct 2-digit department code
  const codeMatch = deptStr.match(/\b(0[1-9]|[1-8]\d|9[0-5]|2[abAB])\b/);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }

  // Normalized full department name (e.g. "Hérault", "Pyrénées-Orientales", "Haute-Garonne")
  const norm = normalizeRawAlpha(deptStr);
  if (norm && DEPT_NAME_TO_CODE[norm]) {
    return DEPT_NAME_TO_CODE[norm];
  }
  for (const [nameKey, code] of Object.entries(DEPT_NAME_TO_CODE)) {
    if (nameKey.length >= 4 && norm.includes(nameKey)) {
      return code;
    }
  }

  return null;
}

/**
 * Checks whether a city string directly resolves to a known preset city (not just a department centroid fallback)
 */
export function hasPresetCityCoordinates(cityOrPlace?: string): boolean {
  if (!cityOrPlace) return false;
  const normCity = normalizePlaceName(cityOrPlace);
  if (normCity && PRESET_COORDINATES[normCity]) return true;
  const parts = cityOrPlace.split(/[\/\-,()]/);
  for (const part of parts) {
    const normPart = normalizePlaceName(part);
    if (normPart && PRESET_COORDINATES[normPart]) return true;
  }
  return false;
}

/**
 * Synchronously retrieves coordinates for a city or location.
 * Checks cache, exact dictionary match, safe partial match, location details, or department centroid fallback.
 */
export function getCoordinatesSync(
  cityOrPlace?: string,
  department?: string,
  locationDetails?: string
): Coordinates | null {
  if (!cityOrPlace && !department && !locationDetails) return null;

  // 1. Check in-memory cache
  const fullKey = `${cityOrPlace || ''}_${department || ''}_${locationDetails || ''}`.trim().toLowerCase();
  if (geocodeCache.has(fullKey)) {
    return geocodeCache.get(fullKey)!;
  }
  if (cityOrPlace && geocodeCache.has(cityOrPlace.trim().toLowerCase())) {
    return geocodeCache.get(cityOrPlace.trim().toLowerCase())!;
  }

  // 2. Direct city match in preset dictionary
  if (cityOrPlace) {
    const normCity = normalizePlaceName(cityOrPlace);
    if (normCity && PRESET_COORDINATES[normCity]) {
      return PRESET_COORDINATES[normCity];
    }

    // Try parts (e.g. "Leucate / La Franqui" or "Montpellier (34)" -> check each segment)
    const parts = cityOrPlace.split(/[\/\-,()]/);
    for (const part of parts) {
      const normPart = normalizePlaceName(part);
      if (normPart && PRESET_COORDINATES[normPart]) {
        return PRESET_COORDINATES[normPart];
      }
    }

    // Safe substring lookup (guard against empty/tiny strings causing false positives!)
    if (normCity.length >= 4) {
      let bestKeyLen = 0;
      let bestCoords: Coordinates | null = null;
      for (const [key, coords] of Object.entries(PRESET_COORDINATES)) {
        if (key.length >= 4 && (normCity.includes(key) || key.includes(normCity))) {
          if (key.length > bestKeyLen) {
            bestKeyLen = key.length;
            bestCoords = coords;
          }
        }
      }
      if (bestCoords) return bestCoords;
    }
  }

  // 3. Location details match (e.g. "Lac du Salagou" -> Salagou, or "(34000 Montpellier)")
  if (locationDetails) {
    const normDetails = normalizePlaceName(locationDetails);
    if (normDetails.length >= 4) {
      let bestKeyLen = 0;
      let bestCoords: Coordinates | null = null;
      for (const [key, coords] of Object.entries(PRESET_COORDINATES)) {
        if (key.length >= 4 && normDetails.includes(key) && key.length > bestKeyLen) {
          bestKeyLen = key.length;
          bestCoords = coords;
        }
      }
      if (bestCoords) return bestCoords;
    }
  }

  // 4. Department or postal code centroid fallback (check department, locationDetails, and cityOrPlace)
  const deptCode =
    extractDeptCode(department) ||
    extractDeptCode(locationDetails) ||
    extractDeptCode(cityOrPlace);
  if (deptCode && DEPT_CENTROIDS[deptCode]) {
    return DEPT_CENTROIDS[deptCode];
  }

  // 5. Default to Montpellier/Occitanie core if marked specifically as Occitanie
  if (
    department?.toLowerCase().includes('occitanie') ||
    cityOrPlace?.toLowerCase().includes('occitanie') ||
    locationDetails?.toLowerCase().includes('occitanie')
  ) {
    return PRESET_COORDINATES['montpellier'];
  }

  return null;
}

/**
 * Asynchronously resolves coordinates for any custom city, commune, or address using
 * the official and free French National Address API (api-adresse.data.gouv.fr).
 */
export async function resolveLocationCoordinates(
  query: string
): Promise<{ coordinates: Coordinates; label: string } | null> {
  const clean = query.trim();
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return {
      coordinates: geocodeCache.get(cacheKey)!,
      label: clean,
    };
  }

  // Check exact preset match first
  if (hasPresetCityCoordinates(clean)) {
    const syncCoord = getCoordinatesSync(clean);
    if (syncCoord) {
      return {
        coordinates: syncCoord,
        label: clean,
      };
    }
  }

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(clean)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding API failed');
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const feat = data.features[0];
      const coords: Coordinates = {
        lat: feat.geometry.coordinates[1],
        lng: feat.geometry.coordinates[0],
      };
      if (Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        const label = feat.properties.label || feat.properties.city || clean;
        geocodeCache.set(cacheKey, coords);
        return { coordinates: coords, label };
      }
    }
  } catch {
    // Return sync fallback on failure
  }

  const syncCoord = getCoordinatesSync(clean);
  if (syncCoord) {
    return { coordinates: syncCoord, label: clean };
  }

  return null;
}

/**
 * Calculates Great-Circle / Haversine distance in kilometers between two coordinates.
 */
export function calculateHaversineDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Resolves the reference location's coordinates from user preferences (defaults to Montpellier).
 */
export function getReferenceCoordinates(
  prefs?: Pick<UserPreferences, 'referenceLocation' | 'referenceCoordinates'>
): { name: string; coords: Coordinates } {
  const refName = prefs?.referenceLocation?.trim() || 'Montpellier';

  if (
    prefs?.referenceCoordinates &&
    Number.isFinite(prefs.referenceCoordinates.lat) &&
    Number.isFinite(prefs.referenceCoordinates.lng) &&
    (prefs.referenceCoordinates.lat !== 0 || prefs.referenceCoordinates.lng !== 0)
  ) {
    return {
      name: refName,
      coords: prefs.referenceCoordinates,
    };
  }

  const found = getCoordinatesSync(refName);
  return {
    name: refName,
    coords: found || PRESET_COORDINATES['montpellier'],
  };
}

/**
 * Computes the distance in km between an event and the user's reference location.
 * Returns the distance rounded to the nearest kilometer, or null if coordinates cannot be determined.
 */
export function getEventDistanceKm(
  event: ManifestationEvent,
  referenceLocation?: string,
  referenceCoords?: Coordinates
): number | null {
  let eventCoords: Coordinates | null = null;
  if (
    typeof event.latitude === 'number' &&
    typeof event.longitude === 'number' &&
    Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude) &&
    (event.latitude !== 0 || event.longitude !== 0)
  ) {
    eventCoords = { lat: event.latitude, lng: event.longitude };
  } else {
    eventCoords = getCoordinatesSync(event.city, event.department, event.locationDetails);
  }

  if (!eventCoords) return null;

  let refCoords: Coordinates | null = referenceCoords || null;
  if (
    !refCoords ||
    !Number.isFinite(refCoords.lat) ||
    !Number.isFinite(refCoords.lng)
  ) {
    const resolvedRef = getReferenceCoordinates({
      referenceLocation: referenceLocation || 'Montpellier',
    });
    refCoords = resolvedRef.coords;
  }

  return calculateHaversineDistanceKm(refCoords, eventCoords);
}

/**
 * Formats the event distance into a human-readable string (e.g. "35 km" or "< 1 km").
 */
export function formatEventDistance(
  event: ManifestationEvent,
  referenceLocation?: string,
  referenceCoords?: Coordinates
): string | null {
  const dist = getEventDistanceKm(event, referenceLocation, referenceCoords);
  if (dist === null) return null;
  if (dist < 1) return '< 1 km';
  return `${dist} km`;
}

/**
 * Formats the event distance with reference name (e.g. "35 km de Montpellier").
 */
export function formatEventDistanceWithRef(
  event: ManifestationEvent,
  referenceLocation?: string,
  referenceCoords?: Coordinates
): string | null {
  const distStr = formatEventDistance(event, referenceLocation, referenceCoords);
  if (!distStr) return null;
  const refName = referenceLocation?.trim() || 'Montpellier';
  return `${distStr} de ${refName}`;
}

/**
 * Standard multi-criteria event comparator requested by the user:
 * 1. Date (effective start date ascending)
 * 2. Favori (favorites first)
 * 3. Distance (closest to furthest, missing distance placed last)
 * 4. Title (alphabetical French tie-breaker)
 */
export function compareEventsByDateFavoriteDistance(
  a: ManifestationEvent,
  b: ManifestationEvent,
  todayStr: string,
  referenceLocation?: string,
  referenceCoords?: Coordinates
): number {
  const effA = getEffectiveStartDate(a.startDate, a.endDate, todayStr);
  const effB = getEffectiveStartDate(b.startDate, b.endDate, todayStr);
  const dateCmp = effA.localeCompare(effB);
  if (dateCmp !== 0) return dateCmp;

  const favA = a.status === 'favorite' ? 1 : 0;
  const favB = b.status === 'favorite' ? 1 : 0;
  if (favB !== favA) return favB - favA;

  const distA = getEventDistanceKm(a, referenceLocation, referenceCoords);
  const distB = getEventDistanceKm(b, referenceLocation, referenceCoords);
  const normA = distA !== null ? distA : Number.POSITIVE_INFINITY;
  const normB = distB !== null ? distB : Number.POSITIVE_INFINITY;
  if (normA !== normB) return normA - normB;

  return (a.title || '').localeCompare(b.title || '', 'fr');
}

/**
 * Generates an actionable Google Maps directions URL from reference location to event location.
 */
export function getGoogleMapsDirectionsUrl(
  event: ManifestationEvent,
  referenceLocation: string = 'Montpellier'
): string {
  const origin = referenceLocation.trim() || 'Montpellier';
  const destinationParts = [event.locationDetails, event.city, event.department, 'France'].filter(Boolean);
  const destination = destinationParts.join(', ');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

// Popular reference city presets for instant selection in settings
export const POPULAR_REFERENCE_CITIES = [
  { name: 'Montpellier', dept: '34', coords: PRESET_COORDINATES['montpellier'] },
  { name: 'Nîmes', dept: '30', coords: PRESET_COORDINATES['nimes'] },
  { name: 'Béziers', dept: '34', coords: PRESET_COORDINATES['beziers'] },
  { name: 'Toulouse', dept: '31', coords: PRESET_COORDINATES['toulouse'] },
  { name: 'Sète', dept: '34', coords: PRESET_COORDINATES['sete'] },
  { name: 'Narbonne', dept: '11', coords: PRESET_COORDINATES['narbonne'] },
  { name: 'Perpignan', dept: '66', coords: PRESET_COORDINATES['perpignan'] },
  { name: 'Carcassonne', dept: '11', coords: PRESET_COORDINATES['carcassonne'] },
  { name: 'Alès', dept: '30', coords: PRESET_COORDINATES['ales'] },
  { name: 'Rodez', dept: '12', coords: PRESET_COORDINATES['rodez'] },
  { name: 'Albi', dept: '81', coords: PRESET_COORDINATES['albi'] },
  { name: 'Mende', dept: '48', coords: PRESET_COORDINATES['mende'] },
  { name: 'Paris', dept: '75', coords: PRESET_COORDINATES['paris'] },
];
