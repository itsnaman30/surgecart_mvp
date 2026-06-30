const SURGE_PATTERNS = {
  blinkit: [
    'no delivery slots available',
    'store closed temporarily',
    'high demand',
    'try again later',
    'not delivering',
  ],
  zepto: [
    'no slots available',
    'delivery unavailable',
    'high demand',
    'store is closed',
    'not serviceable',
  ],
  instamart: [
    'no slots available',
    'delivery slots are not available',
    'high demand',
    'store is closed',
    'not available in your area',
  ],
};

function normalizePlatform(platform = '') {
  const p = platform.toLowerCase();
  if (p.includes('zepto')) return 'zepto';
  if (p.includes('blinkit')) return 'blinkit';
  if (p.includes('instamart') || p.includes('swiggy')) return 'instamart';
  return p;
}

function checkoutUrl(platform) {
  const key = normalizePlatform(platform);
  if (key === 'zepto') return 'https://www.zeptonow.com/';
  if (key === 'instamart') return 'https://www.swiggy.com/instamart';
  return 'https://blinkit.com/';
}

module.exports = { SURGE_PATTERNS, normalizePlatform, checkoutUrl };
