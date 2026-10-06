/**
 * functions/index.js
 * ------------------
 * Cloud Functions for CampusFinder.
 *
 * notifyOnNewMessage
 *   Runs when a message is written to `chats/{chatId}/messages/{messageId}`
 *   and sends a push notification to the other participant through Expo's
 *   push service, using the tokens the app saves in `users/{uid}.expoPushTokens`.
 *   Tokens Expo reports as no longer registered are removed.
 *
 * Deploy: `firebase deploy --only functions` (requires the Blaze plan).
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;         // Expo accepts at most 100 messages per request
const CHANNEL_ID = 'chat-messages';  // must match backend/notificationService.js
const LEGACY_PREFIX = 'U2FsdGVkX1';  // old AES-encrypted messages (see chatService.js)
const MAX_BODY_LENGTH = 120;

const previewText = (text) => {
  if (!text) return 'New message';
  if (text.startsWith(LEGACY_PREFIX)) return 'New message';
  return text.length > MAX_BODY_LENGTH ? `${text.slice(0, MAX_BODY_LENGTH)}…` : text;
};

const sendToExpo = async (messages) => {
  const tickets = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method:  'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      throw new Error(`Expo push request failed (HTTP ${res.status}): ${await res.text()}`);
    }
    const { data } = await res.json();
    tickets.push(...data);
  }
  return tickets;
};

exports.notifyOnNewMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const { chatId } = event.params;
    const chatSnap = await db.doc(`chats/${chatId}`).get();
    if (!chatSnap.exists) return;
    const chat = chatSnap.data();

    const recipients = (chat.participants ?? []).filter((uid) => uid !== message.senderId);
    if (recipients.length === 0) return;

    const senderName = message.senderName?.trim() || 'Student';

    // [{ uid, token }] for every device of every recipient
    const targets = [];
    for (const uid of recipients) {
      const userSnap = await db.doc(`users/${uid}`).get();
      const tokens = userSnap.get('expoPushTokens') ?? [];
      tokens.forEach((token) => targets.push({ uid, token }));
    }
    if (targets.length === 0) return;

    const pushes = targets.map(({ token }) => ({
      to:        token,
      title:     `💬 ${senderName}`,
      subtitle:  chat.itemName ? `Re: ${chat.itemName}` : undefined,   // iOS only
      body:      previewText(message.text),
      sound:     'default',
      priority:  'high',
      channelId: CHANNEL_ID,
      // Read by App.js to open the chat when the notification is tapped
      data: {
        chatId,
        itemId:      chat.itemId,
        itemName:    chat.itemName,
        reporterUid: chat.reporterUid,
        senderId:    message.senderId,
        senderName,
      },
    }));

    const tickets = await sendToExpo(pushes);

    // Drop tokens for uninstalled apps / revoked permissions
    const stale = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status !== 'error') return;
      if (ticket.details?.error === 'DeviceNotRegistered') {
        stale.push(targets[i]);
      } else {
        logger.warn('Expo push error', { chatId, error: ticket.message, details: ticket.details });
      }
    });

    await Promise.all(stale.map(({ uid, token }) =>
      db.doc(`users/${uid}`).update({ expoPushTokens: FieldValue.arrayRemove(token) })));
  },
);
