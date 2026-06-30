// server/services/notificationService.js

const sendPushNotification = async (fcmToken, platform) => {
  console.log(`📡 [Mock Firebase] Sending push alert to device token: ${fcmToken} for ${platform}`);
  return true;
};

module.exports = { sendPushNotification };