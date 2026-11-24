import { CustomTargetSite, InterestItem, UserPreferences } from '../types';
import { inferDisciplineCategory } from './categories';
import { resolveLocationCoordinates } from './distance';

export interface SettingsBackupPayload {
  app: string;
  version: number;
  exportDate: string;
  preferences: UserPreferences;
  ticketmasterApiKey?: string;
}

export function exportPreferencesToFile(prefs: UserPreferences): void {
  const tmKey = localStorage.getItem('user_ticketmaster_api_key') || '';
  const payload: SettingsBackupPayload = {
    app: 'VeilleManifestations',
    version: 1,
    exportDate: new Date().toISOString(),
    preferences: prefs,
    ...(tmKey ? { ticketmasterApiKey: tmKey } : {}),
  };

  const dataStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `veille-manifestations-parametres-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportedSettingsResult {
  preferences: UserPreferences;
  ticketmasterApiKey?: string;
  stats: {
    interestsCount: number;
    sitesCount: number;
    departmentsCount: number;
  };
}

export async function parseImportedSettingsJson(
  rawText: string,
  currentFallback: UserPreferences
): Promise<ImportedSettingsResult> {
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Le fichier JSON ne contient pas un objet de configuration valide.');
  }

  // Support both wrapped { preferences: {...} } and direct UserPreferences objects
  const candidate: any = parsed.preferences && typeof parsed.preferences === 'object' ? parsed.preferences : parsed;

  const hasKnownKey =
    Array.isArray(candidate.interests) ||
    Array.isArray(candidate.customTargetSites) ||
    Array.isArray(candidate.selectedDepartments) ||
    typeof candidate.referenceLocation === 'string' ||
    typeof candidate.timeHorizonMonths === 'number';

  if (!hasKnownKey) {
    throw new Error('Ce fichier JSON ne correspond pas à une sauvegarde de paramètres de l’application.');
  }

  const interests: InterestItem[] = Array.isArray(candidate.interests)
    ? candidate.interests
        .filter((item: any) => item && typeof item.name === 'string' && item.name.trim().length > 0)
        .map((item: any, idx: number) => ({
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `imp_${Date.now()}_${idx}`,
          name: item.name.trim(),
          category: inferDisciplineCategory(item.name.trim(), typeof item.category === 'string' ? item.category : undefined),
          enabled: item.enabled !== false,
          keywords: Array.isArray(item.keywords)
            ? item.keywords.map((k: any) => String(k).trim()).filter(Boolean)
            : [item.name.trim().toLowerCase()],
          isCustom: Boolean(item.isCustom),
        }))
    : currentFallback.interests;

  const customTargetSites: CustomTargetSite[] = Array.isArray(candidate.customTargetSites)
    ? candidate.customTargetSites
        .filter((site: any) => site && typeof site.url === 'string' && site.url.trim().length > 0)
        .map((site: any, idx: number) => {
          let url = site.url.trim();
          if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
          return {
            id: typeof site.id === 'string' && site.id.trim() ? site.id.trim() : `site_imp_${Date.now()}_${idx}`,
            name: typeof site.name === 'string' && site.name.trim() ? site.name.trim() : url,
            url,
            enabled: site.enabled !== false,
            notes: typeof site.notes === 'string' && site.notes.trim() ? site.notes.trim() : undefined,
          };
        })
    : currentFallback.customTargetSites || [];

  const selectedDepartments: string[] = Array.isArray(candidate.selectedDepartments)
    ? candidate.selectedDepartments.map((d: any) => String(d).trim()).filter(Boolean)
    : currentFallback.selectedDepartments;

  const geographicFocusText =
    typeof candidate.geographicFocusText === 'string' && candidate.geographicFocusText.trim()
      ? candidate.geographicFocusText.trim()
      : currentFallback.geographicFocusText;

  const referenceLocation =
    typeof candidate.referenceLocation === 'string' && candidate.referenceLocation.trim()
      ? candidate.referenceLocation.trim()
      : currentFallback.referenceLocation;

  let referenceCoordinates = currentFallback.referenceCoordinates;
  if (
    candidate.referenceCoordinates &&
    typeof candidate.referenceCoordinates.lat === 'number' &&
    typeof candidate.referenceCoordinates.lng === 'number'
  ) {
    referenceCoordinates = {
      lat: candidate.referenceCoordinates.lat,
      lng: candidate.referenceCoordinates.lng,
    };
  } else if (referenceLocation) {
    const resolved = await resolveLocationCoordinates(referenceLocation);
    if (resolved) {
      referenceCoordinates = resolved.coordinates;
    }
  }

  const timeHorizonMonths =
    typeof candidate.timeHorizonMonths === 'number' && candidate.timeHorizonMonths >= 1 && candidate.timeHorizonMonths <= 24
      ? Math.round(candidate.timeHorizonMonths)
      : currentFallback.timeHorizonMonths;

  const autoScanOnLaunch =
    typeof candidate.autoScanOnLaunch === 'boolean' ? candidate.autoScanOnLaunch : currentFallback.autoScanOnLaunch;

  const hideLongDurationEvents =
    typeof candidate.hideLongDurationEvents === 'boolean'
      ? candidate.hideLongDurationEvents
      : currentFallback.hideLongDurationEvents;

  const nextPreferences: UserPreferences = {
    ...currentFallback,
    interests,
    customTargetSites,
    selectedDepartments,
    geographicFocusText,
    referenceLocation,
    referenceCoordinates,
    timeHorizonMonths,
    autoScanOnLaunch,
    hideLongDurationEvents,
    lastScanTimestamp:
      typeof candidate.lastScanTimestamp === 'string' ? candidate.lastScanTimestamp : currentFallback.lastScanTimestamp,
  };

  const ticketmasterApiKey =
    typeof parsed.ticketmasterApiKey === 'string' && parsed.ticketmasterApiKey.trim()
      ? parsed.ticketmasterApiKey.trim()
      : undefined;

  return {
    preferences: nextPreferences,
    ticketmasterApiKey,
    stats: {
      interestsCount: interests.length,
      sitesCount: customTargetSites.length,
      departmentsCount: selectedDepartments.length,
    },
  };
}
