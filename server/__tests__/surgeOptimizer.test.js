const test = require('node:test');
const assert = require('node:assert/strict');

const { getSmartIntervalMs, getSurgeStrategy } = require('../services/surgeOptimizer');

test('pro users get a shorter interval during peak demand windows', () => {
  const track = { plan: 'pro', platform: 'Blinkit' };
  const interval = getSmartIntervalMs(track, 30000);
  const hour = new Date().getHours();
  const expected = hour >= 17 && hour <= 21 ? 15000 : hour >= 11 && hour <= 14 ? 22500 : 30000;
  assert.equal(interval, expected);
});

test('pro users receive a peak surge strategy during high-demand windows', () => {
  const track = { plan: 'pro', platform: 'Zepto' };
  const hour = new Date().getHours();
  const strategy = getSurgeStrategy(track, { isSlotAvailable: true, message: 'Open slot detected' });
  const expectedStrategy = hour >= 17 && hour <= 21 ? 'peak-burst' : 'steady';
  assert.equal(strategy.strategy, expectedStrategy);
  assert.equal(strategy.priorityBoost, hour >= 17 && hour <= 21);
});
