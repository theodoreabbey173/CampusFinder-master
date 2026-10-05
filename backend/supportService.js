/**
 * backend/supportService.js
 * -------------------------
 * Opens the device mail app with a pre-filled support email.
 * Falls back to showing the address if no mail app is available.
 */

import { Alert, Linking, Platform } from 'react-native';
import appConfig from '../app.json';
import { auth } from '../firebaseConfig';
import { SUPPORT_EMAIL } from '../supportConfig';

export const APP_VERSION = appConfig?.expo?.version ?? '1.0.0';

/**
 * @param {string} subject
 * @param {string} [intro]  Text placed above the diagnostic footer
 */
export const openSupportEmail = async (subject, intro = '') => {
  const user = auth.currentUser;
  const footer = [
    '',
    '',
    '— Please keep the details below so we can help —',
    `App version: ${APP_VERSION}`,
    `Platform: ${Platform.OS} ${Platform.Version}`,
    user ? `Account: ${user.email}` : null,
  ].filter((line) => line !== null).join('\n');

  const url =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent(`[CampusFinder] ${subject}`)}` +
    `&body=${encodeURIComponent(`${intro}${footer}`)}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'No email app found',
      `Please email us at ${SUPPORT_EMAIL} with the subject "${subject}".`,
    );
  }
};
