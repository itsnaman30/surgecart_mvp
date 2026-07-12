jest.mock('../services/browserEngine', () => ({
  checkSlotsViaWebBrowser: jest.fn(),
}));
jest.mock('../services/scraperEngine', () => ({
  fetchBlinkitSlotTelemetry: jest.fn(),
  fetchZeptoSlotTelemetry: jest.fn(),
}));

const { checkSlotsViaWebBrowser } = require('../services/browserEngine');
const scraperEngine = require('../services/scraperEngine');
const { checkSlots } = require('../services/slotChecker');

describe('slotChecker.checkSlots', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
    if (Math.random.mockRestore) Math.random.mockRestore();
  });

  it('rejects invalid coordinates without hitting any scraper', async () => {
    const res = await checkSlots('Blinkit', 'abc', 'def');

    expect(res.success).toBe(false);
    expect(res.isSlotAvailable).toBe(false);
    expect(res.source).toBe('validation');
    expect(res.error).toBe('Invalid coordinates');
    expect(res.checkoutUrl).toBe('https://blinkit.com/');
    expect(checkSlotsViaWebBrowser).not.toHaveBeenCalled();
  });

  it('falls back to the demand heuristic when no scraper is enabled', async () => {
    delete process.env.USE_API_SCRAPER;
    delete process.env.USE_BROWSER_CHECKS;
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // no slot available

    const res = await checkSlots('Zepto', '13.0', '80.2');

    expect(res.success).toBe(true);
    expect(res.source).toBe('demand-heuristic');
    expect(res.isSlotAvailable).toBe(false);
    expect(res.checkoutUrl).toBe('https://www.zeptonow.com/');
    expect(typeof res.latencyMs).toBe('number');
  });

  it('uses the API scraper result when USE_API_SCRAPER is enabled', async () => {
    process.env.USE_API_SCRAPER = 'true';
    scraperEngine.fetchBlinkitSlotTelemetry.mockResolvedValue({
      success: true,
      isSlotAvailable: true,
    });

    const res = await checkSlots('Blinkit', '13.0', '80.2');

    expect(scraperEngine.fetchBlinkitSlotTelemetry).toHaveBeenCalledWith(13.0, 80.2);
    expect(res.source).toBe('api-scraper');
    expect(res.isSlotAvailable).toBe(true);
    expect(res.surgeLevel).toBe('low');
  });

  it('uses the browser check result when USE_BROWSER_CHECKS is enabled', async () => {
    delete process.env.USE_API_SCRAPER;
    process.env.USE_BROWSER_CHECKS = 'true';
    checkSlotsViaWebBrowser.mockResolvedValue({
      success: true,
      isSlotAvailable: false,
      source: 'browser',
    });

    const res = await checkSlots('Instamart', '13.0', '80.2');

    expect(checkSlotsViaWebBrowser).toHaveBeenCalled();
    expect(res.source).toBe('browser');
    expect(res.surgeLevel).toBe('high');
    expect(res.checkoutUrl).toBe('https://www.swiggy.com/instamart');
  });
});
