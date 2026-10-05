/**
 * backend/settingsService.js
 * --------------------------
 * Per-user privacy preferences, stored on the device with AsyncStorage
 * (keyed by uid so two accounts on one phone don't share settings).
 *
 * Settings:
 *   showNameOnReports  — when false, new reports are posted as "Anonymous"
 *                        (read by ReportItemScreen).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_PRIVACY_SETTINGS = {
  showNameOnReports: true,
};

const keyFor = (uid) => `@campusfinder/privacy/${uid}`;

/**
 * @param {string} uid
 * @returns {Promise<typeof DEFAULT_PRIVACY_SETTINGS>}
 */
export const getPrivacySettings = async (uid) => {
  if (!uid) return { ...DEFAULT_PRIVACY_SETTINGS };
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    return { ...DEFAULT_PRIVACY_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch (err) {
    console.warn('[settings] could not read privacy settings:', err?.message);
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }
};

/**
 * Merge and save privacy settings for a user.
 *
 * @param {string} uid
 * @param {Partial<typeof DEFAULT_PRIVACY_SETTINGS>} changes
 * @returns {Promise<typeof DEFAULT_PRIVACY_SETTINGS>} The saved settings
 */
export const updatePrivacySettings = async (uid, changes) => {
  const next = { ...(await getPrivacySettings(uid)), ...changes };
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify(next));
  return next;
};

/** Remove a user's saved settings (e.g. after account deletion). */
export const clearPrivacySettings = async (uid) => {
  if (!uid) return;
  await AsyncStorage.removeItem(keyFor(uid)).catch(() => {});
};
