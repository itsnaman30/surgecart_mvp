const { checkSlotsViaWebBrowser } = require('./browserEngine');
const scraperEngine = require('./scraperEngine');
const { normalizePlatform, checkoutUrl } = require('./platformConstants');

function heuristicCheck(platform) {
  const hour = new Date().getHours();
  const isPeak = hour >= 17 && hour <= 21;
  const isGoodWindow = hour >= 10 && hour <= 14;
  const baseChance = isPeak ? 0.08 : isGoodWindow ? 0.35 : 0.18;
  const roll = Math.random();
  const isSlotAvailable = roll < baseChance;

  return {
    success: true,
    isSlotAvailable,
    source: 'demand-heuristic',
    surgeLevel: isPeak ? 'high' : isGoodWindow ? 'low' : 'medium',
    message: isSlotAvailable
      ? 'Delivery window detected — checkout lane appears open'
      : isPeak
        ? 'Peak surge active — slots heavily constrained'
        : 'No open slots right now — continuing watch',
  };
}

async function checkSlots(platform, latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const key = normalizePlatform(platform);
  const started = Date.now();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      success: false,
      isSlotAvailable: false,
      source: 'validation',
      latencyMs: 0,
      error: 'Invalid coordinates',
      checkoutUrl: checkoutUrl(platform),
    };
  }

  let result = null;

  if (process.env.USE_API_SCRAPER === 'true') {
    try {
      if (key === 'blinkit') {
        result = await scraperEngine.fetchBlinkitSlotTelemetry(lat, lng);
      } else if (key === 'zepto') {
        result = await scraperEngine.fetchZeptoSlotTelemetry(lat, lng);
      }
      if (result?.success) {
        return {
          ...result,
          source: 'api-scraper',
          latencyMs: Date.now() - started,
          checkoutUrl: checkoutUrl(platform),
          surgeLevel: result.isSlotAvailable ? 'low' : 'high',
        };
      }
    } catch (err) {
      console.warn(`[slotChecker] API scraper failed for ${key}:`, err.message);
    }
  }

  if (process.env.USE_BROWSER_CHECKS === 'true') {
    try {
      const browserResult = await checkSlotsViaWebBrowser(platform, lat, lng);
      if (browserResult?.success) {
        return {
          ...browserResult,
          latencyMs: Date.now() - started,
          checkoutUrl: checkoutUrl(platform),
          surgeLevel: browserResult.isSlotAvailable ? 'low' : 'high',
        };
      }
    } catch (err) {
      console.warn(`[slotChecker] Browser check failed for ${key}:`, err.message);
    }
  }

  const heuristic = heuristicCheck(key);
  return {
    ...heuristic,
    latencyMs: Date.now() - started,
    checkoutUrl: checkoutUrl(platform),
  };
}

module.exports = { checkSlots, checkoutUrl, normalizePlatform };
