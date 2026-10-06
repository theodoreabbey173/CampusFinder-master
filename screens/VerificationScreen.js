import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Mail, AlertTriangle } from 'lucide-react-native';
import { checkEmailVerified, resendVerificationEmail } from '../backend/authService';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function VerificationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { email, emailSent = true } = route.params ?? {};
  const [checking,  setChecking]  = useState(false);
  const [resending, setResending] = useState(false);
  // Track whether a successful send has happened this session
  const [hasSent, setHasSent] = useState(emailSent);

  /** Poll Firebase to see if the user has clicked the email link yet. */
  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      const verified = await checkEmailVerified();
      // When verified, App.js (onIdTokenChanged) swaps the stack to Welcome
      // once the refreshed token arrives — no manual navigation needed.
      if (!verified) {
        Alert.alert(
          'Not Verified Yet',
          'We couldn\'t confirm your email yet.\n\n• Check your inbox AND spam/junk folder\n• Make sure you clicked the link (not just opened the email)\n• Then tap this button again',
        );
      }
    } catch (err) {
      Alert.alert('Error', err?.message ?? 'Could not check verification. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  /** Re-send a fresh verification email. */
  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      setHasSent(true);
      Alert.alert(
        'Email Sent',
        `A verification link was sent to ${email}.\n\nIf it doesn't appear in your inbox within a minute, check your spam or junk folder.`,
      );
    } catch (err) {
      Alert.alert('Error', err?.message ?? 'Could not resend the verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const busy = checking || resending;

  return (
    <View style={styles.container}>
      {navigation.canGoBack() && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={busy}
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          {hasSent
            ? <Mail size={30} color="#5B6AD0" strokeWidth={2} />
            : <AlertTriangle size={30} color="#E5793D" strokeWidth={2} />
          }
        </View>

        <Text style={styles.title}>
          {hasSent ? 'Check your email' : 'Email not sent'}
        </Text>

        {hasSent ? (
          <Text style={styles.subtitle}>
            We sent a verification link to{'\n'}
            <Text style={styles.emailBold}>{email}</Text>. Open it, then tap the button below.
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            We couldn't deliver a verification link to{'\n'}
            <Text style={styles.emailBold}>{email}</Text>. Tap below to try again.
          </Text>
        )}

        <TouchableOpacity onPress={handleResend} disabled={busy} style={styles.resendRow}>
          {resending ? (
            <ActivityIndicator color="#7B86E0" size="small" />
          ) : (
            <Text style={styles.resendRowText}>
              Didn't get it? <Text style={styles.resendLink}>Resend {hasSent ? 'email' : 'link'}</Text>
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={hasSent ? handleCheckVerified : handleResend}
        disabled={busy}
      >
        {(hasSent ? checking : resending) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {hasSent ? 'Verify & continue' : 'Send verification email'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: c.tintPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: c.textMuted,
    lineHeight: 22,
    marginBottom: 28,
  },
  emailBold: {
    fontWeight: 'bold',
    color: c.text,
  },
  resendRow: {
    alignSelf: 'flex-start',
  },
  resendRowText: {
    fontSize: 14,
    color: c.textMuted,
  },
  resendLink: {
    color: '#5B6AD0',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#8B93E8',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
