const router = require('express').Router();
const Watch = require('../models/Watch');
const { sendPushNotification } = require('../services/notificationService');

// Sandbox endpoint to simulate a successful slot check manually
router.post('/simulate-slot/:watchId', async (req, res) => {
  try {
    const { watchId } = req.params;
    const task = await Watch.findById(watchId);

    if (!task) {
      return res.status(404).json({ error: "Watch instance not found" });
    }

    // Force update status to Notified
    task.status = 'Notified';
    await task.save();

    // Trigger FCM notification if a token is registered
    if (task.fcmToken) {
      await sendPushNotification(task.fcmToken, task.platform);
    }

    // Direct access to your globally instantiated socket server instance to alert UI
    // req.app.get('io').emit('slot-found', task);

    return res.json({ 
      success: true, 
      message: `Simulated slot clear successfully for ${task.platform}` 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;