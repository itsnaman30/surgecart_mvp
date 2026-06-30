const axios = require('axios');

const checkBlinkitSlot = async (lat, lng) => {
  try {
    // To survive Blinkit's Cloudflare checks, your headers MUST match a real phone
    const response = await axios.post('https://api2.grofers.com/v1/layout/feed', {}, {
      headers: {
        'app_client': 'consumer_android',
        'lat': lat.toString(),
        'lon': lng.toString(),
        'User-Agent': 'okhttp/4.9.1', // Simulates the Android app networking engine
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    
    // Evaluate if the store is facing a surge. 
    // Blinkit passes flags like "is_unserviceable" or "surge_status" inside their layout objects.
    if (data && !data.is_unserviceable && !data.high_demand_alert) {
      return { 
        available: true, 
        message: "⚡ Blinkit slot found! Proceed to cart." 
      };
    }

    return { available: false };
  } catch (error) {
    console.error("Blinkit Check Failed:", error.message);
    // If blocked with a 403 or 429, safely return false so your main system doesn't crash
    return { available: false };
  }
};

module.exports = { checkBlinkitSlot };