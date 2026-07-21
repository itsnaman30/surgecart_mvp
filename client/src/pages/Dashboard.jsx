import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import TrackingForm from '../components/TrackingForm';
import WatchCard from '../components/WatchCard';
import WishlistManager from '../components/WishlistManager';
import { getSocket, tracksApi, notificationsApi, settingsApi, analyticsApi } from '../api/client';
import { AuthContext } from '../context/AuthContext.jsx';
import { FREE_SCAN_LIMIT, PRO_SCAN_LIMIT } from '../config';

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
  const [scanUsage, setScanUsage] = useState({ scansUsed: 0, scansLimit: FREE_SCAN_LIMIT, remaining: FREE_SCAN_LIMIT });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [notifications, setNotifications] = useState([]);

  const isPro = user?.plan === 'pro';

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

  const loadScanUsage = useCallback(() => {
    const plan = user?.plan || 'free';
    tracksApi.usage(plan)
      .then((res) => {
        setScanUsage({
          scansUsed: res.data.scansUsed || 0,
          scansLimit: res.data.scansLimit || FREE_SCAN_LIMIT,
          remaining: res.data.remaining || 0,
        });
      })
      .catch(() => {});
  }, [user]);

  const loadWatches = useCallback(() => {
    tracksApi.list()
      .then((res) => setWatches(res.data))
      .catch(() => triggerToast('Could not reach SurgeCart server. Is it running?', 'error'));
  }, [triggerToast]);

  const loadAnalytics = useCallback(() => {
    analyticsApi.demand()
      .then((res) => setDemandData(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadWatches();
    loadAnalytics();
    loadScanUsage();

    notificationsApi.getSms()
      .then((res) => {
        const targets = res.data?.targets || [];
        if (targets.length > 0) {
          const latest = targets[targets.length - 1];
          setPhoneNumber(latest);
          localStorage.setItem('surge_phone_route', latest);
        }
      })
      .catch(() => {});

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
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      socket.off('slot_update');
      socket.off('engine_trace');
      socket.off('system_metrics_update');
    };
  }, [appendLog, loadAnalytics, loadWatches, loadScanUsage, showBrowserNotification, triggerToast]);

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
      // Re-fresh usage after delete
      loadScanUsage();
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
    loadScanUsage();
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
  const hasLiveSignal = Boolean(demandData?.isLiveSignal);
  const signalSummary = demandData?.signalSummary || 'No live demand signal from the selected area yet.';

  const usagePercent = isPro ? 100 : Math.min((scanUsage.scansUsed / scanUsage.scansLimit) * 100, 100);
  const isLocked = !isPro && scanUsage.scansUsed >= scanUsage.scansLimit;

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon} />
          <span>SurgeCart</span>
        </div>
        <nav style={{ flex: 1 }}>
          {[
            { key: 'dashboard', label: 'My Watches', icon: '⚡' },
            { key: 'track', label: 'Add Watch', icon: '＋' },
            { key: 'notifications', label: 'Alerts', icon: '🔔' },
            { key: 'settings', label: 'Settings', icon: '⚙' },
            { key: 'wishlist', label: 'Saved Items', icon: '♥' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCurrentView(item.key)}
              style={styles.navItem(currentView === item.key)}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.planBadge(isPro)}>
            {isPro ? '🚀 Pro' : '🔹 Free'}
          </div>
          <div style={styles.sidebarUsage}>
            <div style={styles.sidebarUsageText}>
              {isPro ? 'Unlimited scans' : `${scanUsage.scansUsed}/${scanUsage.scansLimit} scans used`}
            </div>
            {!isPro && (
              <div style={styles.progressBarTrack}>
                <div style={styles.progressBarFill(usagePercent)} />
              </div>
            )}
          </div>
          {!isPro && (
            <button type="button" onClick={() => navigate('/premium')} style={styles.upgradeBtn}>
              Upgrade → Pro
            </button>
          )}
        </div>
      </aside>

      {/* Main workspace */}
      <div style={styles.workspace}>
        <header style={styles.topHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.userInfo}>
              <span style={styles.userAvatar}>{getUserDisplayName(user).charAt(0).toUpperCase()}</span>
              <span style={styles.userName}>{getUserDisplayName(user)}</span>
              <span style={styles.planLabel(isPro)}>{isPro ? 'Pro' : 'Free'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => navigate('/')} style={styles.backButton}>← Back to site</button>
            <button type="button" onClick={logout} style={styles.logoutButton}>Logout</button>
          </div>
        </header>

        <main style={styles.mainContent}>
          {currentView === 'dashboard' && (
            <>
              {/* Page header */}
              <div style={styles.pageHeader}>
                <div>
                  <h1 style={styles.dashTitle}>Your delivery slot watches</h1>
                  <p style={styles.dashSubtitle}>
                    SurgeCart monitors Blinkit, Zepto, and Instamart — and alerts you the moment a slot opens.
                  </p>
                </div>
                {watches.length > 0 && !isLocked && (
                  <button type="button" onClick={() => setCurrentView('track')} style={styles.primaryBtn}>
                    ＋ Add Watch
                  </button>
                )}
              </div>

              {/* Scan Usage Banner (free users) */}
              {!isPro && (
                <div style={styles.usageBanner}>
                  <div style={styles.usageBannerContent}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.usageBannerTitle}>
                        {isLocked ? 'All free scans used' : `${scanUsage.remaining} free scan${scanUsage.remaining !== 1 ? 's' : ''} remaining`}
                      </div>
                      <div style={styles.usageBannerText}>
                        {isLocked
                          ? 'You\'ve used all 3 free scans. Upgrade to Pro for unlimited scans with priority monitoring.'
                          : `You get ${FREE_SCAN_LIMIT} lifetime scans on the Free plan. Deleting a watch does not restore a scan.`}
                      </div>
                    </div>
                    <div style={styles.usageBarContainer}>
                      <div style={styles.usageBarTrack}>
                        <div style={styles.usageBarFill(usagePercent)} />
                      </div>
                      <div style={styles.usageBarLabel}>
                        <span>{scanUsage.scansUsed} used</span>
                        <span>{scanUsage.scansLimit} limit</span>
                      </div>
                    </div>
                    {isLocked && (
                      <button type="button" onClick={() => navigate('/premium')} style={styles.upgradeBtnLarge}>
                        Upgrade to Pro →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div style={styles.statsGrid}>
                <div style={{ ...styles.metricCard, ...styles.metricCardGlow }}>
                  <div style={styles.metricIcon}>👁</div>
                  <div>
                    <div style={styles.metricLabel}>Active watches</div>
                    <div style={styles.metricValue}>{trackingCount}</div>
                  </div>
                </div>
                <div style={{ ...styles.metricCard, ...styles.metricCardSuccess }}>
                  <div style={styles.metricIcon}>🎯</div>
                  <div>
                    <div style={styles.metricLabel}>Slots found</div>
                    <div style={styles.metricValue}>{notifiedCount}</div>
                  </div>
                </div>
                <div style={{ ...styles.metricCard, ...styles.metricCardInfo }}>
                  <div style={styles.metricIcon}>📊</div>
                  <div>
                    <div style={styles.metricLabel}>Total scans</div>
                    <div style={styles.metricValue}>{metrics.totalRequests}</div>
                  </div>
                </div>
                <div style={{ ...styles.metricCard, ...styles.metricCardWarning }}>
                  <div style={styles.metricIcon}>🌊</div>
                  <div>
                    <div style={styles.metricLabel}>Current surge</div>
                    <div style={{ ...styles.metricValue, fontSize: '22px', textTransform: 'capitalize' }}>{metrics.lastSurgeLevel || 'unknown'}</div>
                  </div>
                </div>
              </div>

              {/* Premium upgrade card */}
              {!isPro && !isLocked && (
                <div style={styles.premiumCard}>
                  <div style={styles.premiumCardBg} />
                  <div style={styles.premiumCardContent}>
                    <div>
                      <div style={styles.premiumCardTitle}>🚀 Upgrade to Pro</div>
                      <div style={styles.premiumCardText}>
                        Unlock unlimited scans, priority queue during peak hours, SMS alerts, and advanced demand analytics.
                      </div>
                    </div>
                    <button type="button" onClick={() => navigate('/premium')} style={styles.premiumCtaBtn}>
                      See plans →
                    </button>
                  </div>
                </div>
              )}

              {/* Watch cards */}
              {watches.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>⚡</div>
                  <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No watches yet</h3>
                  <p style={{ color: '#64748b', margin: '0 0 24px', maxWidth: 420, lineHeight: 1.6 }}>
                    Sync your current location or enter GPS coordinates, then pick a platform. We'll scan for open slots while you wait.
                  </p>
                  <button type="button" onClick={() => setCurrentView('track')} style={styles.primaryBtn}>
                    {isLocked ? 'Upgrade to add more watches' : 'Add your first watch'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
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

              {/* Live demand signal */}
              <div style={styles.chartCard}>
                <h3 style={styles.sectionHeading}>Live demand signal</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
                  {signalSummary}
                </p>
                <div style={styles.signalBox(hasLiveSignal)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.pulseDot(hasLiveSignal)} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: hasLiveSignal ? '#047857' : '#475569' }}>
                        {hasLiveSignal ? 'Live telemetry active' : 'Waiting for scan data'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {hasLiveSignal
                          ? 'Real-time demand data streaming from your area'
                          : 'Demand signal will appear once scans begin'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === 'track' && (
            <TrackingForm
              onWatchCreated={handleNewWatch}
              triggerToast={triggerToast}
              activeCount={watchCount}
              pollingInterval={parseInt(pollingInterval, 10)}
              scanUsage={scanUsage}
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

      {/* Toast */}
      <div style={styles.toastContainer}>
        <div style={{ ...styles.toast, transform: toast.visible ? 'translateY(0)' : 'translateY(20px)', opacity: toast.visible ? 1 : 0 }}>
          <span style={{ marginRight: '8px' }}>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          {toast.message}
        </div>
      </div>
    </div>
  );
};

// Color palette
const colors = {
  sidebarBg: '#0b1120',
  surface: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accent: '#10b981',
  accentLight: '#d1fae5',
  accentDark: '#059669',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  purple: '#8b5cf6',
  purpleLight: '#ede9fe',
};

const styles = {
  layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },

  // Sidebar
  sidebar: {
    width: '260px',
    backgroundColor: colors.sidebarBg,
    background: 'linear-gradient(180deg, #0b1120 0%, #0f172a 100%)',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0,
    zIndex: 100,
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  brand: { fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', letterSpacing: '-0.5px' },
  brandIcon: { width: '10px', height: '10px', borderRadius: '2px', backgroundColor: colors.accent, boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)' },
  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    fontWeight: active ? '700' : '500',
    cursor: 'pointer',
    marginBottom: '4px',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '14px',
    transition: 'all 0.15s ease',
    backdropFilter: active ? 'blur(8px)' : 'none',
  }),
  sidebarFooter: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  planBadge: (isPro) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '999px',
    backgroundColor: isPro ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)',
    color: isPro ? colors.accent : 'rgba(255,255,255,0.6)',
    width: 'fit-content',
  }),
  sidebarUsage: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sidebarUsageText: { fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  progressBarTrack: { width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' },
  progressBarFill: (pct) => ({
    width: `${Math.min(pct, 100)}%`,
    height: '100%',
    backgroundColor: pct >= 100 ? colors.error : colors.accent,
    borderRadius: '999px',
    transition: 'width 0.5s ease',
  }),
  upgradeBtn: {
    padding: '10px 16px',
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  },

  // Workspace
  workspace: { flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  topHeader: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(12px)',
    height: '68px',
    borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  userAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    backgroundColor: colors.sidebarBg,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
  },
  userName: { fontSize: '14px', fontWeight: '600', color: colors.textPrimary },
  planLabel: (isPro) => ({
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 10px',
    borderRadius: '999px',
    backgroundColor: isPro ? colors.accentLight : '#f1f5f9',
    color: isPro ? colors.accentDark : colors.textSecondary,
  }),
  backButton: { padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(226,232,240,0.8)', backgroundColor: '#fff', color: colors.textSecondary, fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  logoutButton: { padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fff', color: colors.error, fontWeight: '600', fontSize: '13px', cursor: 'pointer' },

  mainContent: { padding: '32px max(4%, 40px)', maxWidth: '960px', width: '100%', boxSizing: 'border-box' },

  // Dashboard header
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '20px' },
  dashTitle: { fontSize: '26px', fontWeight: '800', color: colors.textPrimary, margin: '0 0 6px', letterSpacing: '-0.3px' },
  dashSubtitle: { fontSize: '14px', color: colors.textSecondary, margin: '0', lineHeight: 1.6 },

  // Usage banner
  usageBanner: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderRadius: '14px',
    padding: '20px 24px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  },
  usageBannerContent: { display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  usageBannerTitle: { fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '4px' },
  usageBannerText: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 },
  usageBarContainer: { minWidth: '180px', flex: 1, maxWidth: '260px' },
  usageBarTrack: { width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' },
  usageBarFill: (pct) => ({
    width: `${Math.min(pct, 100)}%`,
    height: '100%',
    background: pct >= 100 ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #10b981, #34d399)',
    borderRadius: '999px',
    transition: 'width 0.6s ease',
    boxShadow: pct >= 100 ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
  }),
  usageBarLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', fontWeight: '500' },
  upgradeBtnLarge: {
    padding: '12px 24px',
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.15s ease',
  },

  // Stats grid
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  metricCard: {
    backgroundColor: '#fff',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    padding: '20px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
  },
  metricCardGlow: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  metricCardSuccess: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  metricCardInfo: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  metricCardWarning: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  metricIcon: { fontSize: '24px', width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metricLabel: { fontSize: '11px', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' },
  metricValue: { fontSize: '26px', fontWeight: '800', color: colors.textPrimary, margin: 0 },

  // Premium upgrade card
  premiumCard: {
    position: 'relative',
    borderRadius: '14px',
    overflow: 'hidden',
    marginBottom: '24px',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  premiumCardBg: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)',
  },
  premiumCardContent: {
    position: 'relative',
    padding: '24px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    backdropFilter: 'blur(4px)',
  },
  premiumCardTitle: { fontSize: '16px', fontWeight: '800', color: colors.textPrimary, marginBottom: '6px' },
  premiumCardText: { fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, maxWidth: '420px' },
  premiumCtaBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #8b5cf6, #10b981)',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
  },

  // Chart / signal
  chartCard: { backgroundColor: '#fff', border: '1px solid rgba(226, 232, 240, 0.8)', padding: '28px', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  sectionHeading: { fontSize: '16px', fontWeight: '700', color: colors.textPrimary, margin: '0 0 8px' },
  signalBox: (active) => ({
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: active ? '#ecfdf5' : '#f8fafc',
    border: `1px solid ${active ? '#a7f3d0' : '#e2e8f0'}`,
  }),
  pulseDot: (active) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: active ? colors.accent : colors.textMuted,
    boxShadow: active ? '0 0 0 4px rgba(16, 185, 129, 0.15)' : 'none',
    animation: active ? 'pulse 2s infinite' : 'none',
    flexShrink: 0,
  }),

  // Empty state
  emptyState: {
    backgroundColor: '#fff',
    border: '1px dashed #cbd5e1',
    borderRadius: '14px',
    padding: '56px 48px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyIcon: { fontSize: '40px', marginBottom: '16px', opacity: 0.6 },
  emptySmall: { padding: '32px', textAlign: 'center', color: colors.textMuted, border: '1px dashed #cbd5e1', borderRadius: '8px' },

  // Panels
  panel: { backgroundColor: '#fff', padding: '32px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)' },
  panelTitle: { margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: colors.textPrimary },
  panelDesc: { color: colors.textSecondary, fontSize: '14px', marginBottom: '28px' },
  logRow: { display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '10px', border: '1px solid #e2e8f0' },

  // Settings
  settingBlock: { marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #f1f5f9' },
  settingHint: { fontSize: '13px', color: colors.textSecondary, margin: '0 0 12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '8px' },
  input: { flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', width: '100%', boxSizing: 'border-box', backgroundColor: '#fff' },
  primaryBtn: { padding: '10px 20px', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s ease' },
  darkBtn: { padding: '12px 20px', backgroundColor: colors.sidebarBg, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' },

  // Toast
  toastContainer: { position: 'fixed', bottom: '32px', right: '32px', zIndex: 1000 },
  toast: {
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '14px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.25s ease',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    alignItems: 'center',
  },
};

export default Dashboard;

