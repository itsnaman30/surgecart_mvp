const { HttpProxyAgent, HttpsProxyAgent } = require('hpagent');

// Array of premium residential or mobile proxy server configurations
// Format: http://username:password@proxy-server-address:port
const PROXY_POOL = process.env.PROXY_LIST 
  ? process.env.PROXY_LIST.split(',') 
  : [];

// Array of actual mobile browser viewport headers to trick server fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Blinkit/Android',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
];

class ProxyManager {
  /**
   * Selects a random proxy and wraps it inside an active connection agent profile.
   */
  getRotatedAgent() {
    if (PROXY_POOL.length === 0) {
      // Fallback cleanly to direct network transport if proxy parameters aren't configured yet
      return { httpsAgent: null, proxyUrl: 'Direct IP Network Link' };
    }

    const randomProxyUrl = PROXY_POOL[Math.floor(Math.random() * PROXY_POOL.length)];
    
    const agent = new HttpsProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 2000,
      maxSockets: 256,
      maxFreeSockets: 256,
      proxy: randomProxyUrl
    });

    return { httpsAgent: agent, proxyUrl: randomProxyUrl };
  }

  /**
   * Generates a fully dynamic mobile fingerprint header profile to prevent behavior analysis detection.
   */
  generateDeviceFingerprint() {
    return {
      'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    };
  }
}

module.exports = new ProxyManager();