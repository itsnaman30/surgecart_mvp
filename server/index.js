const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const trackStore = require('./services/trackStore');
const pollingEngine = require('./services/pollingEngine');
const smsService = require('./services/smsService');
const notificationRoutes = require('./routes/notificationRoutes');
const waitlistRoutes = require('./routes/waitlist');
const authRoutes = require('./routes/auth');
const wishlistRoutesFactory = require('./routes/wishlist');
const dashboardRoutes = require('./routes/dashboard');
const { buildDemandAnalytics } = require('./services/demandAnalytics');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use('/api/dashboard', dashboardRoutes);
const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === CLIENT_ORIGIN) return true;
  return LOCAL_DEV_ORIGIN.test(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));

// Log incoming requests (method + path). Keep concise to aid debugging.
app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.path}`);
  next();
});

// Parse JSON bodies. body-parser/express.json will throw on invalid JSON —
// add an error handler below to convert that into a 400 with a helpful message.
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.removeHeader('X-XSS-Protection');
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/wishlist', wishlistRoutesFactory(io));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: trackStore.isMemoryMode() ? 'memory' : 'mongodb',
    metrics: pollingEngine.getMetrics(),
    pollingIntervalMs: pollingEngine.getGlobalPollingInterval(),
  });
});

app.get('/api/metrics', (req, res) => {
  res.json(pollingEngine.getMetrics());
});

// Serve built client assets when running in production or with a static build.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Centralized error handler for body parse errors and unexpected exceptions.
// Must be added after routes are declared; we'll add a lightweight catcher at
// the end of the file so malformed JSON returns 400 and other errors return 500.

app.get('/api/analytics/demand', async (req, res) => {
  const tracks = await trackStore.findAll();
  const analytics = buildDemandAnalytics({
    tracks,
    lastSurgeLevel: pollingEngine.getMetrics().lastSurgeLevel,
  });

  res.json(analytics);
});

app.get('/api/tracks', async (req, res) => {
  try {
    const tracks = await trackStore.findAll();
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load watches' });
  }
});

app.post('/api/tracks', async (req, res) => {
  try {
    const { platform, location, latitude, longitude, phoneNumber, userId, pollingIntervalMs } = req.body;

    if (!platform || !location?.trim()) {
      return res.status(400).json({ error: 'Platform and location are required.' });
    }
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'GPS coordinates are required.' });
    }

    const normalizedPhone = smsService.normalizePhoneNumber(phoneNumber || '');
    if (normalizedPhone) {
      smsService.registerPhoneNumber(normalizedPhone);
    }

    const track = await trackStore.create({
      platform,
      location: location.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      phoneNumber: normalizedPhone || '',
      userId,
      pollingIntervalMs: pollingIntervalMs || pollingEngine.getGlobalPollingInterval(),
    });

    pollingEngine.startTrackPolling(io, track);
    console.log(`[track] Created watch: ${platform} @ ${location}`);
    res.status(201).json(track);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to create watch' });
  }
});

app.patch('/api/tracks/:id', async (req, res) => {
  try {
    const { status, pollingIntervalMs } = req.body;
    const track = await trackStore.findById(req.params.id);
    if (!track) return res.status(404).json({ error: 'Watch not found' });

    const updates = {};
    if (status) updates.status = status;
    if (pollingIntervalMs) updates.pollingIntervalMs = pollingIntervalMs;

    const updated = await trackStore.updateById(req.params.id, updates);

    if (status === 'Paused' || status === 'Notified' || status === 'Expired') {
      pollingEngine.stopTrackPolling(req.params.id);
    } else if (status === 'Tracking') {
      pollingEngine.startTrackPolling(io, updated);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watch' });
  }
});

app.delete('/api/tracks/:id', async (req, res) => {
  try {
    pollingEngine.stopTrackPolling(req.params.id);
    const removed = await trackStore.removeById(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Watch not found' });
    res.json({ message: 'Watch removed', track: removed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete watch' });
  }
});

app.post('/api/test/simulate-slot/:id', async (req, res) => {
  try {
    const updated = await trackStore.updateById(req.params.id, {
      status: 'Notified',
      lastResult: 'Test slot — manual simulation',
      surgeLevel: 'low',
    });
    if (!updated) return res.status(404).json({ error: 'Watch not found' });
    pollingEngine.stopTrackPolling(req.params.id);
    io.emit('slot_update', updated);
    void smsService.sendSlotOpenAlert(updated, {
      checkoutUrl: updated.checkoutUrl || 'https://blinkit.com/',
    });
    res.json({ message: 'Simulated slot alert', updatedTrack: updated });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

app.patch('/api/settings/polling-interval', (req, res) => {
  const { intervalMs } = req.body;
  const allowed = [5000, 30000, 120000];
  if (!allowed.includes(intervalMs)) {
    return res.status(400).json({ error: 'Invalid interval. Use 5000, 30000, or 120000.' });
  }
  pollingEngine.setGlobalPollingInterval(intervalMs);
  res.json({ intervalMs });
});

io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  socket.emit('system_metrics_update', pollingEngine.getMetrics());

  socket.on('force_manual_ping', async (trackId) => {
    await pollingEngine.handleManualPing(trackId);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/surgecart';

function bootServer() {
  smsService.loadRegisteredTargets();
  pollingEngine.setSmsTargets(smsService.getRegisteredTargets());

  pollingEngine.bootstrapActiveTracks(io).then(() => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[server] Port ${PORT} is already in use. Stop the other process or set PORT in .env`);
        process.exit(1);
      }
      throw err;
    });

    server.listen(PORT, () => {
      console.log(`🚀 SurgeCart running on port ${PORT}`);
      console.log(`   Mode: ${trackStore.isMemoryMode() ? 'in-memory' : 'MongoDB'}`);
      console.log(`   Polling: every ${pollingEngine.getGlobalPollingInterval() / 1000}s`);
    });
  });
}

if (mongoURI.includes('mongodb+srv') && process.env.IGNORE_ATLAS_ERRORS === 'true') {
  console.log('[db] Atlas bypass — using in-memory store');
  trackStore.setMemoryMode(true);
  bootServer();
} else {
  mongoose.connect(mongoURI)
    .then(() => {
      console.log('[db] Connected to MongoDB');
      bootServer();
    })
    .catch((err) => {
      console.error('[db] Connection failed:', err.message);
      console.log('[db] Falling back to in-memory store');
      trackStore.setMemoryMode(true);
      bootServer();
    });
}

// Error handler for JSON parse errors and generic exceptions. This should be
// the last middleware so it catches errors thrown by body parsing or routes.
app.use((err, req, res, next) => {
  // Body parser (express.json) throws a SyntaxError for invalid JSON.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[error] Invalid JSON payload:', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Log stack for any other unhandled error and return a 500.
  console.error('[error] Unhandled exception:', err && (err.stack || err.message || err));
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});
