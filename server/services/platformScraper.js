const axios = require('axios');

const checkZeptoSlot = async (location) => {
    try {
        // Example logic: Zepto often uses internal APIs to check serviceability
        // In a real scenario, you'd find the endpoint via Network Tab inspection
        const response = await axios.get(`https://api.zepto.com/v1/serviceability`, {
            params: { address: location },
            headers: { 'User-Agent': 'SurgeCart-Bot/1.0' }
        });

        // If 'is_serviceable' is true and 'surge' is false
        return response.data.is_serviceable && !response.data.high_demand;
    } catch (error) {
        console.error("Zepto Check Failed:", error.message);
        return false;
    }
};

module.exports = { checkZeptoSlot };