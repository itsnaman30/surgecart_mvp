describe('proxyManager', () => {
  const ORIGINAL_ENV = process.env.PROXY_LIST;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.PROXY_LIST;
    } else {
      process.env.PROXY_LIST = ORIGINAL_ENV;
    }
    jest.resetModules();
  });

  function loadFresh() {
    let mod;
    jest.isolateModules(() => {
      mod = require('../services/proxyManager');
    });
    return mod;
  }

  describe('getRotatedAgent', () => {
    it('falls back to a direct link when no proxies are configured', () => {
      delete process.env.PROXY_LIST;
      const proxyManager = loadFresh();

      const { httpsAgent, proxyUrl } = proxyManager.getRotatedAgent();
      expect(httpsAgent).toBeNull();
      expect(proxyUrl).toBe('Direct IP Network Link');
    });

    it('returns an agent bound to one of the configured proxies', () => {
      process.env.PROXY_LIST =
        'http://user:pass@proxy-a:8080,http://user:pass@proxy-b:8080';
      const proxyManager = loadFresh();

      const { httpsAgent, proxyUrl } = proxyManager.getRotatedAgent();
      expect(httpsAgent).not.toBeNull();
      expect([
        'http://user:pass@proxy-a:8080',
        'http://user:pass@proxy-b:8080',
      ]).toContain(proxyUrl);
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('returns a header profile with a known mobile user agent', () => {
      const proxyManager = loadFresh();
      const headers = proxyManager.generateDeviceFingerprint();

      expect(typeof headers['User-Agent']).toBe('string');
      expect(headers['User-Agent'].length).toBeGreaterThan(0);
      expect(headers['Accept']).toBe('application/json, text/plain, */*');
      expect(headers['Accept-Language']).toContain('en-IN');
      expect(headers['Sec-Fetch-Mode']).toBe('cors');
    });
  });
});
