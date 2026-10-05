/**
 * firebaseConfig.js
 * -----------------
 * Initializes Firebase and exports auth and db (Firestore).
 * Images are hosted on Cloudinary (free tier) — see cloudinaryConfig.js.
 *
 * ⚠️  SETUP REQUIRED — see FIREBASE_SETUP.md for step-by-step instructions.
 *     Replace every "YOUR_…" placeholder below with your real Firebase values.
 *     Get them at: Firebase Console → Your Project → Project Settings → General → Your apps
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Replace these values with your Firebase project credentials ──────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAcBbrhp9zy5PK0av2dBCXQEIGV0-PyXv0",
  authDomain:        "campusfinder-b4064.firebaseapp.com",
  projectId:         "campusfinder-b4064",
  messagingSenderId: "514101680047",
  appId:             "1:514101680047:web:881a8d13e01795e360015a",
};
// ─────────────────────────────────────────────────────────────────────────────

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
