const axios = require('axios');

const checkZeptoSlot = async (lat, lng) => {
  try {
    // Note: In 2026, ensure you use a clean User-Agent header 
    // to avoid being flagged as a basic bot.
    const response = await axios.get(`https://api.zepto.co/api/v1/serviceability/`, {
      params: { lat, lng },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json'
      }
    });

    // Check if slots are available based on the ETA or status field
    const data = response.data;
    if (data.is_serviceable && data.delivery_eta) {
      return { available: true, message: `Slot open! ETA: ${data.delivery_eta} mins` };
    }
    
    return { available: false };
  } catch (error) {
    console.error("Zepto Check Error:", error.message);
    return { available: false };
  }
};

module.exports = { checkZeptoSlot };