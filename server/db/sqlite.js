const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'surgecart.db');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const WISHLIST_JSON = path.join(DATA_DIR, 'wishlist.json');
const SMS_TARGETS_JSON = path.join(DATA_DIR, 'sms-targets.json');

let db;

function requireDriver() {
  try {
    return require('better-sqlite3');
  } catch (err) {
    err.message = 'SQLite driver missing. Run "npm install" inside server, then restart. Original error: ' + err.message;
    throw err;
  }
}

function openDb() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const Database = requireDriver();
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  db.exec(schema);
  migrateJsonSeeds(db);
  return db;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || JSON.stringify(fallback));
  } catch (err) {
    return fallback;
  }
}

function migrateJsonSeeds(database) {
  const wishlistCount = database.prepare('SELECT COUNT(*) AS count FROM wishlist_items').get().count;
  if (wishlistCount === 0) {
    const items = readJson(WISHLIST_JSON, []);
    const insertWishlist = database.prepare(`
      INSERT OR IGNORE INTO wishlist_items (
        id, user_id, platform, title, product_id, url, location, latitude, longitude,
        monitor, desired_price, checkout_url, last_seen_price, created_at
      ) VALUES (
        @id, @user_id, @platform, @title, @product_id, @url, @location, @latitude, @longitude,
        @monitor, @desired_price, @checkout_url, @last_seen_price, @created_at
      )
    `);

    const importWishlist = database.transaction((rows) => {
      rows.forEach((item) => {
        insertWishlist.run({
          id: item.id || makeId('wl'),
          user_id: item.userId || item.user_id || 'local-user',
          platform: item.platform || 'Unknown',
          title: item.title || item.productName || 'Saved item',
          product_id: item.productId || item.product_id || '',
          url: item.url || '',
          location: item.location || '',
          latitude: item.latitude == null ? null : Number(item.latitude),
          longitude: item.longitude == null ? null : Number(item.longitude),
          monitor: item.monitor ? 1 : 0,
          desired_price: item.desiredPrice == null ? null : Number(item.desiredPrice),
          checkout_url: item.checkoutUrl || item.checkout_url || item.url || '',
          last_seen_price: item.lastSeenPrice == null ? null : Number(item.lastSeenPrice),
          created_at: item.createdAt || item.created_at || new Date().toISOString(),
        });
      });
    });
    importWishlist(items);
  }

  const smsCount = database.prepare('SELECT COUNT(*) AS count FROM sms_targets').get().count;
  if (smsCount === 0) {
    const targets = readJson(SMS_TARGETS_JSON, []);
    const insertTarget = database.prepare('INSERT OR IGNORE INTO sms_targets (phone_number, created_at) VALUES (?, ?)');
    const importTargets = database.transaction((rows) => {
      rows.forEach((phoneNumber) => {
        if (typeof phoneNumber === 'string' && phoneNumber.trim()) {
          insertTarget.run(phoneNumber.trim(), new Date().toISOString());
        }
      });
    });
    importTargets(targets);
  }
}

function toWishlistItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    title: row.title,
    productId: row.product_id,
    url: row.url,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    monitor: !!row.monitor,
    desiredPrice: row.desired_price,
    checkoutUrl: row.checkout_url,
    lastSeenPrice: row.last_seen_price,
    createdAt: row.created_at,
  };
}

