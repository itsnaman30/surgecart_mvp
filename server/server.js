const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');
const { startTrackPolling } = require('./services/pollingEngine');
const { requireAuth } = require('./middleware/auth');
const { getPlanLimit, normalizePlan } = require('./services/planService');

const app = express();
app.use(cors());
app.use(express.json());

// Bind Device Registration Routing Modules
app.use('/api/notifications', notificationRoutes);

// Per-user lifetime scan counters (free users get 3 total lifetime scans)
// Deleting a watch does NOT decrement this counter for free users.
const userScanCounts = {};

// In-memory track store (per-user)
let systemTracks = [];

// ✨ Extract user from JWT for non-auth-required contexts
function extractUserId(req) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(parts[1], process.env.JWT_SECRET || 'surgecart-dev-secret');
      return payload.id;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Let components pull the active system queues state matrix (filtered per-user)
app.get('/api/tracks', (req, res) => {
  const userId = extractUserId(req) || 'local-user';
  const userTracks = systemTracks.filter(t => t.userId === userId);
  res.json(userTracks);
});

// Create a new track with plan limit enforcement
app.post('/api/tracks', (req, res) => {
  const userId = extractUserId(req) || 'local-user';
  const plan = normalizePlan(req.body.plan || 'free');

  // Initialize scan counter for this user
  if (!userScanCounts[userId]) {
    userScanCounts[userId] = 0;
  }

  // Plan limit: free users = 3 LIFETIME scans (deleting does NOT restore)
  const maxScans = getPlanLimit(plan); // 3 for free, 50 for pro
  if (userScanCounts[userId] >= maxScans) {
    return res.status(403).json({
      error: `Your ${plan} plan allows ${maxScans} lifetime scans. You've used all ${maxScans}. Upgrade to Pro for unlimited scans.`,
      scansUsed: userScanCounts[userId],
      scansLimit: maxScans,
      plan,
    });
  }

  const { platform, location, phoneNumber, latitude, longitude } = req.body;
  
  if (!platform || !location || !latitude || !longitude) {
    return res.status(400).json({ 
      error: "Missing required tracking parameters. Ensure telemetry coordinates are synced." 
    });
  }

  const newTrack = {
    _id: Math.random().toString(36).substr(2, 9),
    platform,
    location,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    phoneNumber: phoneNumber || '',
    userId,
    status: 'Tracking',
    checkCount: 0,
    lastCheckedAt: null,
    lastResult: 'Watch deployed — scanning now',
    surgeLevel: 'unknown',
    checkoutUrl: '',
    createdAt: new Date().toISOString(),
  };

  // Increment lifetime counter BEFORE creating track (non-refundable for free)
  userScanCounts[userId]++;

  systemTracks.unshift(newTrack);

  // Deploy the background daemon thread using actual high-fidelity coordinates
  startTrackPolling(ioInstance, newTrack);

  res.status(201).json({ ...newTrack, scansUsed: userScanCounts[userId], scansLimit: maxScans });
});

// PATCH: update track (pause/resume/status)
app.patch('/api/tracks/:id', (req, res) => {
  const userId = extractUserId(req) || 'local-user';
  const idx = systemTracks.findIndex(t => t._id === req.params.id && t.userId === userId);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });

  const updates = req.body;
  systemTracks[idx] = { ...systemTracks[idx], ...updates };
  res.json(systemTracks[idx]);
});

// DELETE: remove a track (does NOT restore scan slot for free users)
app.delete('/api/tracks/:id', (req, res) => {
  const userId = extractUserId(req) || 'local-user';
  const idx = systemTracks.findIndex(t => t._id === req.params.id && t.userId === userId);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });

  const removed = systemTracks.splice(idx, 1)[0];

  // NOTE: For free users, we do NOT decrement userScanCounts[userId]
  // The lifetime scans are consumed permanently.

  res.json({ message: 'Watch removed', removed, scansUsed: userScanCounts[userId] || 0 });
});

// GET: return scan usage info for the current user
app.get('/api/tracks/usage', (req, res) => {
  const userId = extractUserId(req) || 'local-user';
  const plan = normalizePlan(req.query.plan || 'free');
  const maxScans = getPlanLimit(plan);
  const used = userScanCounts[userId] || 0;
  res.json({ scansUsed: used, scansLimit: maxScans, plan, remaining: Math.max(0, maxScans - used) });
});

const server = http.createServer(app);
const ioInstance = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

ioInstance.on('connection', (socket) => {
  console.log(`📡 Telemetry client attached node: ${socket.id}`);
});

server.listen(5000, () => console.log('🚀 SurgeCart Automated Processing Grid Online on Port 5000'));