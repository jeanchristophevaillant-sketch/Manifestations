import { ManifestationEvent, UserPreferences, ScanHistoryRecord } from '../types';
import { inferDisciplineCategory } from '../utils/categories';

const DB_NAME = 'veille_manifestations_db';
const DB_VERSION = 1;

export const DEFAULT_PREFERENCES: UserPreferences = {
  interests: [
    {
      id: 'vtt',
      name: 'VTT & Mountain Bike',
      category: 'Sports & Plein air',
      enabled: true,
      keywords: ['VTT', 'rando VTT', 'enduro', 'cross-country', 'gravel', 'raid VTT', 'FFVélo', 'FFC'],
    },
    {
      id: 'windfoil',
      name: 'Windfoil & Planche à voile',
      category: 'Sports nautiques',
      enabled: true,
      keywords: ['windfoil', 'foil', 'windsurf', 'planche à voile', 'FFVoile', 'Défi Wind', 'slalom foil'],
    },
    {
      id: 'wingfoil',
      name: 'Wingfoil & Wing',
      category: 'Sports nautiques',
      enabled: true,
      keywords: ['wingfoil', 'wing foil', 'wing', 'GWA', 'rassemblement wing', 'Défi Wing', 'downwind foil'],
    },
    {
      id: 'voile_regates',
      name: 'Voile & Régates',
      category: 'Sports nautiques',
      enabled: true,
      keywords: ['voile', 'régate', 'catamaran', 'dériveur', 'habitable', 'FFVoile', 'salon nautique', 'nautique'],
    },
    {
      id: 'trail_outdoor',
      name: 'Trail & Randonnée nature',
      category: 'Sports & Plein air',
      enabled: true,
      keywords: ['trail', 'ultra-trail', 'course nature', 'randonnée', 'marche nordique', 'marathon'],
    },
    {
      id: 'festivals_musique',
      name: 'Festivals & Concerts',
      category: 'Culture & Musique',
      enabled: true,
      keywords: ['festival', 'concert', 'musique vivante', 'scène musicale', 'jazz', 'festival été'],
    },
    {
      id: 'patrimoine_terroir',
      name: 'Fêtes du terroir & Gastronomie',
      category: 'Patrimoine & Terroir',
      enabled: true,
      keywords: ['fête du terroir', 'foire artisanale', 'fête des vendanges', 'marché de producteurs', 'médiévale', 'fête gourmande'],
    },
    {
      id: 'theatre_arts',
      name: 'Théâtre & Arts de la rue',
      category: 'Culture & Spectacles',
      enabled: true,
      keywords: ['théâtre', 'arts de rue', 'spectacle vivant', 'cirque contemporain', 'danse'],
    },
    {
      id: 'sciences_nature',
      name: 'Sciences, Nature & Ciel étoilé',
      category: 'Sciences & Nature',
      enabled: true,
      keywords: ['fête de la science', 'astronomie', 'nuit des étoiles', 'biodiversité', 'conférence nature'],
    },
    {
      id: 'brocantes_collections',
      name: 'Brocantes, Antiquités & Salons',
      category: 'Loisirs & Vie locale',
      enabled: true,
      keywords: ['brocante', 'vide-greniers', 'antiquités', 'salon du livre', 'marché aux puces'],
    }
  ],
  customTargetSites: [
    {
      id: 'site_tourisme_occitanie',
      name: 'Tourisme Occitanie (Portail Régional des Manifestations)',
      url: 'https://www.tourisme-occitanie.com',
      notes: 'Agenda officiel des fêtes, festivals et animations régionales',
      enabled: true,
    },
    {
      id: 'site_herault_tourisme',
      name: 'Hérault Tourisme (Agenda départemental 34)',
      url: 'https://www.herault-tourisme.com',
      notes: 'Agenda touristique et culturel de l’Hérault',
      enabled: true,
    },
    {
      id: 'site_gard_tourisme',
      name: 'Gard Tourisme (Agenda 30)',
      url: 'https://www.tourismegard.com/agenda/',
      notes: 'Manifestations gardoises, cévenoles et côtières',
      enabled: true,
    },
    {
      id: 'site_openagenda',
      name: 'OpenAgenda France / Occitanie',
      url: 'https://openagenda.com',
      notes: 'Flux ouvert d’événements associatifs, culturels et sportifs',
      enabled: true,
    }
  ],
  geographicZones: [
    {
      id: 'occitanie',
      name: 'Occitanie (Prioritaire & Approfondi)',
      isPrimary: true,
      subRegionsOrDepts: ['Hérault (34)', 'Gard (30)', 'Aude (11)', 'Pyrénées-Orientales (66)', 'Haute-Garonne (31)', 'Lozère (48)', 'Aveyron (12)', 'Tarn (81)'],
      enabled: true,
    },
    {
      id: 'france',
      name: 'France entière (Événements majeurs)',
      isPrimary: false,
      subRegionsOrDepts: ['PACA', 'Nouvelle-Aquitaine', 'Bretagne', 'Auvergne-Rhône-Alpes'],
      enabled: true,
    }
  ],
  geographicFocusText: "France avec un approfondissement sur l'Occitanie",
  selectedDepartments: [
    '34 - Hérault',
    '11 - Aude',
    '30 - Gard',
    '66 - Pyrénées-Orientales',
    '31 - Haute-Garonne',
    '48 - Lozère',
    '12 - Aveyron',
    '81 - Tarn'
  ],
  frequencyLabel: "Mise à jour quotidienne en tâche de fond à chaque fois que je lance l'application",
  timeHorizonMonths: 6,
  autoScanOnLaunch: true,
  scanFrequencyDays: 1,
  lastScanTimestamp: null,
  selectedView: 'report',
  filterCategory: 'all',
  filterRegion: 'all',
  filterTimeWindow: 'all',
  searchQuery: '',
  referenceLocation: 'Montpellier',
  referenceCoordinates: { lat: 43.6108, lng: 3.8767 },
  hideLongDurationEvents: false,
};

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.init();
  }

  private init(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('events')) {
            const eventStore = db.createObjectStore('events', { keyPath: 'id' });
            eventStore.createIndex('startDate', 'startDate', { unique: false });
            eventStore.createIndex('category', 'category', { unique: false });
            eventStore.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('preferences')) {
            db.createObjectStore('preferences', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('history')) {
            db.createObjectStore('history', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB error, falling back to localStorage');
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });
  }

  // --- EVENTS ---

  async getEvents(): Promise<ManifestationEvent[]> {
    const db = await this.dbPromise;
    if (!db) {
      const raw = localStorage.getItem(`${DB_NAME}_events`);
      return raw ? JSON.parse(raw) : [];
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async saveEvents(events: ManifestationEvent[]): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      localStorage.setItem(`${DB_NAME}_events`, JSON.stringify(events));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        store.clear();
        for (const ev of events) {
          store.put(ev);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async updateEvent(event: ManifestationEvent): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      const events = await this.getEvents();
      const idx = events.findIndex(e => e.id === event.id);
      if (idx !== -1) {
        events[idx] = event;
      } else {
        events.push(event);
      }
      localStorage.setItem(`${DB_NAME}_events`, JSON.stringify(events));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        store.put(event);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async deleteEvent(id: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      const events = (await this.getEvents()).filter(e => e.id !== id);
      localStorage.setItem(`${DB_NAME}_events`, JSON.stringify(events));
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearEvents(): Promise<void> {
    const db = await this.dbPromise;
    localStorage.removeItem(`${DB_NAME}_events`);
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('events', 'readwrite');
          const store = tx.objectStore('events');
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  // --- PREFERENCES ---

  async getPreferences(): Promise<UserPreferences> {
    const db = await this.dbPromise;
    let saved: UserPreferences | null = null;
    if (!db) {
      const raw = localStorage.getItem(`${DB_NAME}_prefs`);
      saved = raw ? JSON.parse(raw) : null;
    } else {
      saved = await new Promise((resolve) => {
        try {
          const tx = db.transaction('preferences', 'readonly');
          const store = tx.objectStore('preferences');
          const req = store.get('user_settings');
          req.onsuccess = () => {
            if (req.result && req.result.value) {
              resolve(req.result.value);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    if (!saved) return DEFAULT_PREFERENCES;

    // Merge in any newly introduced default categories (Culture, Terroir, Sciences, Voile, etc.)
    // so returning users aren't locked into old settings
    const existingIds = new Set(saved.interests.map(i => i.id));
    const mergedInterests = saved.interests.map(item => ({
      ...item,
      category: inferDisciplineCategory(item.name, item.category),
    }));
    for (const defInt of DEFAULT_PREFERENCES.interests) {
      if (!existingIds.has(defInt.id)) {
        mergedInterests.push(defInt);
      }
    }

    // Merge in default custom target sites if missing
    const existingSiteIds = new Set((saved.customTargetSites || []).map(s => s.id));
    const mergedSites = [...(saved.customTargetSites || [])];
    for (const defSite of (DEFAULT_PREFERENCES.customTargetSites || [])) {
      if (!existingSiteIds.has(defSite.id)) {
        mergedSites.push(defSite);
      }
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...saved,
      interests: mergedInterests,
      customTargetSites: mergedSites,
    };
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      localStorage.setItem(`${DB_NAME}_prefs`, JSON.stringify(prefs));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('preferences', 'readwrite');
        const store = tx.objectStore('preferences');
        store.put({ key: 'user_settings', value: prefs });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- SCAN HISTORY ---

  async getScanHistory(): Promise<ScanHistoryRecord[]> {
    const db = await this.dbPromise;
    if (!db) {
      const raw = localStorage.getItem(`${DB_NAME}_history`);
      return raw ? JSON.parse(raw) : [];
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const req = store.getAll();
        req.onsuccess = () => {
          const list: ScanHistoryRecord[] = req.result || [];
          // sort descending
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async addScanRecord(record: ScanHistoryRecord): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      const history = await this.getScanHistory();
      history.unshift(record);
      localStorage.setItem(`${DB_NAME}_history`, JSON.stringify(history.slice(0, 50)));
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    localStorage.removeItem(`${DB_NAME}_events`);
    localStorage.removeItem(`${DB_NAME}_prefs`);
    localStorage.removeItem(`${DB_NAME}_history`);
    if (db) {
      const tx = db.transaction(['events', 'preferences', 'history'], 'readwrite');
      tx.objectStore('events').clear();
      tx.objectStore('preferences').clear();
      tx.objectStore('history').clear();
    }
  }
}

export const dbService = new LocalDatabase();
