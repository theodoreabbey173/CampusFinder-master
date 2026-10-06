/**
 * backend/itemsService.js
 * -----------------------
 * Firestore CRUD for the `items` collection (lost & found reports).
 *
 * Collection: `items`
 *   Document shape:
 *   {
 *     id:           string  (auto-generated),
 *     name:         string,
 *     description:  string,
 *     location:     string,
 *     type:         'Lost' | 'Found',
 *     category:     string  (one of ITEM_CATEGORIES; optional on older items),
 *     occurredAt:   Timestamp (date the item was lost/found; optional on older items),
 *     status:       'open' | 'returned' (optional on older items → treated as 'open';
 *                   legacy 'Open' → 'open', legacy 'Resolved' → 'returned'),
 *     returnedAt:     Timestamp  (set when status becomes 'returned'),
 *     returnedTo:     string     (uid of the other chat participant),
 *     returnedChatId: string     (chat whose handover confirmation allowed the return),
 *     imageUrl:     string | null,
 *     reportedBy:   string  (user uid),
 *     reporterName: string,
 *     createdAt:    Timestamp,
 *   }
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const COLLECTION = 'items';

export const ITEM_CATEGORIES = [
  'Electronics',
  'Bags',
  'Books & Stationery',
  'ID & Cards',
  'Keys',
  'Clothing',
  'Accessories',
  'Other',
];

export const ITEM_STATUS = {
  OPEN:     'open',
  RETURNED: 'returned',
};

export const ITEM_STATUS_LABELS = {
  [ITEM_STATUS.OPEN]:     'Open',
  [ITEM_STATUS.RETURNED]: 'Returned',
};

/**
 * Normalised status of an item. Items created before `status` existed (and
 * legacy 'Open') are open; legacy 'Resolved' items count as returned.
 */
export const getItemStatus = (item) => {
  const status = item?.status;
  if (status === ITEM_STATUS.RETURNED || status === 'Resolved') return ITEM_STATUS.RETURNED;
  return ITEM_STATUS.OPEN;
};

export const isItemReturned = (item) => getItemStatus(item) === ITEM_STATUS.RETURNED;

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Add a new lost/found item to Firestore.
 *
 * @param {{
 *   name: string,
 *   description: string,
 *   location: string,
 *   type: 'Lost'|'Found',
 *   imageUrl: string|null,
 *   reportedBy: string,
 *   reporterName: string,
 * }} itemData
 * @returns {Promise<string>} The new document ID
 */
export const createItem = async (itemData) => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...itemData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// ─── Read (one-time) ──────────────────────────────────────────────────────────

/**
 * Fetch all items once, newest first.
 *
 * @returns {Promise<object[]>}
 */
export const getItems = async () => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Fetch a single item by its document ID.
 *
 * @param {string} itemId
 * @returns {Promise<object|null>}
 */
export const getItemById = async (itemId) => {
  const snap = await getDoc(doc(db, COLLECTION, itemId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ─── Read (real-time) ─────────────────────────────────────────────────────────

/**
 * Subscribe to live item updates, newest first.
 * Call the returned unsubscribe function to stop listening.
 *
 * @param {(items: object[]) => void} callback
 * @returns {() => void} Unsubscribe function
 *
 * @example
 *   useEffect(() => {
 *     const unsub = subscribeToItems(setItems);
 *     return unsub;
 *   }, []);
 */
export const subscribeToItems = (callback) => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
};

/**
 * Subscribe to live updates of the items reported by one user, newest first.
 *
 * Sorted on the client so no composite Firestore index is required.
 *
 * @param {string} uid
 * @param {(items: object[]) => void} callback
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} Unsubscribe function
 */
export const subscribeToUserItems = (uid, callback, onError) => {
  const q = query(collection(db, COLLECTION), where('reportedBy', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        // Pending server timestamps are null locally — keep those on top
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? Infinity) - (a.createdAt?.toMillis?.() ?? Infinity));
      callback(items);
    },
    onError,
  );
};

/**
 * Subscribe to live updates of a single item.
 * The callback receives `null` if the item does not exist (e.g. deleted).
 *
 * @param {string} itemId
 * @param {(item: object|null) => void} callback
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} Unsubscribe function
 */
export const subscribeToItem = (itemId, callback, onError) =>
  onSnapshot(
    doc(db, COLLECTION, itemId),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => {
      console.error('[itemsService] subscribeToItem error:', err);
      if (onError) onError(err);
    },
  );

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Partially update an item document.
 *
 * @param {string} itemId
 * @param {object} data   Fields to update
 */
export const updateItem = async (itemId, data) => {
  await updateDoc(doc(db, COLLECTION, itemId), data);
};

/**
 * Mark an item as returned after a confirmed handover.
 *
 * Only the reporter may do this, and Firestore rules require `chatId` to be a
 * chat about this item whose handover was confirmed by `otherUid`.
 *
 * @param {string} itemId
 * @param {string} otherUid  uid of the person who received the item
 * @param {string} chatId    chat holding the handover confirmation
 */
export const markItemReturned = async (itemId, otherUid, chatId) => {
  await updateDoc(doc(db, COLLECTION, itemId), {
    status:         ITEM_STATUS.RETURNED,
    returnedAt:     serverTimestamp(),
    returnedTo:     otherUid,
    returnedChatId: chatId,
  });
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Permanently delete an item document.
 *
 * @param {string} itemId
 */
export const deleteItem = async (itemId) => {
  await deleteDoc(doc(db, COLLECTION, itemId));
};

/**
 * Delete every item reported by a user (used when deleting an account).
 *
 * @param {string} uid
 */
export const deleteItemsByUser = async (uid) => {
  const snap = await getDocs(query(collection(db, COLLECTION), where('reportedBy', '==', uid)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a Firestore Timestamp (or null) to a human-readable relative string.
 *
 * @param {import('firebase/firestore').Timestamp|null} timestamp
 * @returns {string}
 */
export const formatItemDate = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate();
  const diffMs = Date.now() - date.getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);

  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days  < 7)  return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

/**
 * Format a Firestore Timestamp or Date as an absolute date, e.g. "5 Oct 2026".
 *
 * @param {import('firebase/firestore').Timestamp|Date|null} value
 * @returns {string}
 */
export const formatCalendarDate = (value) => {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
