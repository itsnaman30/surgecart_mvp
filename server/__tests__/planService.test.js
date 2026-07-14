const test = require('node:test');
const assert = require('node:assert/strict');

const { getPlanLimit, getPlanConfig } = require('../services/planService');

test('free plan keeps a modest watch limit', () => {
  assert.equal(getPlanLimit('free'), 3);
  assert.equal(getPlanConfig('free').name, 'Free');
});

test('pro plan unlocks a higher watch limit', () => {
  assert.equal(getPlanLimit('pro'), 50);
  assert.equal(getPlanConfig('pro').name, 'Pro');
});
