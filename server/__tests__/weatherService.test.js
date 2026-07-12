jest.mock('axios');
const axios = require('axios');

describe('weatherService.checkSevereWeather', () => {
  const ORIGINAL_KEY = process.env.OPENWEATHER_API_KEY;

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.OPENWEATHER_API_KEY;
    } else {
      process.env.OPENWEATHER_API_KEY = ORIGINAL_KEY;
    }
    jest.clearAllMocks();
  });

  function loadWithKey(key) {
    if (key === undefined) {
      delete process.env.OPENWEATHER_API_KEY;
    } else {
      process.env.OPENWEATHER_API_KEY = key;
    }
    let mod;
    jest.isolateModules(() => {
      mod = require('../services/weatherService');
    });
    return mod;
  }

  it('short-circuits when no API key is configured', async () => {
    const { checkSevereWeather } = loadWithKey(undefined);
    const result = await checkSevereWeather(13, 80);
    expect(result).toEqual({ severe: false, reason: 'no_api_key' });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('flags a thunderstorm as severe', async () => {
    axios.get.mockResolvedValue({
      data: { weather: [{ main: 'Thunderstorm', description: 'heavy thunderstorm' }] },
    });
    const { checkSevereWeather } = loadWithKey('test-key');

    const result = await checkSevereWeather(13, 80);
    expect(result.severe).toBe(true);
    expect(result.reason).toContain('thunderstorm');
  });

  it('flags heavy rain (>=10mm) as severe', async () => {
    axios.get.mockResolvedValue({
      data: { weather: [{ main: 'Rain', description: 'rain' }], rain: { '1h': 12 } },
    });
    const { checkSevereWeather } = loadWithKey('test-key');

    const result = await checkSevereWeather(13, 80);
    expect(result.severe).toBe(true);
    expect(result.reason).toContain('heavy_rain_12mm');
  });

  it('flags high wind (>=15 m/s) as severe', async () => {
    axios.get.mockResolvedValue({
      data: { weather: [{ main: 'Clear', description: 'clear sky' }], wind: { speed: 20 } },
    });
    const { checkSevereWeather } = loadWithKey('test-key');

    const result = await checkSevereWeather(13, 80);
    expect(result.severe).toBe(true);
    expect(result.reason).toContain('high_wind_20mps');
  });

  it('reports calm weather as not severe', async () => {
    axios.get.mockResolvedValue({
      data: { weather: [{ main: 'Clear', description: 'clear sky' }], wind: { speed: 2 } },
    });
    const { checkSevereWeather } = loadWithKey('test-key');

    const result = await checkSevereWeather(13, 80);
    expect(result.severe).toBe(false);
    expect(result.reason).toBe('none');
  });

  it('returns a safe fallback when the request throws', async () => {
    axios.get.mockRejectedValue(new Error('network down'));
    const { checkSevereWeather } = loadWithKey('test-key');

    const result = await checkSevereWeather(13, 80);
    expect(result.severe).toBe(false);
    expect(result.reason).toBe('error');
    expect(result.raw.message).toBe('network down');
  });
});
