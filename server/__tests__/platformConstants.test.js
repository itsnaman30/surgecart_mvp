const {
  SURGE_PATTERNS,
  normalizePlatform,
  checkoutUrl,
} = require('../services/platformConstants');

describe('platformConstants', () => {
  describe('SURGE_PATTERNS', () => {
    it('exposes pattern arrays for the supported platforms', () => {
      expect(Object.keys(SURGE_PATTERNS).sort()).toEqual([
        'blinkit',
        'instamart',
        'zepto',
      ]);
      for (const key of Object.keys(SURGE_PATTERNS)) {
        expect(Array.isArray(SURGE_PATTERNS[key])).toBe(true);
        expect(SURGE_PATTERNS[key].length).toBeGreaterThan(0);
      }
    });
  });

  describe('normalizePlatform', () => {
    it('maps zepto variants', () => {
      expect(normalizePlatform('Zepto')).toBe('zepto');
      expect(normalizePlatform('ZEPTO NOW')).toBe('zepto');
    });

    it('maps blinkit variants', () => {
      expect(normalizePlatform('Blinkit')).toBe('blinkit');
    });

    it('maps instamart and swiggy to instamart', () => {
      expect(normalizePlatform('Instamart')).toBe('instamart');
      expect(normalizePlatform('Swiggy Instamart')).toBe('instamart');
      expect(normalizePlatform('swiggy')).toBe('instamart');
    });

    it('lowercases and passes through unknown platforms', () => {
      expect(normalizePlatform('BigBasket')).toBe('bigbasket');
    });

    it('defaults to empty string when nothing is passed', () => {
      expect(normalizePlatform()).toBe('');
      expect(normalizePlatform('')).toBe('');
    });
  });

  describe('checkoutUrl', () => {
    it('returns the zepto storefront', () => {
      expect(checkoutUrl('zepto')).toBe('https://www.zeptonow.com/');
    });

    it('returns the instamart storefront', () => {
      expect(checkoutUrl('Swiggy Instamart')).toBe(
        'https://www.swiggy.com/instamart',
      );
    });

    it('falls back to blinkit for blinkit and unknown platforms', () => {
      expect(checkoutUrl('Blinkit')).toBe('https://blinkit.com/');
      expect(checkoutUrl('SomethingElse')).toBe('https://blinkit.com/');
    });
  });
});
