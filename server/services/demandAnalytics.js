function buildDemandAnalytics({ tracks = [], lastSurgeLevel = 'unknown' } = {}) {
  const activeWatches = tracks.filter((t) => t.status === 'Tracking').length;
  const notifiedToday = tracks.filter((t) => t.status === 'Notified').length;

  const hasLiveTelemetry = tracks.some((track) => track.lastCheckedAt || track.lastResult || track.surgeLevel && track.surgeLevel !== 'unknown');

  return {
    slots: [],
    activeWatches,
    notifiedToday,
    currentSurge: lastSurgeLevel || 'unknown',
    isLiveSignal: hasLiveTelemetry,
    signalSummary: hasLiveTelemetry
      ? 'Live telemetry is available for this watch set.'
      : 'No live demand signal from the selected area yet.',
  };
}

module.exports = { buildDemandAnalytics };
