const axios = require('axios');
const proxyManager = require('./proxyManager');

class QuickCommerceScraperClient {
  async fetchBlinkitSlotTelemetry(latitude, longitude) {
    // 🚀 NEW: Dynamically generate individual session routing properties
    const { httpsAgent, proxyUrl } = proxyManager.getRotatedAgent();
    const dynamicHeaders = proxyManager.generateDeviceFingerprint();

    try {
      console.log(`📡 [Scraper Routing] Dispatching Blinkit Query via Proxy node: ${proxyUrl}`);
      
      const locationSyncUrl = 'https://api.blinkit.com/v5/client/address/serviceable/';
      const locationPayload = { lat: latitude, lon: longitude, address_id: null };

      const sessionCheck = await axios.post(locationSyncUrl, locationPayload, { 
        headers: {
          ...dynamicHeaders,
          'app-version': '12.0.4', 
          'app-client': 'android_web',
          'secret-token': process.env.BLINKIT_SESSION_TOKEN || 'guest_token_matrix'
        },
        httpsAgent, // Bind proxy configuration securely
        timeout: 120000
      });

      const merchantId = sessionCheck.data?.data?.merchant_id;
      if (!merchantId) {
        return { success: false, isSlotAvailable: false, error: "Out of bounds area." };
      }

      const slotMatrixUrl = `https://api.blinkit.com/v5/merchant/${merchantId}/delivery_slots/`;
      const slotResponse = await axios.get(slotMatrixUrl, { 
        headers: dynamicHeaders,
        httpsAgent,
        timeout: 120000
      });

      const slotData = slotResponse.data?.data || {};
      
      return {
        success: true,
        merchantNode: merchantId,
        isSlotAvailable: Array.isArray(slotData.slots) && slotData.slots.length > 0,
        backloggedQueueSize: slotData.current_backlog_count || 0
      };

    } catch (error) {
      console.error(`🚨 [Scraper Network Failure] Proxy Node execution dropped: ${error.message}`);
      return { success: false, isSlotAvailable: false, error: error.message };
    }
  }

  async fetchZeptoSlotTelemetry(latitude, longitude) {
    const { httpsAgent, proxyUrl } = proxyManager.getRotatedAgent();
    const dynamicHeaders = proxyManager.generateDeviceFingerprint();

    try {
      console.log(`📡 [Scraper Routing] Dispatching Zepto Query via Proxy node: ${proxyUrl}`);

      const zeptoGatewayUrl = 'https://api.zeptonow.com/api/v1/delivery/slots/';
      
      const response = await axios.get(zeptoGatewayUrl, {
        params: { latitude, longitude, cart_value: "500.00" },
        headers: {
          ...dynamicHeaders,
          'Authorization': `Bearer ${process.env.ZEPTO_AUTH_TOKEN}`,
          'app-version': '6.42.0'
        },
        httpsAgent,
        timeout: 120000
      });

      const slotPayload = response.data || [];
      const openWindows = slotPayload.filter(slot => slot.is_available === true);

      return {
        success: true,
        isSlotAvailable: openWindows.length > 0,
        availableSlotsCount: openWindows.length
      };

    } catch (error) {
      console.error(`🚨 [Scraper Network Failure] Proxy Node execution dropped: ${error.message}`);
      return { success: false, isSlotAvailable: false, error: error.message };
    }
  }
}

module.exports = new QuickCommerceScraperClient();