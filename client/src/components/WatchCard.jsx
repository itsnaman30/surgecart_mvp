const PLATFORM_CONFIG = {
  Zepto: { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)', label: 'Zepto' },
  Blinkit: { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)', label: 'Blinkit' },
  Instamart: { bg: 'rgba(249, 115, 22, 0.12)', text: '#ea580c', border: 'rgba(249, 115, 22, 0.25)', label: 'Instamart' },
};

const SURGE_COLORS = {
  high: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', dot: '#ef4444' },
  medium: { text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', dot: '#f59e0b' },
  low: { text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', dot: '#10b981' },
  unknown: { text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', dot: '#94a3b8' },
};

const STATUS_CONFIG = {
  Notified: { text: '● SLOT OPEN', color: '#059669', bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)' },
  Paused: { text: '⏸ Paused', color: '#64748b', bg: '#f1f5f9', border: 'transparent' },
  Tracking: { text: '● Watching', color: '#2563eb', bg: 'rgba(59,130,246,0.1)', border: 'transparent' },
  Expired: { text: '✕ Expired', color: '#94a3b8', bg: '#f8fafc', border: 'transparent' },
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
  const platformStyle = PLATFORM_CONFIG[track.platform] || PLATFORM_CONFIG.Blinkit;
  const surgeStyle = SURGE_COLORS[track.surgeLevel] || SURGE_COLORS.unknown;
  const statusStyle = STATUS_CONFIG[track.status] || STATUS_CONFIG.Tracking;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: `1px solid ${isNotified ? '#10b981' : isPaused ? '#e2e8f0' : '#e2e8f0'}`,
      borderRadius: '14px',
      padding: '22px 24px',
      boxShadow: isNotified
        ? '0 4px 16px rgba(16, 185, 129, 0.12), 0 0 0 1px rgba(16, 185, 129, 0.15)'
        : '0 2px 8px rgba(0,0,0,0.03)',
      opacity: isPaused ? 0.7 : 1,
      transition: 'all 0.2s ease',
    }}>
      {/* Top row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '14px',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            backgroundColor: platformStyle.bg, color: platformStyle.text,
            padding: '4px 12px', borderRadius: '6px', border: `1px solid ${platformStyle.border}`,
            letterSpacing: '0.3px',
          }}>
            {track.platform}
          </span>
          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{track.location}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px',
            backgroundColor: statusStyle.bg,
            color: statusStyle.color,
            border: statusStyle.border !== 'transparent' ? `1px solid ${statusStyle.border}` : 'none',
          }}>
            {statusStyle.text}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: '700',
            padding: '4px 10px', borderRadius: '6px',
            backgroundColor: surgeStyle.bg,
            color: surgeStyle.text,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: surgeStyle.dot,
              display: 'inline-block',
            }} />
            {track.surgeLevel || 'unknown'}
          </span>
        </div>
      </div>

      {/* Last scan info */}
      <div style={{
        fontSize: '12px', color: '#94a3b8', marginBottom: '12px',
        display: 'flex', gap: '16px',
      }}>
        <span>Last scan: {formatLastChecked(track.lastCheckedAt)}</span>
        <span>{track.checkCount || 0} checks performed</span>
      </div>

      {/* Log console */}
      <div style={{
        backgroundColor: '#0b1120',
        borderRadius: '10px',
        padding: '14px 16px',
        fontFamily: 'ui-monospace, "SF Mono", monospace',
        fontSize: '12px',
        minHeight: '80px',
        marginBottom: '16px',
        lineHeight: 1.7,
      }}>
        {(logs.length === 0) ? (
          <div style={{ color: '#4a5568', fontStyle: 'italic' }}>
            Waiting for first scan...{'  '}
            <span style={{ color: '#64748b' }}>
              {isPaused ? '(paused)' : track.status === 'Tracking' ? 'deploying engine...' : ''}
            </span>
          </div>
        ) : (
          logs.map((log, idx) => {
            let logColor = '#38bdf8';
            if (log.includes('SLOT OPEN') || log.includes('SUCCESS')) logColor = '#4ade80';
            else if (log.includes('surge') || log.includes('Peak')) logColor = '#fbbf24';
            else if (log.includes('error') || log.includes('fail')) logColor = '#f87171';
            return (
              <div key={idx} style={{ color: logColor, marginBottom: '3px' }}>
                <span style={{ color: '#4a5568' }}>$</span> {log}
              </div>
            );
          })
        )}
      </div>

      {/* Last result */}
      {track.lastResult && (
        <p style={{
          fontSize: '13px', color: '#64748b', margin: '0 0 16px',
          padding: '10px 14px', backgroundColor: '#f8fafc',
          borderRadius: '8px', border: '1px solid #f1f5f9',
        }}>
          {track.lastResult}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {isNotified && track.checkoutUrl && (
          <button
            type="button"
            onClick={() => onOpenCheckout(track)}
            style={{
              ...btnBase,
              backgroundColor: '#10b981', color: '#fff',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
            }}
          >
            Open {track.platform} →
          </button>
        )}
        {!isNotified && (
          <>
            <button
              type="button"
              onClick={() => (isPaused ? onResume(track._id) : onPause(track._id))}
              style={{
                ...btnBase,
                backgroundColor: isPaused ? '#10b981' : '#f1f5f9',
                color: isPaused ? '#fff' : '#334155',
                border: isPaused ? 'none' : '1px solid #e2e8f0',
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              type="button"
              onClick={() => onForceScan(track._id)}
              disabled={isPaused}
              style={{
                ...btnBase,
                backgroundColor: '#f1f5f9', color: '#334155',
                border: '1px solid #e2e8f0',
                opacity: isPaused ? 0.5 : 1,
                cursor: isPaused ? 'not-allowed' : 'pointer',
              }}
            >
              ⚡ Scan now
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onDelete(track._id)}
          style={{
            ...btnBase,
            backgroundColor: '#fff', color: '#ef4444',
            border: '1px solid #fecaca',
            marginLeft: 'auto',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

const btnBase = {
  padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
  cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
};

export default WatchCard;

