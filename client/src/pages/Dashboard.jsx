import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import TrackingForm from '../components/TrackingForm';
import WatchCard from '../components/WatchCard';
import WishlistManager from '../components/WishlistManager';
import { getSocket, tracksApi, notificationsApi, settingsApi, analyticsApi } from '../api/client';
import { AuthContext } from '../context/AuthContext.jsx';
import { MAX_WATCHES } from '../config';

const socket = getSocket();

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [watches, setWatches] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [logs, setLogs] = useState({});
  const [metrics, setMetrics] = useState({ activeDaemons: 0, totalRequests: 0, averageLatency: 0, lastSurgeLevel: 'unknown' });
  const [demandData, setDemandData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem('surge_phone_route') || '');
  const [pollingInterval, setPollingInterval] = useState('30000');
  const [pushEnabled, setPushEnabled] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [connected, setConnected] = useState(socket.connected);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [notifications, setNotifications] = useState([]);

  const triggerToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  const showBrowserNotification = useCallback((track) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const n = new Notification(`⚡ Slot open on ${track.platform}!`, {
      body: `A delivery window opened near ${track.location}. Tap to checkout.`,
      icon: '/icon-192.png',
      tag: track._id,
    });
    n.onclick = () => {
      window.open(track.checkoutUrl || 'https://blinkit.com/', '_blank');
      n.close();
    };
  }, []);

  const appendLog = useCallback((trackId, entry) => {
    setLogs((prev) => ({
      ...prev,
      [trackId]: [...(prev[trackId] || []).slice(-4), entry],
    }));
  }, []);

  const loadWatches = useCallback(() => {
    tracksApi.list()
      .then((res) => setWatches(res.data))
      .catch(() => triggerToast('Could not reach SurgeCart server. Is it running?', 'error'));
  }, [triggerToast]);

  const loadAnalytics = useCallback(() => {
    analyticsApi.demand()
      .then((res) => setDemandData(res.data))
      .catch((err) => console.error('[dashboard] Failed to load analytics:', err));
  }, []);

  useEffect(() => {
    loadWatches();
    loadAnalytics();

    notificationsApi.getSms()
      .then((res) => {
        const targets = res.data?.targets || [];
        if (targets.length > 0) {
          const latest = targets[targets.length - 1];
          setPhoneNumber(latest);
          localStorage.setItem('surge_phone_route', latest);
        }
      })
      .catch((err) => console.error('[dashboard] Failed to load SMS targets:', err));

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('slot_update', (updatedTrack) => {
      setWatches((prev) => prev.map((w) => (w._id === updatedTrack._id ? updatedTrack : w)));
      triggerToast(`Slot opened on ${updatedTrack.platform}! Opening checkout...`, 'success');
      showBrowserNotification(updatedTrack);
      setNotifications((prev) => [{
        _id: Date.now().toString(),
        platform: updatedTrack.platform,
        location: updatedTrack.location,
        timestamp: 'Just now',
        type: 'Slot opened',
      }, ...prev]);

      const checkoutUrl = updatedTrack.checkoutUrl
        || (updatedTrack.platform === 'Zepto' ? 'https://www.zeptonow.com/'
          : updatedTrack.platform === 'Instamart' ? 'https://www.swiggy.com/instamart'
            : 'https://blinkit.com/');
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    });

    socket.on('engine_trace', ({ trackId, message, timestamp }) => {
      appendLog(trackId, `[${timestamp}] ${message}`);
    });

    socket.on('system_metrics_update', (data) => setMetrics(data));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[dashboard] Service worker registration failed:', err));
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('slot_update');
      socket.off('engine_trace');
      socket.off('system_metrics_update');
    };
  }, [appendLog, loadAnalytics, loadWatches, showBrowserNotification, triggerToast]);

  const handlePause = async (id) => {
    try {
      const res = await tracksApi.update(id, { status: 'Paused' });
      setWatches((prev) => prev.map((w) => (w._id === id ? res.data : w)));
      triggerToast('Watch paused');
    } catch {
      triggerToast('Failed to pause watch', 'error');
    }
  };

  const handleResume = async (id) => {
    try {
      const res = await tracksApi.update(id, { status: 'Tracking' });
      setWatches((prev) => prev.map((w) => (w._id === id ? res.data : w)));
      triggerToast('Watch resumed — scanning again');
    } catch {
      triggerToast('Failed to resume watch', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await tracksApi.remove(id);
      setWatches((prev) => prev.filter((w) => w._id !== id));
      triggerToast('Watch removed');
    } catch {
      triggerToast('Failed to remove watch', 'error');
    }
  };

  const handleForceScan = (id) => {
    socket.emit('force_manual_ping', id);
  };

  const handleOpenCheckout = (track) => {
    window.open(track.checkoutUrl || 'https://blinkit.com/', '_blank');
  };

  const handleNewWatch = (newWatch) => {
    setWatches((prev) => [newWatch, ...prev]);
    setCurrentView('dashboard');
    loadAnalytics();
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      return triggerToast('This browser does not support notifications', 'error');
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      localStorage.setItem('surge_push_enabled', 'true');
      triggerToast('Browser alerts enabled — we will notify you when slots open');
    } else {
      triggerToast('Notification permission denied', 'error');
    }
  };

  const saveSmsRouting = async () => {
    if (!phoneNumber.trim()) return triggerToast('Enter a valid phone number', 'error');
    try {
      const res = await notificationsApi.saveSms(phoneNumber.trim());
      const saved = res.data.phone || phoneNumber.trim();
      localStorage.setItem('surge_phone_route', saved);
      setPhoneNumber(saved);
      triggerToast(res.data.message || 'Phone number registered for SMS alerts');
    } catch (err) {
      triggerToast(err.response?.data?.error || 'Failed to save phone number', 'error');
    }
  };

  const handlePollingChange = async (e) => {
    const val = e.target.value;
    setPollingInterval(val);
    try {
      await settingsApi.setPollingInterval(parseInt(val, 10));
      triggerToast('Polling interval updated for new watches');
    } catch {
      triggerToast('Failed to update polling interval', 'error');
    }
  };

  const trackingCount = watches.filter((w) => w.status === 'Tracking').length;
  const notifiedCount = watches.filter((w) => w.status === 'Notified').length;
  const watchCount = watches.length;

  const getUserDisplayName = (user) => {
    if (!user) return 'you';
    if (typeof user.name === 'string' && user.name.trim()) return user.name;
    if (typeof user.email === 'string' && user.email.trim()) return user.email;
    if (typeof user.id === 'string' && user.id.trim()) return user.id;
    return 'you';
  };

  const chartSlots = demandData?.slots || [];
  const chartWidth = 700;
  const chartHeight = 160;
  const padding = 36;
  const points = chartSlots.map((d, i) => {
    const x = padding + (i * (chartWidth - padding * 2)) / Math.max(chartSlots.length - 1, 1);
    const y = chartHeight - padding - (d.probability * (chartHeight - padding * 2)) / 100;
    return { x, y, ...d };
  });
  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}><div style={styles.brandIcon} />SurgeCart</div>
        <nav style={{ flex: 1 }}>
          {['dashboard', 'track', 'notifications', 'settings', 'wishlist'].map((view) => (
            <button key={view} type="button" onClick={() => setCurrentView(view)} style={styles.navItem(currentView === view)}>
              <div style={styles.bullet(currentView === view)} />
              {view === 'dashboard' ? 'My Watches' : view === 'track' ? 'Add Watch' : view === 'wishlist' ? 'Saved items' : view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>
        <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>
          {watchCount}/{MAX_WATCHES} watches
        </div>
      </aside>

      <div style={styles.workspace}>
        <header style={styles.topHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: connected ? '#10b981' : '#ef4444', fontWeight: '600' }}>
              {connected ? '● Live — monitoring your slots' : '○ Disconnected — start the server'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Signed in as {getUserDisplayName(user)}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => navigate('/')} style={styles.backButton}>← Back to site</button>
            <button type="button" onClick={logout} style={styles.logoutButton}>Logout</button>
          </div>
        </header>

        <main style={styles.mainContent}>
          {currentView === 'dashboard' && (
            <>
              <h1 style={styles.dashTitle}>Your delivery slot watches</h1>
              <p style={styles.dashSubtitle}>
                SurgeCart monitors Blinkit, Zepto, and Instamart when demand is high — and alerts you the moment a slot opens.
              </p>

              <div style={styles.statsGrid}>
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Active watches</div>
                  <div style={styles.metricValue}>{trackingCount}</div>
                </div>
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Slots found</div>
                  <div style={styles.metricValue}>{notifiedCount}</div>
                </div>
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Total scans</div>
                  <div style={styles.metricValue}>{metrics.totalRequests}</div>
                </div>
                <div style={styles.metricCard}>
                  <div style={styles.metricLabel}>Current surge</div>
                  <div style={{ ...styles.metricValue, fontSize: '22px', textTransform: 'capitalize' }}>{metrics.lastSurgeLevel || 'unknown'}</div>
                </div>
              </div>

              {watches.length === 0 ? (
                <div style={styles.emptyState}>
                  <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No watches yet</h3>
                  <p style={{ color: '#64748b', margin: '0 0 20px' }}>
                    Sync your current location or enter GPS coordinates, then pick a platform. We will scan for open slots while you wait.
                  </p>
                  <button type="button" onClick={() => setCurrentView('track')} style={styles.primaryBtn}>Add your first watch</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                  {watches.map((track) => (
                    <WatchCard
                      key={track._id}
                      track={track}
                      logs={logs[track._id] || []}
                      onPause={handlePause}
                      onResume={handleResume}
                      onDelete={handleDelete}
                      onForceScan={handleForceScan}
                      onOpenCheckout={handleOpenCheckout}
                    />
                  ))}
                </div>
              )}

              {chartSlots.length > 0 && (
                <div style={styles.chartCard}>
                  <h3 style={styles.sectionHeading}>Best times to find slots today</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
                    Lower surge periods mean better odds — based on typical quick-commerce demand patterns.
                  </p>
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto' }}>
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={p.isNow ? 6 : 4} fill={p.isNow ? '#f59e0b' : '#10b981'} />
                        <text x={p.x} y={chartHeight - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </>
          )}

          {currentView === 'track' && (
            <TrackingForm
              onWatchCreated={handleNewWatch}
              triggerToast={triggerToast}
              activeCount={watchCount}
              pollingInterval={parseInt(pollingInterval, 10)}
            />
          )}

          {currentView === 'notifications' && (
            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>Alert history</h2>
              <p style={styles.panelDesc}>Real alerts from your active watches.</p>
              {notifications.length === 0 ? (
                <div style={styles.emptySmall}>No slot alerts yet. When a watch finds an open slot, it will show here.</div>
              ) : (
                notifications.map((log) => (
                  <div key={log._id} style={styles.logRow}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{log.platform} — {log.location}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{log.type}</div>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {currentView === 'settings' && (
            <div style={styles.panel}>
              <h2 style={styles.panelTitle}>Alert settings</h2>
              <p style={styles.panelDesc}>Configure how you want to be notified when a slot opens during surge hours.</p>

              <div style={styles.settingBlock}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>Browser notifications</div>
                <p style={styles.settingHint}>Get instant pop-up alerts on this device when a slot opens.</p>
                <button type="button" onClick={requestNotificationPermission} style={styles.primaryBtn}>
                  {pushEnabled ? '✓ Alerts enabled' : 'Enable browser alerts'}
                </button>
              </div>

              <div style={styles.settingBlock}>
                <label style={styles.label}>SMS alerts</label>
                <p style={styles.settingHint}>Register your mobile number to receive a real text the moment a slot opens on any watch.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={styles.input}
                  />
                  <button type="button" onClick={saveSmsRouting} style={styles.darkBtn}>Save</button>
                </div>
              </div>

              <div style={styles.settingBlock}>
                <label style={styles.label}>Scan frequency (new watches)</label>
                <select value={pollingInterval} onChange={handlePollingChange} style={styles.input}>
                  <option value="5000">Every 5 seconds (aggressive)</option>
                  <option value="30000">Every 30 seconds (recommended)</option>
                  <option value="120000">Every 2 minutes (battery-friendly)</option>
                </select>
              </div>
            </div>
          )}

            {currentView === 'wishlist' && (
              <div style={{ padding: 8 }}>
                <h2 style={{ marginTop: 0 }}>Saved items</h2>
                <p style={{ color: '#64748b', marginBottom: '18px' }}>
                  Save products you want monitored in the background, then check back here anytime to manage them.
                </p>
                <WishlistManager triggerToast={triggerToast} />
              </div>
            )}
        </main>
      </div>

      <div style={{ ...styles.toast, transform: toast.visible ? 'translateY(0)' : 'translateY(100px)', opacity: toast.visible ? 1 : 0 }}>
        {toast.message}
      </div>
    </div>
  );
};

const styles = {
  layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  sidebar: { width: '260px', backgroundColor: '#0f172a', padding: '32px 24px', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 },
  brand: { fontSize: '20px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '44px' },
  brandIcon: { width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' },
  navItem: (active) => ({ padding: '14px 18px', borderRadius: '8px', color: active ? '#fff' : '#94a3b8', backgroundColor: active ? '#1e293b' : 'transparent', fontWeight: '600', cursor: 'pointer', marginBottom: '6px', border: 'none', width: '100%', textAlign: 'left', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '14px' }),
  bullet: (active) => ({ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: active ? '#10b981' : '#475569' }),
  workspace: { flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  topHeader: { backgroundColor: '#fff', height: '70px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', position: 'sticky', top: 0, zIndex: 90 },
  backButton: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  mainContent: { padding: '40px max(4%, 40px)', maxWidth: '900px', width: '100%', boxSizing: 'border-box' },
  dashTitle: { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' },
  dashSubtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 32px', lineHeight: 1.6 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' },
  metricCard: { backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' },
  metricLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' },
  metricValue: { fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0 },
  chartCard: { backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '28px', borderRadius: '12px' },
  sectionHeading: { fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px' },
  emptyState: { backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '48px', textAlign: 'center' },
  emptySmall: { padding: '32px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' },
  panel: { backgroundColor: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  panelTitle: { margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#0f172a' },
  panelDesc: { color: '#64748b', fontSize: '14px', marginBottom: '28px' },
  logRow: { display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0' },
  settingBlock: { marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #f1f5f9' },
  settingHint: { fontSize: '13px', color: '#64748b', margin: '0 0 12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' },
  input: { flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  primaryBtn: { padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  darkBtn: { padding: '12px 20px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
  toast: { position: 'fixed', bottom: '32px', right: '32px', backgroundColor: '#0f172a', color: '#fff', padding: '16px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', zIndex: 1000, transition: 'all 0.2s ease' },
};

export default Dashboard;
