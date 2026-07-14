const test = require('node:test');
const assert = require('node:assert/strict');

const { heuristicCheck } = require('../services/slotChecker');

test('heuristic fallback does not label normal periods as medium surge without live demand signal', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;

  try {
    const result = heuristicCheck('blinkit');
    assert.ok(['low', 'unknown'].includes(result.surgeLevel));
    assert.notEqual(result.surgeLevel, 'medium');
  } finally {
    Math.random = originalRandom;
  }
});
