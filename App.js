import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { ThemeProvider, useTheme } from './theme/ThemeContext';

// Screens
import AuthScreen         from './screens/AuthScreen';
import VerificationScreen from './screens/VerificationScreen';
import WelcomeScreen      from './screens/WelcomeScreen';
import MainTabs           from './screens/MainTabs';
import DetailsScreen      from './screens/DetailsScreen';
import ReportItemScreen   from './screens/ReportItemScreen';
import ChatScreen         from './screens/ChatScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import MyReportedItems    from './screens/MyReportedItems';
import PrivacyAndSafety   from './screens/PrivacyAndSafety';
import HelpAndSupport     from './screens/HelpAndSupport';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { colors, isDark, ready: themeReady } = useTheme();

  const [user,         setUser]         = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Listen for Firebase Auth state changes (login / logout)
  useEffect(() => {
    // onIdTokenChanged fires on sign-in / sign-out AND on token refresh
    // (which includes the reload() call in checkEmailVerified).
    // This ensures user.emailVerified is always up-to-date in this component.
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe; // Clean up on unmount
  }, []);

  // React Navigation theme — colours its own chrome (headers, card backgrounds)
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary:      colors.brandText,
        background:   colors.background,
        card:         colors.surface,
        text:         colors.text,
        border:       colors.border,
        notification: colors.danger,
      },
    };
  }, [isDark, colors]);

  // Show a spinner while Firebase resolves the persisted session
  // (and the saved theme loads, so there's no light → dark flash)
  if (initializing || !themeReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  /**
   * Route logic:
   *   • Not signed in               → Auth screen (Log in / Sign up)
   *   • Signed in but unverified    → Verification screen only
   *   • Signed in & email verified  → Full app
   *
   * Screens are conditionally rendered (rather than relying on
   * initialRouteName, which is only read once on mount) so that the
   * navigator resets automatically when `user` changes — e.g. on logout.
   */
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator>

          {!user ? (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />
          ) : !user.emailVerified ? (
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              options={{ title: 'Verify Email', headerBackVisible: false }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ItemList"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ItemDetails"
                component={DetailsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ReportItem"
                component={ReportItemScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ReportConfirmation"
                component={ConfirmationScreen}
                options={{ title: 'Done', headerBackVisible: false }}
              />
              <Stack.Screen
                name="MyReportedItems"
                component={MyReportedItems}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PrivacyAndSafety"
                component={PrivacyAndSafety}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="HelpAndSupport"
                component={HelpAndSupport}
                options={{ headerShown: false }}
              />
            </>
          )}

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
