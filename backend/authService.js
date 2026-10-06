/**
 * backend/authService.js
 * ----------------------
 * Firebase Authentication helpers.
 *
 * Firestore collection: `users`
 *   Document shape:
 *   {
 *     uid:           string,
 *     name:          string,
 *     email:         string,
 *     emailVerified: boolean,
 *     createdAt:     Timestamp,
 *     expoPushTokens: string[]  (devices that receive chat pushes),
 *   }
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  reload,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { deleteItemsByUser } from './itemsService';
import { unregisterPushToken } from './notificationService';

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * actionCodeSettings tells Firebase where to send the user after they click
 * the verification link in their email. Using the Firebase-hosted project URL
 * keeps the link valid without requiring deep-link / custom domain setup.
 */
const ACTION_CODE_SETTINGS = {
  url: `https://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN}`,
  handleCodeInApp: false,
};

/**
 * Create a new user account.
 * Saves the user profile to the `users` collection and attempts to send a
 * verification email. Email sending is intentionally decoupled — a failure
 * there will NOT roll back registration; the user can resend from the
 * Verification screen.
 *
 * @param {string} name      Full name
 * @param {string} email     Email address
 * @param {string} password  Password (min 6 chars)
 * @returns {Promise<{ user: import('firebase/auth').User, emailSent: boolean }>}
 */
export const registerUser = async (name, email, password) => {
  // 1. Create account in Firebase Auth
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // 2. Store display name on the Firebase user object
  await updateProfile(user, { displayName: name });

  // 3. Save full profile to Firestore `users` collection
  await setDoc(doc(db, 'users', user.uid), {
    uid:           user.uid,
    name,
    email,
    emailVerified: false,
    createdAt:     serverTimestamp(),
  });

  // 4. Send verification email — wrapped so a delivery failure doesn't
  //    prevent the user from reaching the Verification screen.
  let emailSent = false;
  try {
    await sendEmailVerification(user, ACTION_CODE_SETTINGS);
    emailSent = true;
  } catch (emailErr) {
    console.warn('[registerUser] sendEmailVerification failed:', emailErr?.message);
  }

  return { user, emailSent };
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Sign in an existing user.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>}
 */
export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

// ─── Email verification ───────────────────────────────────────────────────────

/**
 * Re-send the verification email to the currently signed-in user.
 */
export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in.');
  await sendEmailVerification(user, ACTION_CODE_SETTINGS);
};

/**
 * Reload the current user from Firebase and return whether their email
 * is now verified. Also updates the Firestore record when it becomes true.
 *
 * @returns {Promise<boolean>}
 */
export const checkEmailVerified = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No signed-in user found. Please sign in again.');

  // Force-refresh the user profile from Firebase servers
  await reload(user);

  // Re-read auth.currentUser after reload — the local `user` reference
  // can be stale; auth.currentUser always reflects the latest state.
  const freshUser = auth.currentUser;
  if (!freshUser) return false;

  if (freshUser.emailVerified) {
    // reload() does not refresh the ID token, and Firestore rules read the
    // email_verified claim from the token. Force a refresh so the first
    // Firestore request after verification is not rejected.
    await freshUser.getIdToken(true);

    // Keep Firestore in sync (best-effort — must never block a verified user).
    // uid is included so the write passes the users rule even when the
    // profile document does not exist yet.
    try {
      await setDoc(
        doc(db, 'users', freshUser.uid),
        { uid: freshUser.uid, emailVerified: true },
        { merge: true },
      );
    } catch (err) {
      console.warn('[checkEmailVerified] could not update user profile:', err?.message);
    }
    return true;
  }
  return false;
};

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Sign the current user out. The device's push token is removed first so this
 * device stops receiving their chat notifications.
 */
export const logoutUser = async () => {
  if (auth.currentUser) await unregisterPushToken(auth.currentUser.uid);
  await signOut(auth);
};

// ─── Account security ─────────────────────────────────────────────────────────

/**
 * Email a Firebase password-reset link.
 *
 * @param {string} [email]  Address to send to; defaults to the signed-in user's
 *                          email (used by "Change password" in Privacy & Safety).
 */
export const sendPasswordReset = async (email) => {
  const target = (email ?? auth.currentUser?.email ?? '').trim();
  if (!target) throw new Error('No email address provided.');
  await sendPasswordResetEmail(auth, target, ACTION_CODE_SETTINGS);
};

/**
 * Permanently delete the signed-in user's account.
 *
 *   1. Re-authenticates with the password (Firebase requires a recent login).
 *   2. Deletes every item the user reported.
 *   3. Deletes the `users/{uid}` profile document (best-effort).
 *   4. Deletes the Firebase Auth user — onIdTokenChanged then routes to Auth.
 *
 * Chat history is kept: Firestore rules make chats undeletable, and the other
 * participant still needs their copy.
 *
 * @param {string} password  Current password, used to re-authenticate
 */
export const deleteAccount = async (password) => {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No signed-in user found. Please sign in again.');

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);

  await deleteItemsByUser(user.uid);

  try {
    await deleteDoc(doc(db, 'users', user.uid));
  } catch (err) {
    // Rules may not allow profile deletion; don't block the account deletion.
    console.warn('[deleteAccount] could not delete user profile:', err?.message);
  }

  await deleteUser(user);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the currently signed-in Firebase user (or null). */
export const getCurrentUser = () => auth.currentUser;

/**
 * Name to show for a user: display name, else the part of the email before
 * the @, else "Student".
 *
 * @param {import('firebase/auth').User|null} user
 * @returns {string}
 */
export const getDisplayName = (user) =>
  user?.displayName?.trim() || user?.email?.split('@')[0] || 'Student';

/**
 * Fetch a user's profile document from Firestore.
 *
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};
