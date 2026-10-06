/**
 * backend/notificationService.js
 * --------------------------------
 * Remote push notifications for incoming chat messages.
 *
 * Flow:
 *  1. App.js calls registerPushToken(uid) once the user is signed in and
 *     verified. The device's Expo push token is saved to
 *     `users/{uid}.expoPushTokens` (readable only by that user).
 *  2. The `notifyOnNewMessage` Cloud Function (functions/index.js) runs when a
 *     message is written to `chats/{chatId}/messages`, looks up the
 *     recipient's tokens and sends the push through Expo's push service.
 *     This works even when the recipient's app is closed.
 *  3. ChatScreen calls setActiveChat(chatId) so pushes for the chat the user
 *     is already looking at are not shown as banners.
 *  4. unregisterPushToken(uid) runs on logout so a shared device stops
 *     receiving the previous user's messages.
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Chat currently open on screen — its pushes are handled in-app instead
let activeChatId = null;

export const setActiveChat = (chatId) => {
  activeChatId = chatId ?? null;
};

// ── Foreground notification behaviour ────────────────────────────────────────
// Show pushes as banners while the app is open, except for the chat the user
// is already viewing (ChatScreen shows its own toast there).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const chatId  = notification.request.content.data?.chatId;
    const showing = !chatId || chatId !== activeChatId;
    return {
      shouldShowBanner: showing,
      shouldShowList:   showing,
      shouldPlaySound:  showing,
      shouldSetBadge:   showing,
    };
  },
});

// ── Android notification channel ─────────────────────────────────────────────
// Must match the channelId the Cloud Function sends with.
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

const requestPermission = async () => {
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
};

// ── Push token registration ───────────────────────────────────────────────────

// Token registered by this device, remembered for unregisterPushToken
let registeredToken = null;

/**
 * Ask for notification permission, get this device's Expo push token and save
 * it to the user's profile. Safe to call on every launch.
 *
 * Requires an EAS project ID (`npx eas init`) and a development or production
 * build — Expo Go on Android cannot receive remote pushes.
 *
 * @param {string} uid
 * @returns {Promise<boolean>} true if a token was saved
 */
export const registerPushToken = async (uid) => {
  if (Platform.OS === 'web') return false;
  try {
    await ensureChannel();
    if (!(await requestPermission())) return false;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[Notifications] No EAS projectId — run `npx eas init` to enable push notifications.');
      return false;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    // uid is included so the write passes the users rule even if the profile
    // document does not exist yet.
    await setDoc(
      doc(db, 'users', uid),
      { uid, expoPushTokens: arrayUnion(token) },
      { merge: true },
    );
    registeredToken = token;
    return true;
  } catch (err) {
    console.warn('[Notifications] Push registration failed:', err?.message ?? err);
    return false;
  }
};

/**
 * Remove this device's push token from the user's profile (call before
 * signing out, while the user can still write their own document).
 *
 * @param {string} uid
 */
export const unregisterPushToken = async (uid) => {
  if (!registeredToken) return;
  try {
    await updateDoc(doc(db, 'users', uid), { expoPushTokens: arrayRemove(registeredToken) });
  } catch (err) {
    console.warn('[Notifications] Could not remove push token:', err?.message ?? err);
  }
  registeredToken = null;
};

// ── Clear badge when chat is opened ──────────────────────────────────────────

export const clearBadge = async () => {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // non-critical — ignore
  }
};

// ── Notification taps ─────────────────────────────────────────────────────────

const toTap = (response) => ({
  id:   response.notification.request.identifier,
  data: response.notification.request.content.data ?? {},
});

/**
 * Listen for the user tapping a notification.
 * Returns the remove() function to call on unmount.
 *
 * @param {(tap: { id: string, data: object }) => void} onTap
 */
export const addNotificationTapListener = (onTap) => {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(toTap(response));
  });
  return () => sub.remove();
};

/**
 * The notification tap that launched the app from a killed state, if any.
 * Cleared once read so it is not handled again on a later launch.
 *
 * @returns {{ id: string, data: object } | null}
 */
export const takeLaunchNotificationTap = () => {
  if (Platform.OS === 'web') return null;
  const response = Notifications.getLastNotificationResponse();
  if (!response) return null;
  Notifications.clearLastNotificationResponse();
  return toTap(response);
};
