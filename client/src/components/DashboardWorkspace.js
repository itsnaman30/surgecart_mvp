import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../config';

const socket = io(API_URL);

const DashboardWorkspace = () => {
  const [tracks, setTracks] = useState([]);
  const [logs, setLogs] = useState({});
  const [globalStats, setGlobalStats] = useState({ totalRequests: 0, activeDaemons: 0, averageLatency: 340, bypassRate: 100 });
  const [jitterLatency, setJitterLatency] = useState(340);
  const [isWaveBursting, setIsWaveBursting] = useState(false);
  const [burstLatency, setBurstLatency] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/tracks`)
      .then(res => setTracks(res.data))
      .catch(err => console.error("Could not fetch records:", err));

    socket.on('slot_update', (updatedTrack) => {
      setTracks(prev => prev.map(t => t._id === updatedTrack._id ? updatedTrack : t));
    });

    socket.on('engine_trace', (data) => {
      const { trackId, message, timestamp } = data;
      setLogs(prev => ({
        ...prev,
        [trackId]: [...(prev[trackId] || []).slice(-3), `[${timestamp}] ${message}`]
      }));
    });

    socket.on('system_metrics_update', (metricsData) => {
      setGlobalStats(metricsData);
      setJitterLatency(metricsData.averageLatency);
    });

    return () => {
      socket.off('slot_update');
      socket.off('engine_trace');
      socket.off('system_metrics_update');
    };
  }, []);

  // Force an immediate check through the system architecture
  const handleManualPing = (trackId) => {
    setBurstLatency(Math.floor(120 + Math.random() * 40));
    setIsWaveBursting(true);
    socket.emit('force_manual_ping', trackId);
    
    // Reset canvas ripple speed after 2.5 seconds
    setTimeout(() => setIsWaveBursting(false), 2500);
  };

  // Toggle active daemon status state directly
  const handleToggleStatus = (trackId, currentStatus) => {
    const nextStatus = currentStatus === 'Paused' ? 'Tracking' : 'Paused';
    setTracks(prev => prev.map(t => t._id === trackId ? { ...t, status: nextStatus } : t));
    
    setLogs(prev => ({
      ...prev,
      [trackId]: [...(prev[trackId] || []), `[${new Date().toLocaleTimeString()}] ⚙️ User adjusted status to: ${nextStatus}`]
    }));
  };


  // 🌌 Canvas Oscillating Wave
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 140;

    let points = Array.from({ length: 20 }, (_, i) => ({
      x: (canvas.width / 19) * i,
      y: canvas.height / 2,
      angle: Math.random() * Math.PI * 2
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      
      // Flash bright amber if user has just clicked manual override
      ctx.strokeStyle = isWaveBursting ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = isWaveBursting ? 3 : 2;

      points.forEach((p, idx) => {
        const speed = isWaveBursting ? 0.35 : globalStats.activeDaemons > 0 ? 0.08 : 0.02;
        p.angle += speed;
        const currentY = p.y + Math.sin(p.angle) * (isWaveBursting ? 35 : 20);
        
        if (idx === 0) ctx.moveTo(p.x, currentY);
        else ctx.lineTo(p.x, currentY);
      });

      ctx.stroke();
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [globalStats.activeDaemons, isWaveBursting]);

  return (
    <div style={{ display: 'flex', backgroundColor: '#070a12', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🧭 NAVIGATION SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: '#0b111e', borderRight: '1px solid #151f32', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 14px #10b981' }}></div>
          <span style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff' }}>SURGECART</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '12px 16px', backgroundColor: '#162235', borderRadius: '8px', color: '#ffffff', fontWeight: '600', fontSize: '14px' }}>📡 Operational Grid</div>
        </nav>
      </div>

      {/* 🖥️ MAIN WORKSPACE */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        
        <header style={{ height: '70px', borderBottom: '1px solid #151f32', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0b111e' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Routing Infrastructure Matrix: <span style={{ color: '#38bdf8' }}>Interactive Mesh</span></div>
        </header>

        <div style={{ display: 'flex', flex: 1, padding: '40px', gap: '32px' }}>
          
          {/* TRACKING ITEMS LAYOUT */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Active Interactive Monitors</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {tracks.map((track) => {
                const isNotified = track.status === 'Notified';
                const isPaused = track.status === 'Paused';
                
                return (
                  <div key={track._id} style={{ 
                    backgroundColor: '#0b111e', 
                    border: `1px solid ${isNotified ? '#10b981' : isPaused ? '#334155' : '#151f32'}`, 
                    borderRadius: '12px', 
                    padding: '24px', 
                    position: 'relative',
                    opacity: isPaused ? 0.6 : 1,
                    transition: 'all 0.3s ease'
                  }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#162235', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', marginRight: '12px' }}>{track.platform.toUpperCase()}</span>
                        <span style={{ color: '#cbd5e1', fontSize: '15px', fontWeight: 600 }}>{track.location}</span>
                      </div>
                      
                      {/* INTERACTIVE ACTIONS HUB HEADER */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          onClick={() => handleToggleStatus(track._id, track.status)}
                          style={{ padding: '4px 10px', backgroundColor: '#151f32', border: '1px solid #22344f', color: '#cbd5e1', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          {isPaused ? '▶ Resume' : '⏸ Pause'}
                        </button>
                        
                        <button 
                          onClick={() => handleManualPing(track._id)}
                          disabled={isPaused || isNotified}
                          style={{ 
                            padding: '4px 10px', 
                            backgroundColor: isPaused || isNotified ? '#090d16' : '#3b82f6', 
                            border: 'none', 
                            color: '#ffffff', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            cursor: isPaused || isNotified ? 'not-allowed' : 'pointer',
                            boxShadow: isPaused || isNotified ? 'none' : '0 0 10px rgba(59,130,246,0.3)'
                          }}
                        >
                          ⚡ Force Scan
                        </button>
                      </div>
                    </div>

                    {/* Code Terminal View */}
                    <div style={{ backgroundColor: '#04060a', border: '1px solid #151f32', borderRadius: '8px', padding: '14px 18px', fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                      {(logs[track._id] || []).length === 0 ? (
                        <div style={{ color: '#334155' }}>&gt; Thread deployed. Press "Force Scan" to test execution path manually...</div>
                      ) : (
                        logs[track._id].map((log, idx) => (
                          <div key={idx} style={{ color: log.includes('Override') ? '#fbbf24' : log.includes('SUCCESS') ? '#10b981' : '#38bdf8', marginBottom: '4px' }}>&gt; {log}</div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SYSTEM PERFORMANCE MONITOR COLUMN */}
          <div style={{ flex: 1, minWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>System Telemetry</h2>
            
            <div style={{ position: 'relative', backgroundColor: '#0b111e', border: '1px solid #151f32', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
              
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '140px', pointerEvents: 'none' }}>
                <canvas ref={canvasRef} />
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Total Proxy Iterations</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>{globalStats.totalRequests}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Network Query Delay</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: isWaveBursting ? '#fbbf24' : '#fbbf24', fontFamily: 'monospace', transition: 'all 0.1s ease' }}>
                  {isWaveBursting ? burstLatency : globalStats.activeDaemons > 0 ? jitterLatency : 0} <span style={{ fontSize: '14px', color: '#475569' }}>ms</span>
                </div>
              </div>
              
              <div style={{ marginBottom: '60px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>WAF Anti-Bot Bypass</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#10b981', fontFamily: 'monospace' }}>{globalStats.bypassRate}.00%</div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardWorkspace;