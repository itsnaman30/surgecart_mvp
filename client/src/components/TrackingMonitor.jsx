import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../config';

// Hook cleanly into our backend socket server instance
const socket = io(API_URL);

const TrackingMonitor = () => {
  const [tracks, setTracks] = useState([]);
  const [logs, setLogs] = useState({}); // Stores array dictionaries mapped per tracking card ID

  useEffect(() => {
    // Pull the active matrix on initial panel mount load
    axios.get(`${API_URL}/api/tracks`)
      .then(res => setTracks(res.data))
      .catch(err => console.error("Could not reach telemetry service layers:", err));

    // Listen for state mutations (Tracking -> Notified)
    socket.on('slot_update', (updatedTrack) => {
      setTracks(prev => prev.map(t => t._id === updatedTrack._id ? updatedTrack : t));
    });

    // ⚡ NEW: Intercept real-time micro-operation footprints from the headless runner
    socket.on('engine_trace', (data) => {
      const { trackId, message, timestamp } = data;
      setLogs(prev => ({
        ...prev,
        [trackId]: [...(prev[trackId] || []).slice(-4), `[${timestamp}] ${message}`] // Restrict to the 5 most recent activities
      }));
    });

    return () => {
      socket.off('slot_update');
      socket.off('engine_trace');
    };
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>SurgeCart Processing Grid</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {tracks.map((track) => (
          <div key={track._id} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            {/* Upper Telemetry Metrics Layout Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', trackingLetter: '0.05em', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
                  {track.platform}
                </span>
                <span style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>{track.location}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: track.status === 'Notified' ? '#16a34a' : '#2563eb' }}>
                ● {track.status === 'Notified' ? 'SLOT OPENED' : 'LIVE MONITORING'}
              </span>
            </div>

            {/* 📟 THE LIVE BACKEND TERMINAL SIMULATOR LOOK */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '16px', fontFamily: '"Fira Code", monospace', fontSize: '12px', color: '#38bdf8', minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: '6px' }}>
              {(logs[track._id] || []).length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>⏳ Initializing background socket handshake line...</div>
              ) : (
                logs[track._id].map((log, idx) => (
                  <div key={idx} style={{ color: log.includes('SUCCESS') ? '#4ade80' : log.includes('⏱️') ? '#94a3b8' : '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log}
                  </div>
                ))
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackingMonitor;