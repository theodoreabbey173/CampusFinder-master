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
  limit,
  startAfter,
  endAt,
  getCountFromServer,
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

export const ITEMS_PAGE_SIZE = 20;

/**
 * Fetch one page of items, newest first.
 *
 * @param {import('firebase/firestore').DocumentSnapshot|null} [cursor]
 *        `cursor` from the previous page; omit for the first page
 * @param {number} [pageSize]
 * @returns {Promise<{ items: object[], cursor: object|null, hasMore: boolean }>}
 *
 * @example
 *   const first  = await getItemsPage();
 *   const second = await getItemsPage(first.cursor);
 */
export const getItemsPage = async (cursor = null, pageSize = ITEMS_PAGE_SIZE) => {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize),
  );
  const snap = await getDocs(q);
  return {
    items:   snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    cursor:  snap.docs[snap.docs.length - 1] ?? cursor,
    hasMore: snap.docs.length === pageSize,
  };
};

/**
 * Count open items by type and returned items, server-side (no documents are
 * downloaded). Items without a status, or with legacy 'Open', count as open.
 *
 * @returns {Promise<{ total: number, lost: number, found: number, returned: number }>}
 */
export const getItemCounts = async () => {
  const items    = collection(db, COLLECTION);
  const returned = where('status', 'in', [ITEM_STATUS.RETURNED, 'Resolved']);
  const count    = async (...filters) =>
    (await getCountFromServer(query(items, ...filters))).data().count;

  const [all, allReturned, lost, lostReturned, found, foundReturned] = await Promise.all([
    count(),
    count(returned),
    count(where('type', '==', 'Lost')),
    count(where('type', '==', 'Lost'), returned),
    count(where('type', '==', 'Found')),
    count(where('type', '==', 'Found'), returned),
  ]);

  return {
    total:    all - allReturned,
    lost:     lost - lostReturned,
    found:    found - foundReturned,
    returned: allReturned,
  };
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
 * Subscribe to live item updates, newest first, one page at a time.
 *
 * Each page has its own listener, bounded by document cursors so pages never
 * shift when items are added or removed:
 *   • The last page is open-ended: startAfter(previous page's last doc) + limit.
 *   • loadMore() freezes it with endAt(its last doc) and opens the next page.
 *   • The first page has no start bound, so new items always appear in it.
 * Edits, deletions and new items stay live on every loaded page.
 *
 * @param {(feed: { items: object[], hasMore: boolean, loadingMore: boolean }) => void} callback
 * @param {(error: Error) => void} [onError]
 * @param {number} [pageSize]
 * @returns {{ loadMore: () => void, unsubscribe: () => void }}
 *
 * @example
 *   useEffect(() => {
 *     const feed = subscribeToItems(({ items }) => setItems(items));
 *     loadMoreRef.current = feed.loadMore;
 *     return feed.unsubscribe;
 *   }, []);
 */
export const subscribeToItems = (callback, onError, pageSize = ITEMS_PAGE_SIZE) => {
  const pages = [];   // { start, docs, ready, unsubscribe }
  let stopped = false;

  const pageQuery = (...bounds) =>
    query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), ...bounds);

  const lastPage = () => pages[pages.length - 1];

  const emit = () => {
    if (stopped) return;
    const seen  = new Set();
    const items = [];
    pages.forEach((page) => page.docs.forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      items.push({ id: d.id, ...d.data() });
    }));
    const last = lastPage();
    callback({
      items,
      hasMore:     !!last?.ready && last.docs.length === pageSize,
      loadingMore: pages.length > 1 && !last.ready,
    });
  };

  const listen = (page, q) => onSnapshot(
    q,
    (snap) => {
      page.docs  = snap.docs;
      page.ready = true;
      emit();
    },
    (err) => {
      console.error('[itemsService] subscribeToItems error:', err);
      if (onError) onError(err);
    },
  );

  const openPage = (start) => {
    const page = { start, docs: [], ready: false };
    page.unsubscribe = listen(
      page,
      pageQuery(...(start ? [startAfter(start)] : []), limit(pageSize)),
    );
    pages.push(page);
  };

  const loadMore = () => {
    const last = lastPage();
    if (stopped || !last?.ready || last.docs.length < pageSize) return;

    // Freeze the current last page at its last doc, then open the next one.
    // The old listener is removed after the new one starts, so the cached
    // docs keep the page filled in the meantime.
    const end = last.docs[last.docs.length - 1];
    const previous = last.unsubscribe;
    last.unsubscribe = listen(
      last,
      pageQuery(...(last.start ? [startAfter(last.start)] : []), endAt(end)),
    );
    previous();

    openPage(end);
    emit();
  };

  openPage(null);

  return {
    loadMore,
    unsubscribe: () => {
      stopped = true;
      pages.forEach((page) => page.unsubscribe());
    },
  };
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
