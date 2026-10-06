import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { loginUser, registerUser, sendPasswordReset } from '../backend/authService';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function AuthScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState(route.params?.initialMode === 'signup' ? 'signup' : 'login');

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resetting, setResetting] = useState(false);

  const [tabWidth, setTabWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(mode === 'signup' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: mode === 'login' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const switchMode = (nextMode) => {
    if (loading) return;
    setMode(nextMode);
  };

  const handleTabRowLayout = (e) => {
    const innerWidth = e.nativeEvent.layout.width - 8; // minus horizontal padding (4 + 4)
    setTabWidth(innerWidth / 2);
  };

  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(email, password);

      if (!user.emailVerified) {
        // Account exists but email not yet confirmed — send them to verification
        navigation.navigate('Verification', { email });
      }
      // Verified users are routed by App.js when the auth state changes
      // (Welcome on first use, otherwise straight to ItemList).
    } catch (error) {
      let message = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Incorrect email or password.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
      }
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Enter your email', 'Please enter your email address above first, then tap "Forgot password?" again.');
      return;
    }

    const NEUTRAL_MESSAGE = 'If an account exists for this email, a reset link has been sent.';

    setResetting(true);
    try {
      await sendPasswordReset(trimmed);
      Alert.alert('Check your email', NEUTRAL_MESSAGE);
    } catch (error) {
      switch (error.code) {
        case 'auth/user-not-found':
          // Same message as success so we don't reveal which emails have accounts
          Alert.alert('Check your email', NEUTRAL_MESSAGE);
          break;
        case 'auth/invalid-email':
          Alert.alert('Invalid email', 'Please enter a valid email address.');
          break;
        case 'auth/network-request-failed':
          Alert.alert('No connection', 'No internet connection. Please check your network and try again.');
          break;
        case 'auth/too-many-requests':
          Alert.alert('Too many requests', 'Please wait a few minutes and try again.');
          break;
        default:
          Alert.alert('Reset failed', 'Could not send the reset email. Please try again.');
      }
    } finally {
      setResetting(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { emailSent } = await registerUser(name, email, password);
      // Navigate to verification screen; pass whether the email was actually sent
      // so the screen can show appropriate guidance if delivery failed.
      navigation.navigate('Verification', { email, emailSent });
    } catch (error) {
      let message = 'Sign up failed. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          message = 'No internet connection. Please check your network.';
          break;
      }
      Alert.alert('Sign Up Error', message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <LinearGradient
            colors={['#16296b', '#1c4b8e', '#159e94']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.logoWrapper}>
              <Image source={require('../assets/icon.png')} style={styles.logo} />
            </View>
            <Text style={styles.appName}>CampusFinder</Text>
            <Text style={styles.tagline}>
              {isLogin ? "Welcome back — find what's lost." : 'Join your campus lost & found community.'}
            </Text>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.tabRow} onLayout={handleTabRowLayout}>
              {tabWidth > 0 && (
                <Animated.View
                  style={[
                    styles.tabPill,
                    { width: tabWidth, transform: [{ translateX: pillTranslateX }] },
                  ]}
                />
              )}
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchMode('login')}
                disabled={loading}
              >
                <Text style={isLogin ? styles.tabTextActive : styles.tabTextInactive}>Log in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchMode('signup')}
                disabled={loading}
              >
                <Text style={!isLogin ? styles.tabTextActive : styles.tabTextInactive}>Sign up</Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Theodore Mensah"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="theodore@st.ug.edu.gh"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {isLogin && (
              <TouchableOpacity
                style={[styles.forgotButton, resetting && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={loading || resetting}
              >
                <Text style={styles.forgotText}>
                  {resetting ? 'Sending reset link…' : 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled, !isLogin && styles.buttonSignUp]}
              onPress={isLogin ? handleLogin : handleSignUp}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>{isLogin ? 'Log in' : 'Sign up'}</Text>
              }
            </TouchableOpacity>

            {!isLogin && (
              <View style={styles.footerNoteRow}>
                <Lock size={12} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.footerNote}>A verification link will be sent to your email.</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => switchMode(isLogin ? 'signup' : 'login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                {isLogin ? (
                  <>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></>
                ) : (
                  <>Already have an account? <Text style={styles.linkBold}>Log in</Text></>
                )}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c) => StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: c.surface,
  },
  topBar: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: c.surface,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.text,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 30,
    paddingBottom: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoWrapper: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#fff',
    padding: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  appName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  card: {
    flex: 1,
    backgroundColor: c.surface,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    backgroundColor: c.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabTextInactive: {
    color: c.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  tabTextActive: {
    color: c.link,
    fontWeight: '700',
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: c.input,
    color: c.text,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -6,
  },
  forgotText: {
    color: c.link,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1B3A8A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonSignUp: {
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerNoteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
  },
  footerNote: {
    color: c.textMuted,
    fontSize: 12,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 22,
  },
  linkText: {
    color: c.textSecondary,
    fontSize: 14,
  },
  linkBold: {
    color: c.link,
    fontWeight: 'bold',
  },
});
