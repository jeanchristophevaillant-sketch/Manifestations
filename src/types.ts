export type EventCategory = 
  | 'VTT' 
  | 'windfoil' 
  | 'wingfoil' 
  | 'trail' 
  | 'sports_outdoor' 
  | 'nautique' 
  | 'culture_spectacle' 
  | 'festival_musique' 
  | 'patrimoine_terroir' 
  | 'sciences_nature' 
  | 'loisirs_fetes' 
  | string;

export type DetailLevel = 'high' | 'medium' | 'low';

export type EventStatus = 'new' | 'viewed' | 'favorite' | 'hidden';

export type SourceType = 
  | 'federation' 
  | 'tourism_office' 
  | 'specialized_site' 
  | 'search_engine' 
  | 'event_platform'
  | 'ticketmaster'
  | 'openagenda'
  | 'official_site'
  | 'custom_target_site';

export interface PracticalInfo {
  schedule?: string;
  priceOrRegistration?: string;
  organizer?: string;
  difficultyOrFormat?: string;
  conditionsOrSpot?: string;
  contactEmailOrPhone?: string;
  ticketingUrl?: string;
}

export interface ManifestationEvent {
  id: string; // unique hash
  title: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  city: string;
  department?: string; // e.g. "34 - Hérault"
  region: string; // e.g. "Occitanie", "France"
  locationDetails?: string; // e.g. "Lac du Salagou (Rive Clermont-l'Hérault)"
  latitude?: number;
  longitude?: number;
  description: string;
  detailLevel: DetailLevel; // high for weeks 1-4, medium for months 2-3, low for months 4-6
  practicalInfo: PracticalInfo;
  sourceName: string; // e.g. "FFVélo Occitanie", "Office de Tourisme de Leucate"
  sourceUrl?: string;
  imageUrl?: string; // Promotional image from official site or OpenAgenda/Ticketmaster
  ticketUrl?: string; // Direct ticketing or registration URL when available
  sourceType: SourceType;
  firstDiscoveredAt: string; // ISO string
  lastVerifiedAt: string; // ISO string
  status: EventStatus;
  similarityHash: string; // used for smart deduplication
  relevanceScore?: number; // 0 to 100
}

export interface InterestItem {
  id: string;
  name: string;
  category: string; // e.g. 'Sports & Plein air', 'Culture & Festivals', 'Patrimoine & Terroir', 'Sciences & Savoirs', etc.
  enabled: boolean;
  keywords: string[];
  isCustom?: boolean;
}

export interface CustomTargetSite {
  id: string;
  name: string;
  url: string;
  notes?: string;
  enabled: boolean;
}

export interface GeographicZone {
  id: string;
  name: string;
  isPrimary: boolean; // e.g. Occitanie = true
  subRegionsOrDepts: string[];
  enabled: boolean;
}

export interface ScanHistoryRecord {
  id: string;
  timestamp: string; // ISO string
  eventsFoundCount: number;
  newEventsCount: number;
  duplicatesPreventedCount: number;
  durationMs: number;
  sourcesConsulted: string[];
  summary: string;
}

export interface UserPreferences {
  interests: InterestItem[];
  customTargetSites?: CustomTargetSite[];
  geographicZones: GeographicZone[];
  geographicFocusText?: string;
  selectedDepartments?: string[];
  frequencyLabel?: string;
  timeHorizonMonths: number; // default 6
  autoScanOnLaunch: boolean;
  scanFrequencyDays: number; // 1 = daily
  lastScanTimestamp: string | null;
  selectedView: 'report' | 'timeline' | 'all' | 'favorites' | 'settings';
  filterCategory: string;
  filterRegion: string;
  filterTimeWindow: 'all' | '1month' | '3months' | '6months';
  searchQuery: string;
  ticketmasterApiKey?: string;
  enableTicketmasterApi?: boolean;
  enableOpenAgendaApi?: boolean;
  filterSource?: string;
  referenceLocation?: string; // e.g. "Montpellier" - reference city or address to compute distances
  referenceCoordinates?: { lat: number; lng: number }; // resolved coordinates for referenceLocation
  hideLongDurationEvents?: boolean; // hide events lasting > 3 days (e.g. exhibitions) to declutter views
}
