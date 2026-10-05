/**
 * backend/chatService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Firestore real-time messaging helpers with AES-256 encryption.
 *
 * Collection: `chats`
 *   {
 *     participants:     string[2]          — [uid_A, uid_B]
 *     participantNames: { [uid]: name }    — display names keyed by uid
 *     reporterUid:      string             — uid of the item's original reporter
 *     itemId:           string
 *     itemName:         string
 *     createdAt:        Timestamp
 *     lastMessage:      string | null      — AES-256 ciphertext preview
 *     lastMessageTime:  Timestamp | null
 *   }
 *
 * Sub-collection: `chats/{chatId}/messages`
 *   {
 *     text:       string     — AES-256 ciphertext
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
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { db } from '../firebaseConfig';

// ─── Encryption ───────────────────────────────────────────────────────────────

const ENCRYPTION_SALT = 'CampusFinder_E2E_SecureChat_v1';

const deriveKey = (chatId) =>
  CryptoJS.SHA256(chatId + ENCRYPTION_SALT).toString(CryptoJS.enc.Hex);

export const encryptMessage = (plainText, chatId) => {
  try {
    return CryptoJS.AES.encrypt(plainText, deriveKey(chatId)).toString();
  } catch {
    return plainText;
  }
};

export const decryptMessage = (cipherText, chatId) => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, deriveKey(chatId));
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    return plain || cipherText;   // fallback for legacy plain-text messages
  } catch {
    return cipherText;
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

  // Create a new chat document with participant names stored for the inbox
  const ref = await addDoc(chatsRef, {
    participants:     [currentUserId, otherUserId],
    participantNames: {
      [currentUserId]: currentUserName,
      [otherUserId]:   otherUserName,
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

// ─── Send message ─────────────────────────────────────────────────────────────

export const sendMessage = async (chatId, plainText, senderId, senderName) => {
  const encryptedText = encryptMessage(plainText, chatId);

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    text:      encryptedText,
    senderId,
    senderName,
    timestamp: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'chats', chatId),
    { lastMessage: encryptedText, lastMessageTime: serverTimestamp() },
    { merge: true },
  );
};

// ─── Listeners ────────────────────────────────────────────────────────────────

/**
 * Subscribe to messages in a chat, decrypting each one on arrival.
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
          id:          d.id,
          ...data,
          text:        decryptMessage(data.text, chatId),
          isEncrypted: true,
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
            // Decrypt the preview so the inbox can display it
            lastMessage: data.lastMessage
              ? decryptMessage(data.lastMessage, d.id)
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
