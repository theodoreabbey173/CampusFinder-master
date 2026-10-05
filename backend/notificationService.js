/**
 * backend/notificationService.js
 * --------------------------------
 * Handles local push notifications for incoming chat messages.
 *
 * Flow:
 *  1. Call registerForNotifications() once on app start / ChatScreen mount.
 *  2. Call showMessageNotification() whenever a new message arrives from
 *     another user while the app is backgrounded.
 *  3. Call clearBadge() when the user opens the chat screen.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Foreground notification behaviour ────────────────────────────────────────
// We handle foreground alerts ourselves (animated toast in ChatScreen),
// so we suppress the system banner in foreground but still play the sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,   // suppressed in foreground — we show our own toast
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Android notification channel ─────────────────────────────────────────────
const CHANNEL_ID = 'chat-messages';

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name:              'Chat Messages',
    importance:        Notifications.AndroidImportance.HIGH,
    vibrationPattern:  [0, 150, 100, 150],
    lightColor:        '#2196F3',
    sound:             'default',
    description:       'Alerts for new CampusFinder chat messages',
  });
};

// ── Permission request ────────────────────────────────────────────────────────

/**
 * Request notification permissions and set up the Android channel.
 * Returns true if permission was granted.
 */
export const registerForNotifications = async () => {
  try {
    await ensureChannel();

    const { status: current } = await Notifications.getPermissionsAsync();
    if (current === 'granted') return true;

    const { status: requested } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
      },
    });

    return requested === 'granted';
  } catch (err) {
    console.warn('[Notifications] Registration failed:', err);
    return false;
  }
};

// ── Show a message notification ───────────────────────────────────────────────

/**
 * Fire an immediate local notification for an incoming chat message.
 * Only call this when the app is in the background / a different screen.
 *
 * @param {string} senderName  - Display name of the sender
 * @param {string} messageText - Decrypted message preview
 * @param {string} itemName    - Name of the item the chat is about
 */
export const showMessageNotification = async (senderName, messageText, itemName) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title:    `💬 ${senderName}`,
        body:     messageText.length > 80 ? messageText.slice(0, 80) + '…' : messageText,
        subtitle: `Re: ${itemName}`,
        sound:    'default',
        badge:    1,
        data:     { screen: 'Chat' },
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
      trigger: null,   // fire immediately
    });
  } catch (err) {
    console.warn('[Notifications] Could not schedule notification:', err);
  }
};

// ── Clear badge when chat is opened ──────────────────────────────────────────

export const clearBadge = async () => {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // non-critical — ignore
  }
};

// ── Notification tap listener ─────────────────────────────────────────────────

/**
 * Listen for the user tapping a notification.
 * Returns the remove() function to call on unmount.
 *
 * @param {(data: object) => void} onTap
 */
export const addNotificationTapListener = (onTap) => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    onTap(data);
  });
  return () => sub.remove();
};
