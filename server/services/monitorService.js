const { checkZeptoSlot } = require('./zeptoService');
const { sendPushNotification } = require('./notificationService');
const User = require('../models/User');

// Inside your cron job loop:
if (result.available) {
    const user = await User.findById(task.userId);
    if (user.fcmToken) {
        await sendPushNotification(user.fcmToken, task.platform);
    }
    task.status = 'Notified';
    await task.save();
}

const cron = require('node-cron');
const Watch = require('../models/Watch');
const { checkZeptoSlot } = require('./zeptoService');
const { checkBlinkitSlot } = require('./blinkitService');
const { sendPushNotification } = require('./notificationService');

cron.schedule('*/2 * * * *', async () => {
  console.log("⏰ Running multi-platform slot check engine...");
  
  const activeWatches = await Watch.find({ status: 'Watching' });

  for (const task of activeWatches) {
    let result = { available: false };

    // Dynamically hand off to the right scraper/API strategy
    if (task.platform === 'Zepto') {
      result = await checkZeptoSlot(task.lat, task.lng);
    } else if (task.platform === 'Blinkit') {
      result = await checkBlinkitSlot(task.lat, task.lng);
    }

    if (result.available) {
      task.status = 'Notified';
      await task.save();

      // Fire off the push notification to their phone
      if (task.fcmToken) {
        await sendPushNotification(task.fcmToken, task.platform);
      }
    }
  }
});