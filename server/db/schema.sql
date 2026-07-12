CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Unknown',
  title TEXT NOT NULL,
  product_id TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  monitor INTEGER NOT NULL DEFAULT 0,
  desired_price REAL,
  checkout_url TEXT NOT NULL DEFAULT '',
  last_seen_price REAL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_created
ON wishlist_items (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  phone_number TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL DEFAULT 'local-user',
  status TEXT NOT NULL DEFAULT 'Tracking',
  polling_interval_ms INTEGER NOT NULL DEFAULT 30000,
  check_count INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  last_result TEXT,
  surge_level TEXT NOT NULL DEFAULT 'unknown',
  checkout_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracks_status_created
ON tracks (status, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_id TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  result TEXT,
  surge_level TEXT NOT NULL DEFAULT 'unknown',
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_targets (
  phone_number TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
