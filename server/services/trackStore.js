const mongoose = require('mongoose');
const sqlite = require('../db/sqlite');

const TrackSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  phoneNumber: { type: String, default: '' },
  userId: { type: String, default: 'local-user' },
  status: { type: String, enum: ['Tracking', 'Paused', 'Notified', 'Expired'], default: 'Tracking' },
  pollingIntervalMs: { type: Number, default: 30000 },
  checkCount: { type: Number, default: 0 },
  lastCheckedAt: { type: Date, default: null },
  lastResult: { type: String, default: null },
  surgeLevel: { type: String, default: 'unknown' },
  checkoutUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const Track = mongoose.model('Track', TrackSchema);

let useInMemoryDB = false;
let memoryDB = [];
const USE_SQLITE = process.env.USE_SQLITE !== 'false';

const MAX_WATCHES = 3;

function setMemoryMode(enabled) {
  useInMemoryDB = enabled;
  if (enabled && USE_SQLITE) {
    sqlite.seedDefaultTrackIfEmpty();
    return;
  }
  if (enabled && memoryDB.length === 0) {
    memoryDB = [
      {
        _id: 'seed-1',
        platform: 'Blinkit',
        location: 'Adyar, Chennai',
        latitude: 13.0067,
        longitude: 80.2574,
        phoneNumber: '',
        userId: 'local-user',
        status: 'Tracking',
        pollingIntervalMs: 30000,
        checkCount: 12,
        lastCheckedAt: new Date(),
        lastResult: 'Peak surge active — slots heavily constrained',
        surgeLevel: 'high',
        checkoutUrl: 'https://blinkit.com/',
        createdAt: new Date(Date.now() - 3600000),
      },
    ];
  }
}

function isMemoryMode() {
  return useInMemoryDB;
}

function makeId() {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function countActive() {
  if (useInMemoryDB && USE_SQLITE) {
    return sqlite.countActiveTracks();
  }
  if (useInMemoryDB) {
    return memoryDB.filter((t) => t.status === 'Tracking').length;
  }
  return Track.countDocuments({ status: 'Tracking' });
}

async function findAll() {
  if (useInMemoryDB && USE_SQLITE) {
    return sqlite.findAllTracks();
  }
  if (useInMemoryDB) {
    return [...memoryDB].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return Track.find().sort({ createdAt: -1 });
}

async function findById(id) {
  if (useInMemoryDB && USE_SQLITE) {
    return sqlite.findTrackById(id);
  }
  if (useInMemoryDB) {
    return memoryDB.find((t) => t._id === id) || null;
  }
  return Track.findById(id);
}

async function findTracking() {
  if (useInMemoryDB && USE_SQLITE) {
    return sqlite.findTrackingTracks();
  }
  if (useInMemoryDB) {
    return memoryDB.filter((t) => t.status === 'Tracking');
  }
  return Track.find({ status: 'Tracking' });
}

async function create(data) {
  const all = await findAll();
  if (all.length >= MAX_WATCHES) {
    const err = new Error(`Beta limit: maximum ${MAX_WATCHES} watches. Remove one to add another.`);
    err.status = 400;
    throw err;
  }

  const payload = {
    platform: data.platform,
    location: data.location,
    latitude: data.latitude,
    longitude: data.longitude,
    phoneNumber: data.phoneNumber || '',
    userId: data.userId || 'local-user',
    status: 'Tracking',
    pollingIntervalMs: data.pollingIntervalMs || 30000,
    checkCount: 0,
    lastCheckedAt: null,
    lastResult: 'Watch deployed — scanning now',
    surgeLevel: 'unknown',
    checkoutUrl: '',
    createdAt: new Date(),
  };

  if (useInMemoryDB) {
    if (USE_SQLITE) {
      return sqlite.createTrack(payload);
    }
    const track = { _id: makeId(), ...payload };
    memoryDB.unshift(track);
    return track;
  }

  const track = new Track(payload);
  await track.save();
  return track;
}

async function updateById(id, updates) {
  if (useInMemoryDB && USE_SQLITE) {
    return sqlite.updateTrackById(id, updates);
  }
  if (useInMemoryDB) {
    const idx = memoryDB.findIndex((t) => t._id === id);
    if (idx === -1) return null;
    memoryDB[idx] = { ...memoryDB[idx], ...updates };
    return memoryDB[idx];
  }
  return Track.findByIdAndUpdate(id, updates, { new: true });
}

async function removeById(id) {
  if (useInMemoryDB && USE_SQLITE) {
    return sqlite.removeTrackById(id);
  }
  if (useInMemoryDB) {
    const idx = memoryDB.findIndex((t) => t._id === id);
    if (idx === -1) return null;
    const [removed] = memoryDB.splice(idx, 1);
    return removed;
  }
  return Track.findByIdAndDelete(id);
}

module.exports = {
  Track,
  setMemoryMode,
  isMemoryMode,
  MAX_WATCHES,
  countActive,
  findAll,
  findById,
  findTracking,
  create,
  updateById,
  removeById,
};
