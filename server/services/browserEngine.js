const { chromium } = require('playwright');
const { SURGE_PATTERNS, normalizePlatform } = require('./platformConstants');

function detectSurgeFromText(text, platformKey) {
  const lower = (text || '').toLowerCase();
  const patterns = SURGE_PATTERNS[platformKey] || [];
  const isThrottled = patterns.some((p) => lower.includes(p));
  const hasOpenSlot = lower.includes('deliver') && !isThrottled && (
    lower.includes('minutes') ||
    lower.includes('slot') ||
    lower.includes('checkout') ||
    lower.includes('add to cart')
  );

  return {
    isSlotAvailable: hasOpenSlot && !isThrottled,
    isThrottled,
  };
}

async function checkSlotsViaWebBrowser(platform, latitude, longitude) {
  let browser;
  const platformKey = normalizePlatform(platform);

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    let pageContent = '';

    if (platformKey === 'blinkit') {
      await page.goto('https://blinkit.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      const detectBtn = page.locator('button:has-text("Detect my location")');
      if (await detectBtn.count()) {
        await detectBtn.first().click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(4000);
      }
      pageContent = await page.textContent('body') || '';
    } else if (platformKey === 'zepto') {
      await page.goto('https://www.zeptonow.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      const locationTrigger = page.locator('text=/location|deliver to|enter location/i').first();
      if (await locationTrigger.count()) {
        await locationTrigger.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
      }
      pageContent = await page.textContent('body') || '';
    } else if (platformKey === 'instamart') {
      await page.goto('https://www.swiggy.com/instamart', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      pageContent = await page.textContent('body') || '';
    } else {
      return { success: false, isSlotAvailable: false, error: 'Unsupported platform' };
    }

    const { isSlotAvailable, isThrottled } = detectSurgeFromText(pageContent, platformKey);

    return {
      success: true,
      isSlotAvailable,
      source: 'browser',
      message: isSlotAvailable
        ? 'Browser scan found an open delivery window'
        : isThrottled
          ? 'Peak surge detected on platform — no slots showing'
          : 'Browser scan complete — slots still closed',
      surgeLevel: isSlotAvailable ? 'low' : 'high',
    };
  } catch (error) {
    console.error(`[browserEngine] ${platform} check failed:`, error.message);
    return { success: false, isSlotAvailable: false, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { checkSlotsViaWebBrowser };
