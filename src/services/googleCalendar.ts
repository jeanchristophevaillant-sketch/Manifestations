import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ManifestationEvent } from '../types';
import {
  formatIsoDateLocal,
  getLocalTodayStr,
  isOngoingLongEvent,
  parseLocalDate,
} from '../utils/dateFormatting';
import { getEventActionConfig } from '../utils/eventLinks';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Strictly in-memory token cache (never persisted to localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initGoogleCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const signInWithGoogleCalendar = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google Calendar.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getCalendarAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentCalendarUser = (): User | null => {
  return auth.currentUser;
};

export const logoutGoogleCalendar = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut();
};

export interface CalendarEventDraft {
  summary: string;
  startDate: string; // YYYY-MM-DD (inclusive)
  endDateInclusive: string; // YYYY-MM-DD (inclusive)
  endDateExclusive: string; // YYYY-MM-DD (Google Calendar all-day end is exclusive)
  location: string;
  description: string;
  sourceUrl?: string;
  isOngoingLong: boolean;
}

export function buildCalendarEventDraft(
  event: ManifestationEvent,
  now: Date = new Date()
): CalendarEventDraft {
  const rawStart = event.startDate.slice(0, 10);
  const rawEnd = (event.endDate || event.startDate).slice(0, 10);
  const ongoingLong = isOngoingLongEvent(rawStart, rawEnd, now);

  const startDate = ongoingLong ? getLocalTodayStr(now) : rawStart;
  const endDateInclusive = rawEnd >= startDate ? rawEnd : startDate;

  const endParsed = parseLocalDate(endDateInclusive);
  let endDateExclusive = endDateInclusive;
  if (endParsed) {
    const nextDay = new Date(
      endParsed.getFullYear(),
      endParsed.getMonth(),
      endParsed.getDate() + 1,
      12,
      0,
      0,
      0
    );
    endDateExclusive = formatIsoDateLocal(nextDay);
  }

  const location = [event.locationDetails, event.city, event.department]
    .filter(Boolean)
    .join(', ');

  const actionConfig = getEventActionConfig(event);
  const descLines = [
    event.category ? `Catégorie : ${event.category}` : '',
    event.description || '',
    event.practicalInfo?.schedule ? `Horaires : ${event.practicalInfo.schedule}` : '',
    event.practicalInfo?.priceOrRegistration
      ? `Tarifs / Inscriptions : ${event.practicalInfo.priceOrRegistration}`
      : '',
    event.practicalInfo?.organizer ? `Organisateur : ${event.practicalInfo.organizer}` : '',
    actionConfig.sourceUrl ? `Lien officiel : ${actionConfig.sourceUrl}` : '',
  ].filter(Boolean);

  return {
    summary: event.title,
    startDate,
    endDateInclusive,
    endDateExclusive,
    location,
    description: descLines.join('\n\n'),
    sourceUrl: actionConfig.sourceUrl,
    isOngoingLong: ongoingLong,
  };
}

export interface CalendarInsertResult {
  id: string;
  htmlLink?: string;
}

export async function insertEventToGoogleCalendar(
  event: ManifestationEvent
): Promise<CalendarInsertResult> {
  const accessToken = await getCalendarAccessToken();
  if (!accessToken) {
    const err = new Error('AUTH_REQUIRED');
    throw err;
  }

  const draft = buildCalendarEventDraft(event);

  const payload: Record<string, unknown> = {
    summary: draft.summary,
    location: draft.location || undefined,
    description: draft.description,
    start: { date: draft.startDate },
    end: { date: draft.endDateExclusive },
  };

  if (draft.sourceUrl) {
    payload.source = {
      title: event.sourceName || 'Site officiel',
      url: draft.sourceUrl,
    };
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error?.message || `Erreur Google Calendar (HTTP ${res.status})`
    );
  }

  return {
    id: data.id,
    htmlLink: data.htmlLink,
  };
}
