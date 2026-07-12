const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');
const { startTrackPolling } = require('./services/pollingEngine');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json());

// Bind Device Registration Routing Modules
app.use('/api/notifications', notificationRoutes);

// Shared runtime application database emulation
let systemTracks = [
  { _id: '1', platform: 'Zepto', location: 'T-Nagar, Chennai', status: 'Scanning' },
  { _id: '2', platform: 'Blinkit', location: 'Adyar Cluster', status: 'Notified' }
];

// Let components pull the active system queues state matrix
app.get('/api/tracks', (req, res) => {
  res.json(systemTracks);
});

// 🚀 NEW: Endpoint handling incoming target trackers from the dashboard form
// Upgraded Tracking Route handling exact GPS floats
app.post('/api/tracks', (req, res) => {
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
    status: 'Scanning',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  systemTracks.unshift(newTrack);

  // Deploy the background daemon thread using actual high-fidelity coordinates
  startTrackPolling(ioInstance, newTrack);

  res.status(201).json(newTrack);
});

const server = http.createServer(app);
const ioInstance = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] }
});

ioInstance.on('connection', (socket) => {
  console.log(`📡 Telemetry client attached node: ${socket.id}`);
});

server.listen(5000, () => console.log('🚀 SurgeCart Automated Processing Grid Online on Port 5000'));