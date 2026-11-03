import type { Env } from './env';

export const ALLOWED_EVENTS = [
  'campaign_launch',
  'campaign_start',
  'save',
  'save_load',
  'term_start',
  'session_start',
  'election_result',
] as const;

export type AnalyticsEvent = (typeof ALLOWED_EVENTS)[number];

const ALLOWED_EVENT_SET = new Set<string>(ALLOWED_EVENTS);

const COUNTRY_REQUIRED: AnalyticsEvent[] = ['campaign_launch', 'campaign_start', 'save', 'term_start'];
const PARTY_REQUIRED: AnalyticsEvent[] = ['campaign_start', 'save', 'term_start'];

const MAX_BATCH = 20;
const MAX_BODY_BYTES = 4096;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export interface IngestRow {
  event: AnalyticsEvent;
  visitorId: string;
  sessionId: string;
  country: string | null;
  party: string | null;
  partyList: string | null;
  week: number | null;
  totalPolls: number | null;
  version: string | null;
  customParty: number;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function integer(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= min && rounded <= max ? rounded : null;
}

export function parsePayload(input: unknown): { rows: IngestRow[]; errors: string[] } {
  const errors: string[] = [];
  const list = Array.isArray(input) ? input : [input];
  if (list.length === 0) return { rows: [], errors: ['empty payload'] };
  if (list.length > MAX_BATCH) return { rows: [], errors: ['too many events'] };

  const rows: IngestRow[] = [];

  list.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`event ${index}: not an object`);
      return;
    }

    const raw = item as Record<string, unknown>;
    const event = typeof raw.event === 'string' ? raw.event : '';
    if (!ALLOWED_EVENT_SET.has(event)) {
      errors.push(`event ${index}: unknown or missing event name`);
      return;
    }

    const visitorId = typeof raw.visitorId === 'string' ? raw.visitorId : '';
    if (!ID_RE.test(visitorId)) {
      errors.push(`event ${index}: invalid visitorId`);
      return;
    }

    const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
    if (sessionId && !ID_RE.test(sessionId)) {
      errors.push(`event ${index}: invalid sessionId`);
      return;
    }

    const typed = event as AnalyticsEvent;
    const country = text(raw.country, 60);
    const party = text(raw.party, 80);
    if (COUNTRY_REQUIRED.includes(typed) && !country) {
      errors.push(`event ${index}: country required for ${typed}`);
      return;
    }
    if (PARTY_REQUIRED.includes(typed) && !party) {
      errors.push(`event ${index}: party required for ${typed}`);
      return;
    }

    rows.push({
      event: typed,
      visitorId,
      sessionId: sessionId || 'unknown',
      country,
      party,
      partyList: text(raw.partyList, 80),
      week: integer(raw.week, 0, 10000),
      totalPolls: integer(raw.totalPolls, 1, 10000),
      version: text(raw.version, 20),
      customParty: raw.customParty === true ? 1 : 0,
    });
  });

  return { rows, errors };
}

export async function handleIngest(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const { rows, errors } = parsePayload(parsed);
  if (errors.length > 0) {
    return json({ error: 'invalid event', details: errors.slice(0, 5) }, 400);
  }

  const receivedAt = Math.floor(Date.now() / 1000);
  const statement = env.DB.prepare(
    `INSERT INTO events
      (received_at, event, visitor_id, session_id, country, party, party_list, week, total_polls, version, custom_party)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  await env.DB.batch(
    rows.map((row) =>
      statement.bind(
        receivedAt,
        row.event,
        row.visitorId,
        row.sessionId,
        row.country,
        row.party,
        row.partyList,
        row.week,
        row.totalPolls,
        row.version,
        row.customParty
      )
    )
  );

  return new Response(null, { status: 204 });
}

export function json(body: unknown, status = 200, headers?: Headers): Response {
  const responseHeaders = headers ?? new Headers();
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}
