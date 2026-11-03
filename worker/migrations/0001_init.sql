-- Player analytics events. Visitor IDs are random client-generated UUIDs;
-- no IP address, user agent, or game leader name is stored.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Unix seconds. Kept as an integer so SQLite can index and range-filter it.
  received_at INTEGER NOT NULL,
  event TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL DEFAULT 'unknown',
  country TEXT,
  party TEXT,
  party_list TEXT,
  week INTEGER,
  total_polls INTEGER,
  version TEXT,
  custom_party INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_received_at ON events (received_at);
CREATE INDEX IF NOT EXISTS idx_events_event_received ON events (event, received_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor_received ON events (visitor_id, received_at);
CREATE INDEX IF NOT EXISTS idx_events_country_received ON events (country, received_at);
