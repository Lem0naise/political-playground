import { VERSION } from './version';

/**
 * Privacy-preserving, fire-and-forget gameplay analytics.
 *
 * The endpoint is optional: if `VITE_ANALYTICS_URL` is unset the module is a
 * no-op. Visitor IDs are random and stored in localStorage; session IDs live
 * in sessionStorage. No IP address, user agent, leader name, save file, or game
 * state is sent. DNT and the local opt-out flag stop all requests.
 */

const VISITOR_KEY = 'pp.analytics.visitor';
const SESSION_KEY = 'pp.analytics.session';
const OPT_OUT_KEY = 'pp.analytics.optout';
const ENDPOINT = (import.meta.env.VITE_ANALYTICS_URL ?? '').trim().replace(/\/+$/, '');

export type AnalyticsEventName =
  | 'campaign_launch'
  | 'campaign_start'
  | 'save'
  | 'save_load'
  | 'term_start'
  | 'session_start'
  | 'election_result';

export interface AnalyticsProperties {
  country?: string;
  party?: string;
  partyList?: string;
  week?: number;
  totalPolls?: number;
  phase?: string;
  customParty?: boolean;
}

function readStorage(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Private mode or a full quota; analytics must never break the game.
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getVisitorId(): string {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
  const existing = readStorage(storage, VISITOR_KEY);
  if (existing) return existing;
  const id = newId();
  writeStorage(storage, VISITOR_KEY, id);
  return id;
}

function getSessionId(): string {
  const storage = typeof window !== 'undefined' ? window.sessionStorage : undefined;
  const existing = readStorage(storage, SESSION_KEY);
  if (existing) return existing;
  const id = newId();
  writeStorage(storage, SESSION_KEY, id);
  return id;
}

export function analyticsBlockedByDnt(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  return nav.doNotTrack === '1' || nav.msDoNotTrack === '1';
}

export function analyticsOptedOut(): boolean {
  if (typeof window === 'undefined') return true;
  return readStorage(window.localStorage, OPT_OUT_KEY) === '1';
}

export function setAnalyticsOptedOut(optedOut: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (optedOut) {
      window.localStorage.setItem(OPT_OUT_KEY, '1');
    } else {
      window.localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(ENDPOINT);
}

export function isAnalyticsEnabled(): boolean {
  return isAnalyticsConfigured() && !analyticsOptedOut() && !analyticsBlockedByDnt();
}

/** Send one gameplay event. Never throws and never blocks the caller. */
export function track(event: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (!isAnalyticsEnabled()) return;

  try {
    const payload = {
      v: 1,
      event,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      version: VERSION,
      ...properties,
    };
    void fetch(`${ENDPOINT}/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      keepalive: true,
    }).catch(() => {
      // Analytics is best-effort; network failures are intentionally silent.
    });
  } catch {
    // Ignore serialization/storage errors.
  }
}
