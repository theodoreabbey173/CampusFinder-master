/**
 * theme/ThemeContext.js
 * ---------------------
 * Centralised light/dark theme.
 *
 *   • <ThemeProvider> wraps the app (see App.js).
 *   • useTheme()           → { colors, isDark, setDarkMode, toggleTheme, ready }
 *   • useThemedStyles(fn)  → memoised StyleSheet built from the active palette.
 *
 * The user's choice is persisted with AsyncStorage so it survives restarts.
 *
 * @example
 *   const createStyles = (c) => StyleSheet.create({ box: { backgroundColor: c.surface } });
 *   function MyScreen() {
 *     const styles = useThemedStyles(createStyles);
 *     ...
 *   }
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const STORAGE_KEY = '@campusfinder/theme';

const ThemeContext = createContext({
  colors:      lightColors,
  isDark:      false,
  ready:       true,
  setDarkMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [ready,  setReady]  = useState(false);

  // Restore the saved preference on launch
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => { if (value === 'dark') setIsDark(true); })
      .catch((err) => console.warn('[theme] could not read preference:', err?.message))
      .finally(() => setReady(true));
  }, []);

  // Keep native UI (alerts, keyboards, pickers) in sync with the in-app theme
  useEffect(() => {
    try {
      Appearance.setColorScheme?.(isDark ? 'dark' : 'light');
    } catch {
      // Not supported on this platform — in-app colours still switch.
    }
  }, [isDark]);

  const setDarkMode = useCallback((enabled) => {
    setIsDark(enabled);
    AsyncStorage.setItem(STORAGE_KEY, enabled ? 'dark' : 'light')
      .catch((err) => console.warn('[theme] could not save preference:', err?.message));
  }, []);

  const toggleTheme = useCallback(() => setDarkMode(!isDark), [isDark, setDarkMode]);

  const value = useMemo(() => ({
    colors: isDark ? darkColors : lightColors,
    isDark,
    ready,
    setDarkMode,
    toggleTheme,
  }), [isDark, ready, setDarkMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Build a StyleSheet from the active palette, re-created only when the theme changes.
 *
 * @param {(colors: typeof lightColors) => object} createStyles  Must be defined at module scope.
 */
export const useThemedStyles = (createStyles) => {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
};
