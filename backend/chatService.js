/**
 * backend/chatService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Firestore real-time messaging helpers. Messages are protected by Firestore's
 * encryption in transit / at rest and by participant-only security rules;
 * they are not end-to-end encrypted.
 *
 * Collection: `chats`
 *   {
 *     participants:     string[2]          — [uid_A, uid_B]
 *     participantNames: { [uid]: name }    — display names keyed by uid
 *     reporterUid:      string             — uid of the item's original reporter
 *     itemId:           string
 *     itemName:         string
 *     createdAt:        Timestamp
 *     lastMessage:      string | null      — preview (legacy chats: AES ciphertext)
 *     lastMessageTime:  Timestamp | null
 *     handover:         { confirmedBy: uid, confirmedAt: Timestamp }
 *                       — optional; set once by the participant who is NOT
 *                         reporterUid after the item changes hands
 *   }
 *
 * Sub-collection: `chats/{chatId}/messages`
 *   {
 *     text:       string     — message text (legacy messages: AES ciphertext)
 *     senderId:   string
 *     senderName: string
 *     timestamp:  Timestamp
 *   }
 */

import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { db } from '../firebaseConfig';

// ─── Legacy message decoding ──────────────────────────────────────────────────
// Older messages were AES-encrypted with a key derived from the chat ID and a
// salt shipped in the app. Anyone able to read the chat could derive that key,
// so it gave no protection beyond Firestore's own encryption in transit and at
// rest plus the participant-only security rules. New messages are stored as
// plain text; this decoder only keeps old messages readable.

const LEGACY_SALT = 'CampusFinder_E2E_SecureChat_v1';
const LEGACY_PREFIX = 'U2FsdGVkX1';   // base64 of CryptoJS's "Salted__" header

const legacyKey = (chatId) =>
  CryptoJS.SHA256(chatId + LEGACY_SALT).toString(CryptoJS.enc.Hex);

export const decodeMessageText = (text, chatId) => {
  if (!text) return '';
  if (!text.startsWith(LEGACY_PREFIX)) return text;
  try {
    const plain = CryptoJS.AES.decrypt(text, legacyKey(chatId)).toString(CryptoJS.enc.Utf8);
    return plain || text;
  } catch {
    return text;
  }
};

// ─── Create / find chat ───────────────────────────────────────────────────────

/**
 * Return the ID of an existing chat, or create one.
 *
 * Uses a single array-contains query so NO composite Firestore index is needed.
 * All further filtering is done in JavaScript.
 *
 * @param {string} currentUserId
 * @param {string} currentUserName   — display name of the person starting the chat
 * @param {string} otherUserId       — uid of the item reporter
 * @param {string} otherUserName     — display name of the item reporter
 * @param {string} itemId
 * @param {string} itemName
 * @returns {Promise<string>} chatId
 */
export const createOrGetChat = async (
  currentUserId,
  currentUserName,
  otherUserId,
  otherUserName,
  itemId,
  itemName,
) => {
  const chatsRef = collection(db, 'chats');

  // Single-condition query — no composite index required
  const q = query(chatsRef, where('participants', 'array-contains', currentUserId));
  const snap = await getDocs(q);

  // Match in JS: same item + other participant
  const existing = snap.docs.find((d) => {
    const data = d.data();
    return (
      data.itemId === itemId &&
      Array.isArray(data.participants) &&
      data.participants.includes(otherUserId)
    );
  });

  if (existing) return existing.id;

  // Create a new chat document with participant names stored for the inbox.
  // Both names are always present so the inbox never has to look them up.
  const ref = await addDoc(chatsRef, {
    participants:     [currentUserId, otherUserId],
    participantNames: {
      [currentUserId]: currentUserName?.trim() || 'Student',
      [otherUserId]:   otherUserName?.trim()   || 'Student',
    },
    reporterUid:      otherUserId,   // who owns the item
    itemId,
    itemName,
    createdAt:        serverTimestamp(),
    lastMessage:      null,
    lastMessageTime:  null,
  });

  return ref.id;
};

/**
 * Return the ID of a chat the user already has about an item, or null.
 *
 * @param {string} userId
 * @param {string} itemId
 * @returns {Promise<string|null>}
 */
export const findChatForItem = async (userId, itemId) => {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId));
  const snap = await getDocs(q);
  const match = snap.docs.find((d) => d.data().itemId === itemId);
  return match ? match.id : null;
};

// ─── Handover ─────────────────────────────────────────────────────────────────

/**
 * Record that the non-reporter received / handed over the item.
 * Firestore rules allow this once, only for the participant who is not the
 * reporter, and only with their own uid.
 *
 * @param {string} chatId
 * @param {string} uid  uid of the signed-in (non-reporter) participant
 */
export const confirmHandover = async (chatId, uid) => {
  await updateDoc(doc(db, 'chats', chatId), {
    handover: { confirmedBy: uid, confirmedAt: serverTimestamp() },
  });
};

// ─── Send message ─────────────────────────────────────────────────────────────

export const sendMessage = async (chatId, text, senderId, senderName) => {
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    text,
    senderId,
    senderName,
    timestamp: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'chats', chatId),
    { lastMessage: text, lastMessageTime: serverTimestamp() },
    { merge: true },
  );
};

// ─── Listeners ────────────────────────────────────────────────────────────────

/**
 * Subscribe to the chat document itself (participants, reporterUid, handover).
 * The callback receives `null` if the chat does not exist.
 */
export const subscribeToChat = (chatId, callback, onError) =>
  onSnapshot(
    doc(db, 'chats', chatId),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => {
      console.error('[chatService] subscribeToChat error:', err);
      if (onError) onError(err);
    },
  );

/**
 * Subscribe to messages in a chat, decoding legacy encrypted ones on arrival.
 */
export const subscribeToMessages = (chatId, callback, onError) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
  );

  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map((d) => {
        const data = d.data();
        return {
          id:   d.id,
          ...data,
          text: decodeMessageText(data.text, chatId),
        };
      });
      callback(messages);
    },
    (err) => {
      console.error('[chatService] subscribeToMessages error:', err);
      if (onError) onError(err);
    },
  );
};

/**
 * Subscribe to all chats for a user (for the Inbox screen).
 *
 * ⚠️  Uses only a single where() clause so NO composite index is required.
 *     Sorting by lastMessageTime is done in JavaScript.
 */
export const subscribeToUserChats = (userId, callback, onError) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
  );

  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            lastMessage: data.lastMessage
              ? decodeMessageText(data.lastMessage, d.id)
              : null,
          };
        })
        // Sort newest-first in JS (avoids the composite index requirement)
        .sort((a, b) => {
          const tA = a.lastMessageTime?.toDate?.()?.getTime() ?? 0;
          const tB = b.lastMessageTime?.toDate?.()?.getTime() ?? 0;
          return tB - tA;
        });

      callback(chats);
    },
    (err) => {
      console.error('[chatService] subscribeToUserChats error:', err);
      if (onError) onError(err);
    },
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date  = timestamp.toDate();
  const now   = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    // Today — show time only
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
