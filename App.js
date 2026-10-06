import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { onIdTokenChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebaseConfig';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import {
  registerPushToken,
  addNotificationTapListener,
  takeLaunchNotificationTap,
} from './backend/notificationService';

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
const navigationRef = createNavigationContainerRef();

// Set once the user taps "Get started" — returning users skip the Welcome screen
const ONBOARDING_KEY = 'onboarding_completed';

// Chat screen params for a tapped message notification
// (data is sent by the notifyOnNewMessage Cloud Function)
const chatParamsFromNotification = (data) => ({
  item: {
    id:         data.itemId,
    name:       data.itemName,
    reportedBy: data.reporterUid,
  },
  existingChatId: data.chatId,
  otherUserId:    data.senderId,
  otherUserName:  data.senderName,
});

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { colors, isDark, ready: themeReady } = useTheme();

  const [user,          setUser]          = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [initializing,  setInitializing]  = useState(true);
  const [onboarded,     setOnboarded]     = useState(null);   // null = still loading

  // Notification tap waiting for the signed-in navigator to be ready
  const pendingChatRef = useRef(null);
  const handledTapIds  = useRef(new Set());

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setOnboarded(value === 'true'))
      .catch(() => setOnboarded(false));
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboarded(true);   // removes Welcome from the stack → lands on ItemList
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch((err) =>
      console.warn('[App] Could not save onboarding state:', err?.message));
  }, []);

  const signedIn = !!user && emailVerified;

  const flushPendingChat = useCallback(() => {
    const data = pendingChatRef.current;
    if (!data || !signedIn || !navigationRef.isReady()) return;
    pendingChatRef.current = null;
    navigationRef.navigate('Chat', chatParamsFromNotification(data));
  }, [signedIn]);

  // Open the chat when a message notification is tapped (including the tap
  // that launched the app)
  useEffect(() => {
    const handleTap = ({ id, data }) => {
      if (handledTapIds.current.has(id) || !data?.chatId) return;
      handledTapIds.current.add(id);
      pendingChatRef.current = data;
      flushPendingChat();
    };

    const launchTap = takeLaunchNotificationTap();
    if (launchTap) handleTap(launchTap);

    return addNotificationTapListener(handleTap);
  }, [flushPendingChat]);

  // A tap that arrived before sign-in finished is opened once it has
  useEffect(() => {
    flushPendingChat();
  }, [flushPendingChat]);

  // Register this device for message pushes once the user can use the app
  useEffect(() => {
    if (signedIn) registerPushToken(user.uid);
  }, [signedIn, user?.uid]);

  // Listen for Firebase Auth state changes (login / logout)
  useEffect(() => {
    // onIdTokenChanged fires on sign-in / sign-out AND on token refresh
    // (including the forced getIdToken(true) in checkEmailVerified).
    // reload() mutates the same User object, so setUser alone would not
    // re-render — emailVerified is tracked as its own value for routing.
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(!!firebaseUser?.emailVerified);
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
  if (initializing || !themeReady || onboarded === null) {
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
   *   • Signed in & email verified  → Full app (Welcome only until the user
   *                                   has tapped "Get started" once)
   *
   * Screens are conditionally rendered (rather than relying on
   * initialRouteName, which is only read once on mount) so that the
   * navigator resets automatically when `user` changes — e.g. on logout.
   */
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={flushPendingChat}>
        <Stack.Navigator>

          {!user ? (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />
          ) : !emailVerified ? (
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              options={{ title: 'Verify Email', headerBackVisible: false }}
            />
          ) : (
            <>
              {!onboarded && (
                <Stack.Screen name="Welcome" options={{ headerShown: false }}>
                  {(props) => <WelcomeScreen {...props} onGetStarted={completeOnboarding} />}
                </Stack.Screen>
              )}
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
