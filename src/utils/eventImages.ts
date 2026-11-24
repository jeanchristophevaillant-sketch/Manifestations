import { ManifestationEvent } from '../types';

import imgSportsNautiques from '../assets/images/theme_sports_nautiques_1795436857279.jpg';
import imgVoileRegat from '../assets/images/theme_voile_regat_1795436876724.jpg';
import imgVttCyclisme from '../assets/images/theme_vtt_cyclisme_1795436857015.jpg';
import imgTrailRunning from '../assets/images/theme_trail_running_1795436856645.jpg';
import imgRandonneePleinAir from '../assets/images/theme_randonnee_plein_air_1795436856286.jpg';
import imgSportsCompetitions from '../assets/images/theme_sports_competitions_1795436856075.jpg';
import imgCultureMusique from '../assets/images/theme_culture_musique_1795436856401.jpg';
import imgCultureSpectacles from '../assets/images/theme_culture_spectacles_1795436876861.jpg';
import imgPatrimoineTerroir from '../assets/images/theme_patrimoine_terroir_1795436878415.jpg';
import imgSciencesNature from '../assets/images/theme_sciences_nature_1795436877699.jpg';
import imgLoisirsLocal from '../assets/images/theme_loisirs_local_1795436878562.jpg';

export interface ThemeVisual {
  src: string;
  alt: string;
  themeLabel: string;
}

const REJECTED_REMOTE_IMAGE_PATTERN =
  /(\blogo\b|logo[-_.]|[-_]logo|logotype|brand|signature|favicon|avatar|spinner|placeholder|sprite|1x1|pixel|blank\.gif|spacer|badge|widget|adserver|doubleclick|blason|armoiries|coat[-_ ]of[-_ ]arms|flag[-_ ]of|drapeau|locator[-_ ]map|-position\.|carte[-_ ]|map[-_ ]|\.svg(\.|\/|\?|$)|\.ico(\.|\/|\?|$))/i;

export function isValidRemoteImageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (REJECTED_REMOTE_IMAGE_PATTERN.test(trimmed)) return false;
  return true;
}

/**
 * Resolves the tailored thematic illustration matching an event's category and subject.
 * Used whenever no official promotional photo was extracted from the source site (or as error fallback).
 */
export function getThematicIllustration(
  event: Pick<ManifestationEvent, 'title' | 'category' | 'description'>
): ThemeVisual {
  const cat = (event.category || '').toLowerCase();
  const fullText = `${event.title || ''} ${event.description || ''}`.toLowerCase();

  // Distinguish foil/glisse vs classic sailboats/regattas inside Sports nautiques
  if (
    cat.includes('nautique') ||
    cat.includes('voile') ||
    cat.includes('wind') ||
    cat.includes('wing')
  ) {
    const isFoilOrGlisse = /\b(windfoil|wingfoil|wing[- ]foil|iqfoil|windsurf|planche à voile|funboard|kitesurf|kitefoil|paddle|défi wind|défi wing|mondial du vent)\b/i.test(
      fullText
    );
    if (isFoilOrGlisse) {
      return {
        src: imgSportsNautiques,
        alt: 'Illustration sports nautiques de glisse (windfoil et wingfoil)',
        themeLabel: 'Glisse & Foil',
      };
    }
    return {
      src: imgVoileRegat,
      alt: 'Illustration voile et régates en Méditerranée',
      themeLabel: 'Voile & Nautisme',
    };
  }

  if (cat.includes('vtt') || cat.includes('cyclisme')) {
    return {
      src: imgVttCyclisme,
      alt: 'Illustration VTT et cyclisme sur sentiers côtiers',
      themeLabel: 'VTT & Cyclisme',
    };
  }

  if (cat.includes('trail') || cat.includes('course')) {
    return {
      src: imgTrailRunning,
      alt: 'Illustration trail et course en nature',
      themeLabel: 'Trail & Running',
    };
  }

  if (cat.includes('randonnée') || cat.includes('plein air')) {
    return {
      src: imgRandonneePleinAir,
      alt: 'Illustration randonnée et plein air',
      themeLabel: 'Plein air & Rando',
    };
  }

  if (cat.includes('compétition') || cat.includes('tennis') || cat.includes('sports')) {
    return {
      src: imgSportsCompetitions,
      alt: 'Illustration compétition sportive',
      themeLabel: 'Compétition sportive',
    };
  }

  if (cat.includes('musique') || cat.includes('concert') || cat.includes('festival')) {
    return {
      src: imgCultureMusique,
      alt: 'Illustration concert et festival en plein air',
      themeLabel: 'Musique & Festival',
    };
  }

  if (cat.includes('spectacle') || cat.includes('théâtre') || cat.includes('culture')) {
    return {
      src: imgCultureSpectacles,
      alt: 'Illustration spectacle vivant et théâtre',
      themeLabel: 'Spectacles & Culture',
    };
  }

  if (cat.includes('patrimoine') || cat.includes('terroir') || cat.includes('médiéval')) {
    return {
      src: imgPatrimoineTerroir,
      alt: 'Illustration patrimoine historique et terroir',
      themeLabel: 'Patrimoine & Terroir',
    };
  }

  if (cat.includes('sciences') || cat.includes('nature') || cat.includes('astronomie')) {
    return {
      src: imgSciencesNature,
      alt: 'Illustration sciences, astronomie et nature',
      themeLabel: 'Sciences & Nature',
    };
  }

  return {
    src: imgLoisirsLocal,
    alt: 'Illustration loisirs, marchés et vie locale',
    themeLabel: 'Loisirs & Vie locale',
  };
}
