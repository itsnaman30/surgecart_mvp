const PLATFORM_COLORS = {
  Zepto: { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed' },
  Blinkit: { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706' },
  Instamart: { bg: 'rgba(249, 115, 22, 0.12)', text: '#ea580c' },
};

const SURGE_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  unknown: '#94a3b8',
};

function formatLastChecked(date) {
  if (!date) return 'Not scanned yet';
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return d.toLocaleTimeString();
}

const WatchCard = ({ track, logs = [], onPause, onResume, onDelete, onForceScan, onOpenCheckout }) => {
  const isPaused = track.status === 'Paused';
  const isNotified = track.status === 'Notified';
  const platformStyle = PLATFORM_COLORS[track.platform] || PLATFORM_COLORS.Blinkit;
  const surgeColor = SURGE_COLORS[track.surgeLevel] || SURGE_COLORS.unknown;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: `1px solid ${isNotified ? '#10b981' : isPaused ? '#cbd5e1' : '#e2e8f0'}`,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      opacity: isPaused ? 0.75 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <span style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            backgroundColor: platformStyle.bg, color: platformStyle.text,
            padding: '4px 10px', borderRadius: '6px', marginRight: '10px',
          }}>
            {track.platform}
          </span>
          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{track.location}</span>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            Last scan: {formatLastChecked(track.lastCheckedAt)} · {track.checkCount || 0} checks
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px',
            backgroundColor: isNotified ? 'rgba(16,185,129,0.12)' : isPaused ? '#f1f5f9' : 'rgba(59,130,246,0.1)',
            color: isNotified ? '#059669' : isPaused ? '#64748b' : '#2563eb',
          }}>
            {isNotified ? '● SLOT OPEN' : isPaused ? '⏸ Paused' : '● Watching'}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '700', color: surgeColor }}>
            Surge: {track.surgeLevel || 'unknown'}
          </span>
        </div>
      </div>

      <div style={{
        backgroundColor: '#0f172a', borderRadius: '8px', padding: '14px 16px',
        fontFamily: 'ui-monospace, monospace', fontSize: '12px', minHeight: '90px',
        marginBottom: '16px',
      }}>
        {(logs.length === 0) ? (
          <div style={{ color: '#64748b' }}>Waiting for first scan...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{
              color: log.includes('SLOT OPEN') || log.includes('SUCCESS') ? '#4ade80'
                : log.includes('surge') || log.includes('Peak') ? '#fbbf24' : '#38bdf8',
              marginBottom: '4px',
            }}>
              {log}
            </div>
          ))
        )}
      </div>

      {track.lastResult && (
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
          {track.lastResult}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {isNotified && track.checkoutUrl && (
          <button type="button" onClick={() => onOpenCheckout(track)} style={btnPrimary}>
            Open {track.platform} →
          </button>
        )}
        {!isNotified && (
          <>
            <button type="button" onClick={() => (isPaused ? onResume(track._id) : onPause(track._id))} style={btnGhost}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button type="button" onClick={() => onForceScan(track._id)} disabled={isPaused} style={{ ...btnGhost, opacity: isPaused ? 0.5 : 1 }}>
              ⚡ Scan now
            </button>
          </>
        )}
        <button type="button" onClick={() => onDelete(track._id)} style={btnDanger}>
          Remove
        </button>
      </div>
    </div>
  );
};

const btnBase = {
  padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none',
};
const btnPrimary = { ...btnBase, backgroundColor: '#10b981', color: '#fff' };
const btnGhost = { ...btnBase, backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' };
const btnDanger = { ...btnBase, backgroundColor: '#fff', color: '#ef4444', border: '1px solid #fecaca' };

export default WatchCard;
