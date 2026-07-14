const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDemandAnalytics } = require('../services/demandAnalytics');

test('buildDemandAnalytics stays neutral when there is no live telemetry', () => {
  const result = buildDemandAnalytics({ tracks: [], lastSurgeLevel: 'unknown' });

  assert.deepEqual(result.slots, []);
  assert.equal(result.currentSurge, 'unknown');
  assert.equal(result.isLiveSignal, false);
  assert.match(result.signalSummary, /No live demand signal/i);
});
