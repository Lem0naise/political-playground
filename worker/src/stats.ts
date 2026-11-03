import type { Env } from './env';

interface SummaryRow {
  total: number;
  active: number;
  starts: number;
  saves: number;
  loads: number;
  terms: number;
}

interface NewPlayersRow {
  day: string;
  visitors: number;
}

interface DailyRow {
  day: string;
  total: number;
  active: number;
}

interface TopRow {
  label: string;
  starts: number;
  saves: number;
}

interface ComboRow {
  country: string;
  party: string;
  starts: number;
  saves: number;
}

interface VersionRow {
  version: string;
  players: number;
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export interface AnalyticsStats {
  days: number;
  since: string;
  generatedAt: string;
  summary: {
    events: number;
    activePlayers: number;
    campaignStarts: number;
    saves: number;
    loads: number;
    termsStarted: number;
    saveRate: number;
    startToSaveRate: number;
  };
  newPlayersByDay: Array<{ day: string; visitors: number }>;
  daily: Array<{ day: string; events: number; activePlayers: number }>;
  countries: Array<{ country: string; starts: number; saves: number }>;
  parties: Array<{ party: string; starts: number; saves: number }>;
  combos: Array<{ country: string; party: string; starts: number; saves: number }>;
  versions: Array<{ version: string; players: number }>;
}

/**
 * All aggregates are computed in D1. `saveRate` is the share of all events
 * that were saves; `startToSaveRate` is saves divided by campaign starts, so
 * values above 1 mean the same campaign was saved more than once.
 */
export async function getStats(db: D1Database, days: number): Promise<AnalyticsStats> {
  const sinceEpoch = Math.floor(Date.now() / 1000) - days * 86400;
  const since = new Date(sinceEpoch * 1000).toISOString();

  const [summaryResult, newPlayersResult, dailyResult, countriesResult, partiesResult, combosResult, versionsResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT
             COUNT(*) AS total,
             COUNT(DISTINCT visitor_id) AS active,
             SUM(CASE WHEN event = 'campaign_start' THEN 1 ELSE 0 END) AS starts,
             SUM(CASE WHEN event = 'save' THEN 1 ELSE 0 END) AS saves,
             SUM(CASE WHEN event = 'save_load' THEN 1 ELSE 0 END) AS loads,
             SUM(CASE WHEN event = 'term_start' THEN 1 ELSE 0 END) AS terms
           FROM events
           WHERE received_at >= ?`
        )
        .bind(sinceEpoch)
        .first<SummaryRow>(),
      db
        .prepare(
          `SELECT day, COUNT(*) AS visitors
           FROM (
             SELECT visitor_id, MIN(date(received_at, 'unixepoch')) AS day
             FROM events
             WHERE received_at >= ?
             GROUP BY visitor_id
           )
           GROUP BY day
           ORDER BY day ASC`
        )
        .bind(sinceEpoch)
        .all<NewPlayersRow>(),
      db
        .prepare(
          `SELECT date(received_at, 'unixepoch') AS day,
                  COUNT(*) AS total,
                  COUNT(DISTINCT visitor_id) AS active
           FROM events
           WHERE received_at >= ?
           GROUP BY day
           ORDER BY day ASC`
        )
        .bind(sinceEpoch)
        .all<DailyRow>(),
      db
        .prepare(
          `SELECT country AS label,
                  SUM(CASE WHEN event = 'campaign_start' THEN 1 ELSE 0 END) AS starts,
                  SUM(CASE WHEN event = 'save' THEN 1 ELSE 0 END) AS saves
           FROM events
           WHERE received_at >= ? AND country IS NOT NULL
           GROUP BY country
           ORDER BY starts DESC, saves DESC
           LIMIT 12`
        )
        .bind(sinceEpoch)
        .all<TopRow>(),
      db
        .prepare(
          `SELECT party AS label,
                  SUM(CASE WHEN event = 'campaign_start' THEN 1 ELSE 0 END) AS starts,
                  SUM(CASE WHEN event = 'save' THEN 1 ELSE 0 END) AS saves
           FROM events
           WHERE received_at >= ? AND party IS NOT NULL
           GROUP BY party
           ORDER BY starts DESC, saves DESC
           LIMIT 12`
        )
        .bind(sinceEpoch)
        .all<TopRow>(),
      db
        .prepare(
          `SELECT country, party,
                  SUM(CASE WHEN event = 'campaign_start' THEN 1 ELSE 0 END) AS starts,
                  SUM(CASE WHEN event = 'save' THEN 1 ELSE 0 END) AS saves
           FROM events
           WHERE received_at >= ? AND country IS NOT NULL AND party IS NOT NULL
           GROUP BY country, party
           ORDER BY starts DESC, saves DESC
           LIMIT 15`
        )
        .bind(sinceEpoch)
        .all<ComboRow>(),
      db
        .prepare(
          `SELECT COALESCE(version, 'unknown') AS version, COUNT(DISTINCT visitor_id) AS players
           FROM events
           WHERE received_at >= ?
           GROUP BY version
           ORDER BY players DESC
           LIMIT 8`
        )
        .bind(sinceEpoch)
        .all<VersionRow>(),
    ]);

  const summary = summaryResult;
  const events = number(summary?.total);
  const starts = number(summary?.starts);
  const saves = number(summary?.saves);

  return {
    days,
    since,
    generatedAt: new Date().toISOString(),
    summary: {
      events,
      activePlayers: number(summary?.active),
      campaignStarts: starts,
      saves,
      loads: number(summary?.loads),
      termsStarted: number(summary?.terms),
      saveRate: events === 0 ? 0 : saves / events,
      startToSaveRate: starts === 0 ? 0 : saves / starts,
    },
    newPlayersByDay: newPlayersResult.results.map((row) => ({
      day: row.day,
      visitors: number(row.visitors),
    })),
    daily: dailyResult.results.map((row) => ({
      day: row.day,
      events: number(row.total),
      activePlayers: number(row.active),
    })),
    countries: countriesResult.results.map((row) => ({
      country: row.label,
      starts: number(row.starts),
      saves: number(row.saves),
    })),
    parties: partiesResult.results.map((row) => ({
      party: row.label,
      starts: number(row.starts),
      saves: number(row.saves),
    })),
    combos: combosResult.results.map((row) => ({
      country: row.country,
      party: row.party,
      starts: number(row.starts),
      saves: number(row.saves),
    })),
    versions: versionsResult.results.map((row) => ({
      version: row.version,
      players: number(row.players),
    })),
  };
}

export async function pruneOldEvents(db: D1Database, retentionDays = 365): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
  const result = await db.prepare('DELETE FROM events WHERE received_at < ?').bind(cutoff).run();
  return result.meta.changes ?? 0;
}

export type { Env };
