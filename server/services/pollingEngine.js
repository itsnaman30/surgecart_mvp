const { checkSlots } = require('./slotChecker');
const trackStore = require('./trackStore');
const smsService = require('./smsService');

const activePollingLoops = {};
let ioInstance = null;
let globalPollingIntervalMs = 30000;
let aggregateMetrics = {
  totalRequests: 0,
  activeDaemons: 0,
  averageLatency: 0,
  bypassRate: 100,
  lastSurgeLevel: 'unknown',
};

let pushSubscriptions = [];

function setSmsTargets(targets) {
  for (const phone of targets || []) {
    smsService.registerPhoneNumber(phone);
  }
}

function getSmsTargets() {
  return smsService.getRegisteredTargets();
}

function setPushSubscriptions(subs) {
  pushSubscriptions = subs;
}

function getPushSubscriptions() {
  return pushSubscriptions;
}

function setGlobalPollingInterval(ms) {
  globalPollingIntervalMs = ms;
}

function getGlobalPollingInterval() {
  return globalPollingIntervalMs;
}

function getMetrics() {
  return { ...aggregateMetrics };
}

function streamTrace(trackId, message, phase = 'info') {
  if (!ioInstance) return;
  ioInstance.emit('engine_trace', {
    trackId,
    message,
    phase,
    timestamp: new Date().toLocaleTimeString(),
  });
}

function emitMetrics() {
  if (!ioInstance) return;
  ioInstance.emit('system_metrics_update', aggregateMetrics);
}

async function runCheck(track, { manual = false } = {}) {
  const trackId = track._id.toString();
  const phase = manual ? 'override' : 'scrape';

  streamTrace(trackId, manual ? '⚡ Manual scan triggered...' : '🔍 Checking delivery slot availability...', phase);

  const started = Date.now();
  const result = await checkSlots(track.platform, track.latitude, track.longitude);

  aggregateMetrics.totalRequests += 1;
  aggregateMetrics.averageLatency = Math.round(
    (aggregateMetrics.averageLatency * 0.7) + (result.latencyMs || Date.now() - started) * 0.3
  );
  aggregateMetrics.lastSurgeLevel = result.surgeLevel || 'unknown';
  emitMetrics();

  const updates = {
    checkCount: (track.checkCount || 0) + 1,
    lastCheckedAt: new Date(),
    lastResult: result.message || (result.isSlotAvailable ? 'Slot available' : 'No slots — surge period'),
    surgeLevel: result.surgeLevel || 'unknown',
    checkoutUrl: result.checkoutUrl || '',
  };

  const updatedTrack = await trackStore.updateById(trackId, updates);
  const liveTrack = { ...track, ...updates, _id: trackId };

  streamTrace(
    trackId,
    result.isSlotAvailable
      ? '✅ SLOT OPEN — dispatching alerts now'
      : `⏱️ ${updates.lastResult} (${result.source})`,
    result.isSlotAvailable ? 'success' : 'cooldown'
  );

  if (result.isSlotAvailable) {
    const notified = await trackStore.updateById(trackId, { status: 'Notified', ...updates });
    stopTrackPolling(trackId);

    const payload = notified || { ...liveTrack, status: 'Notified' };
    ioInstance?.emit('slot_update', payload);

    // Send SMS and log results
    const smsResults = await smsService.sendSlotOpenAlert(payload, result);
    if (smsResults && smsResults.length > 0) {
      const sent = smsResults.filter(r => r.sent).length;
      const failed = smsResults.filter(r => !r.sent).length;
      console.log(`[SMS] Slot alert: ${sent} sent, ${failed} failed`);
      if (failed > 0) {
        smsResults.filter(r => !r.sent).forEach(r => {
          console.log(`[SMS] Failed for ${r.phone}: ${r.reason}`);
        });
      }
    }
  }

  return { ...liveTrack, ...result };
}

function startTrackPolling(io, track) {
  ioInstance = io;
  const trackId = track._id.toString();

  if (track.status !== 'Tracking') return;
  if (activePollingLoops[trackId]) return;

  const intervalMs = track.pollingIntervalMs || globalPollingIntervalMs;

  streamTrace(trackId, `🚀 Watch started — first scan running now (every ${intervalMs / 1000}s after)`, 'init');

  const tick = async () => {
    try {
      const fresh = await trackStore.findById(trackId);
      if (!fresh || fresh.status !== 'Tracking') {
        stopTrackPolling(trackId);
        return;
      }
      await runCheck(fresh);
    } catch (err) {
      console.error(`[polling] Error on ${trackId}:`, err.message);
      streamTrace(trackId, `❌ Scan error: ${err.message}`, 'error');
    }
  };

  void tick();
  activePollingLoops[trackId] = setInterval(tick, intervalMs);
  refreshActiveDaemonCount();
}

function stopTrackPolling(trackId) {
  if (activePollingLoops[trackId]) {
    clearInterval(activePollingLoops[trackId]);
    delete activePollingLoops[trackId];
  }
  refreshActiveDaemonCount();
}

async function refreshActiveDaemonCount() {
  const tracking = await trackStore.findTracking();
  aggregateMetrics.activeDaemons = tracking.length;
  emitMetrics();
}

async function bootstrapActiveTracks(io) {
  ioInstance = io;
  const tracks = await trackStore.findTracking();
  tracks.forEach((track) => startTrackPolling(io, track));
  aggregateMetrics.activeDaemons = tracks.length;
  emitMetrics();
}

async function handleManualPing(trackId) {
  const track = await trackStore.findById(trackId);
  if (!track) return null;
  if (track.status === 'Paused') {
    streamTrace(trackId, '⏸ Watch is paused — resume to scan', 'error');
    return null;
  }
  return runCheck(track, { manual: true });
}

module.exports = {
  startTrackPolling,
  stopTrackPolling,
  runCheck,
  handleManualPing,
  bootstrapActiveTracks,
  refreshActiveDaemonCount,
  setGlobalPollingInterval,
  getGlobalPollingInterval,
  getMetrics,
  setSmsTargets,
  getSmsTargets,
  setPushSubscriptions,
  getPushSubscriptions,
  activePollingLoops,
};
