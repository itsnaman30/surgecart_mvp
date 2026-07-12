// Shared id generation used across the in-memory stores, sqlite seeds, and auth.
function makeId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8);
  if (prefix) {
    return `${prefix}-${Date.now()}-${rand}`;
  }
  return Date.now().toString(36) + rand;
}

module.exports = { makeId };