function toTrack(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    platform: row.platform,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    phoneNumber: row.phone_number,
    userId: row.user_id,
    status: row.status,
    pollingIntervalMs: row.polling_interval_ms,
    checkCount: row.check_count,
    lastCheckedAt: row.last_checked_at ? new Date(row.last_checked_at) : null,
    lastResult: row.last_result,
    surgeLevel: row.surge_level,
    checkoutUrl: row.checkout_url,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

function findWishlistByUser(userId) {
  return openDb()
    .prepare('SELECT * FROM wishlist_items WHERE user_id = ? ORDER BY datetime(created_at) DESC')
    .all(userId)
    .map(toWishlistItem);
}

function createWishlistForUser(userId, payload) {
  const item = {
    id: makeId('wl'),
    user_id: userId,
    platform: payload.platform || 'Unknown',
    title: payload.title || payload.productName || 'Saved item',
    product_id: payload.productId || '',
    url: payload.url || '',
    location: payload.location || '',
    latitude: payload.latitude == null ? null : Number(payload.latitude),
    longitude: payload.longitude == null ? null : Number(payload.longitude),
    monitor: payload.monitor ? 1 : 0,
    desired_price: payload.desiredPrice == null ? null : Number(payload.desiredPrice),
    checkout_url: payload.checkoutUrl || payload.url || '',
    last_seen_price: payload.lastSeenPrice == null ? null : Number(payload.lastSeenPrice),
    created_at: new Date().toISOString(),
  };

  openDb().prepare(`
    INSERT INTO wishlist_items (
      id, user_id, platform, title, product_id, url, location, latitude, longitude,
      monitor, desired_price, checkout_url, last_seen_price, created_at
    ) VALUES (
      @id, @user_id, @platform, @title, @product_id, @url, @location, @latitude, @longitude,
      @monitor, @desired_price, @checkout_url, @last_seen_price, @created_at
    )
  `).run(item);

  return toWishlistItem({
    ...item,
    monitor: item.monitor,
  });
}

function removeWishlistById(id, userId) {
  const database = openDb();
  const row = database.prepare('SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) return null;
  database.prepare('DELETE FROM wishlist_items WHERE id = ? AND user_id = ?').run(id, userId);
  return toWishlistItem(row);
}

function countActiveTracks() {
  return openDb().prepare("SELECT COUNT(*) AS count FROM tracks WHERE status = 'Tracking'").get().count;
}

function findAllTracks() {
  return openDb()
    .prepare('SELECT * FROM tracks ORDER BY datetime(created_at) DESC')
    .all()
    .map(toTrack);
}

function findTrackById(id) {
  return toTrack(openDb().prepare('SELECT * FROM tracks WHERE id = ?').get(id));
}

function findTrackingTracks() {
  return openDb()
    .prepare("SELECT * FROM tracks WHERE status = 'Tracking' ORDER BY datetime(created_at) DESC")
    .all()
    .map(toTrack);
}

function createTrack(data) {
  const track = {
    id: makeId('trk'),
    platform: data.platform,
    location: data.location,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    phone_number: data.phoneNumber || '',
    user_id: data.userId || 'local-user',
    status: 'Tracking',
    polling_interval_ms: data.pollingIntervalMs || 30000,
    check_count: 0,
    last_checked_at: null,
    last_result: 'Watch deployed - scanning now',
    surge_level: 'unknown',
    checkout_url: '',
    created_at: new Date().toISOString(),
  };

  openDb().prepare(`
    INSERT INTO tracks (
      id, platform, location, latitude, longitude, phone_number, user_id, status,
      polling_interval_ms, check_count, last_checked_at, last_result, surge_level,
      checkout_url, created_at
    ) VALUES (
      @id, @platform, @location, @latitude, @longitude, @phone_number, @user_id, @status,
      @polling_interval_ms, @check_count, @last_checked_at, @last_result, @surge_level,
      @checkout_url, @created_at
    )
  `).run(track);

  return findTrackById(track.id);
}

function updateTrackById(id, updates) {
  const current = findTrackById(id);
  if (!current) return null;

  const next = {
    status: updates.status ?? current.status,
    polling_interval_ms: updates.pollingIntervalMs ?? current.pollingIntervalMs,
    check_count: updates.checkCount ?? current.checkCount,
    last_checked_at: updates.lastCheckedAt ? new Date(updates.lastCheckedAt).toISOString() : (current.lastCheckedAt ? current.lastCheckedAt.toISOString() : null),
    last_result: updates.lastResult ?? current.lastResult,
    surge_level: updates.surgeLevel ?? current.surgeLevel,
    checkout_url: updates.checkoutUrl ?? current.checkoutUrl,
    id,
  };

  openDb().prepare(`
    UPDATE tracks
    SET status = @status,
        polling_interval_ms = @polling_interval_ms,
        check_count = @check_count,
        last_checked_at = @last_checked_at,
        last_result = @last_result,
        surge_level = @surge_level,
        checkout_url = @checkout_url
    WHERE id = @id
  `).run(next);

  return findTrackById(id);
}

function removeTrackById(id) {
  const track = findTrackById(id);
  if (!track) return null;
  openDb().prepare('DELETE FROM tracks WHERE id = ?').run(id);
  return track;
}

function seedDefaultTrackIfEmpty() {
  const count = openDb().prepare('SELECT COUNT(*) AS count FROM tracks').get().count;
  if (count > 0) return;
  createTrack({
    platform: 'Blinkit',
    location: 'Adyar, Chennai',
    latitude: 13.0067,
    longitude: 80.2574,
    phoneNumber: '',
    userId: 'local-user',
    pollingIntervalMs: 30000,
  });
  const seeded = findAllTracks()[0];
  if (seeded) {
    updateTrackById(seeded._id, {
      checkCount: 12,
      lastCheckedAt: new Date(),
      lastResult: 'Peak surge active - slots heavily constrained',
      surgeLevel: 'high',
      checkoutUrl: 'https://blinkit.com/',
    });
  }
}

module.exports = {
  DB_FILE,
  openDb,
  findWishlistByUser,
  createWishlistForUser,
  removeWishlistById,
  countActiveTracks,
  findAllTracks,
  findTrackById,
  findTrackingTracks,
  createTrack,
  updateTrackById,
  removeTrackById,
  seedDefaultTrackIfEmpty,
};
