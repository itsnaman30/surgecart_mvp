const path = require('path');
const sqlite = require('../db/sqlite');
const { makeId } = require('../utils/id');
const { readJsonFile, writeJsonFile } = require('../utils/jsonStore');

const DATA_FILE = path.join(__dirname, '..', 'data', 'wishlist.json');
const USE_SQLITE = process.env.USE_SQLITE !== 'false';

function readAll() {
  return readJsonFile(DATA_FILE, []);
}

function writeAll(arr) {
  writeJsonFile(DATA_FILE, arr);
}

async function findByUser(userId) {
  if (USE_SQLITE) {
    return sqlite.findWishlistByUser(userId);
  }
  const all = readAll();
  return all.filter((i) => i.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createForUser(userId, payload) {
  if (USE_SQLITE) {
    return sqlite.createWishlistForUser(userId, payload);
  }
  const all = readAll();
  const item = {
    id: makeId('wl'),
    userId,
    platform: payload.platform || 'Unknown',
    title: payload.title || payload.productName || 'Saved item',
    productId: payload.productId || '',
    url: payload.url || '',
    location: payload.location || '',
    latitude: payload.latitude == null ? null : Number(payload.latitude),
    longitude: payload.longitude == null ? null : Number(payload.longitude),
    monitor: !!payload.monitor,
    desiredPrice: payload.desiredPrice == null ? null : Number(payload.desiredPrice),
    checkoutUrl: payload.checkoutUrl || payload.url || '',
    lastSeenPrice: payload.lastSeenPrice == null ? null : Number(payload.lastSeenPrice),
    createdAt: new Date().toISOString(),
  };
  all.push(item);
  writeAll(all);
  return item;
}

async function removeById(id, userId) {
  if (USE_SQLITE) {
    return sqlite.removeWishlistById(id, userId);
  }
  const all = readAll();
  const idx = all.findIndex((i) => i.id === id && i.userId === userId);
  if (idx === -1) return null;
  const [removed] = all.splice(idx, 1);
  writeAll(all);
  return removed;
}

module.exports = { findByUser, createForUser, removeById };
