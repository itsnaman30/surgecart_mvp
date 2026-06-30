import { getMessaging, getToken } from "firebase/messaging";

export const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' });
    // Send this token to your backend to save it to the User model
    return token;
  }
  return null;
};