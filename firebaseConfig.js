/**
 * firebaseConfig.js
 * -----------------
 * Initializes Firebase and exports auth and db (Firestore).
 * Images are hosted on Cloudinary (free tier) — see cloudinaryConfig.js.
 *
 * ⚠️  SETUP REQUIRED — copy .env.example to .env and fill in your Firebase values.
 *     Get them at: Firebase Console → Your Project → Project Settings → General → Your apps
 *     Expo inlines EXPO_PUBLIC_* variables at build time, so each one must be
 *     read with the literal `process.env.EXPO_PUBLIC_…` form below.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Firebase project credentials (from .env) ─────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
// ─────────────────────────────────────────────────────────────────────────────

const missing = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key);
if (missing.length > 0) {
  console.error(
    `[firebaseConfig] Missing Firebase config: ${missing.join(', ')}. ` +
    'Copy .env.example to .env, fill it in, then restart with `npx expo start --clear`.',
  );
}

// Prevent re-initialisation on React Native hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth — persists sessions across app restarts via AsyncStorage
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialised (hot-reload guard)
  auth = getAuth(app);
}

// Firestore — three collections: users · items · chats
const db = getFirestore(app);

export { auth, db };
export default app;
