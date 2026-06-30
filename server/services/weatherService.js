const axios = require('axios');

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || '';

// Returns { severe: boolean, reason: string, raw: object }
async function checkSevereWeather(lat, lon) {
  if (!OPENWEATHER_KEY) return { severe: false, reason: 'no_api_key' };
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${OPENWEATHER_KEY}&units=metric`;
    const res = await axios.get(url, { timeout: 5000 });
    const data = res.data || {};

    // Heuristic: consider severe when heavy rain (>=10mm in last 1h/3h), thunderstorm codes, or very high wind
    const weather = Array.isArray(data.weather) && data.weather[0] ? data.weather[0] : null;
    const rainVol = (data.rain && (data.rain['1h'] || data.rain['3h'])) || 0;
    const wind = data.wind && data.wind.speed ? data.wind.speed : 0;

    const thunderstorm = weather && /thunder|storm/i.test(weather.description || weather.main || '');
    const heavyRain = rainVol >= 10; // mm
    const highWind = wind >= 15; // m/s (~54 km/h)

    const severe = thunderstorm || heavyRain || highWind;
    const reasons = [];
    if (thunderstorm) reasons.push('thunderstorm');
    if (heavyRain) reasons.push(`heavy_rain_${rainVol}mm`);
    if (highWind) reasons.push(`high_wind_${wind}mps`);

    return { severe, reason: reasons.join(',') || 'none', raw: data };
  } catch (err) {
    return { severe: false, reason: 'error', raw: { message: err.message } };
  }
}

module.exports = { checkSevereWeather };
