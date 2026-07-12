const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const wishlistService = require('../services/wishlistService');

function extractMeta(html) {
  const meta = {};
  const ogTitle = html.match(/<meta\s+property=(?:"|')og:title(?:"|')\s+content=(?:"|')(.*?)(?:"|')/i);
  const ogUrl = html.match(/<meta\s+property=(?:"|')og:url(?:"|')\s+content=(?:"|')(.*?)(?:"|')/i);
  const titleTag = html.match(/<title>(.*?)<\/title>/i);
  if (ogTitle) meta.title = ogTitle[1];
  if (ogUrl) meta.url = ogUrl[1];
  if (!meta.title && titleTag) meta.title = titleTag[1];
  return meta;
}

module.exports = function (io) {
  router.post('/preview', requireAuth, async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: 'url required' });
      const { scrapeProduct } = require('../services/productScraper');
      const scraped = await scrapeProduct(url);
      res.json({ title: scraped.title || '', checkoutUrl: scraped.checkoutUrl || url, price: scraped.price });
    } catch (err) {
      // Preview is best-effort: fall back to an empty preview but log so the
      // scrape failure is not silently swallowed.
      console.warn('[wishlist] preview scrape failed:', err && (err.stack || err.message || err));
      res.status(200).json({ title: '', checkoutUrl: req.body?.url || '', price: null });
    }
  });

  router.get('/', requireAuth, async (req, res) => {
    try {
      const items = await wishlistService.findByUser(req.userId);
      res.json(items);
    } catch (err) {
      console.error('[wishlist] Failed to load wishlist:', err && (err.stack || err.message || err));
      res.status(500).json({ error: 'Failed to load wishlist' });
    }
  });

  router.post('/', requireAuth, async (req, res) => {
    try {
      const payload = req.body || {};
      const item = await wishlistService.createForUser(req.userId, payload);

      // Optional: if user requested monitoring and provided coords, create a track
      if (item.monitor && item.latitude != null && item.longitude != null) {
        try {
          // Safety check: consult weather service before creating an active track
          const weatherService = require('../services/weatherService');
          const weatherCheck = await weatherService.checkSevereWeather(item.latitude, item.longitude);

          // If severe conditions and user did NOT explicitly opt-in, skip creating the track
          if (weatherCheck.severe && !payload.allowDangerousDelivery) {
            console.log('[wishlist] severe weather detected; skipping track creation for', item.id, weatherCheck.reason);
            // Respond with created wishlist item and a warning for the client
            return res.status(201).json({ item, warning: 'Severe weather detected near this location. Monitoring not started. Enable explicit delivery opt-in to override.' });
          }

          const trackStore = require('../services/trackStore');
          const pollingEngine = require('../services/pollingEngine');
          const track = await trackStore.create({
            platform: item.platform,
            location: item.location || `${item.title}`,
            latitude: item.latitude,
            longitude: item.longitude,
            phoneNumber: '',
            userId: req.userId,
            pollingIntervalMs: pollingEngine.getGlobalPollingInterval(),
          });
          pollingEngine.startTrackPolling(io, track);
        } catch (err) {
          // ignore track creation errors, wishlist should succeed
          console.error('[wishlist] track create failed', err && err.message ? err.message : err);
        }
      }

      res.status(201).json(item);
    } catch (err) {
      console.error('[wishlist] Failed to save item:', err && (err.stack || err.message || err));
      res.status(500).json({ error: 'Failed to save item' });
    }
  });

  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const removed = await wishlistService.removeById(req.params.id, req.userId);
      if (!removed) return res.status(404).json({ error: 'Item not found' });
      res.json({ message: 'Removed', item: removed });
    } catch (err) {
      console.error('[wishlist] Failed to remove item:', err && (err.stack || err.message || err));
      res.status(500).json({ error: 'Failed to remove item' });
    }
  });

  return router;
};
