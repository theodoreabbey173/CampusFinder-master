import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UserRound,
  Eye,
  MapPin,
  Database,
  UserX,
  Flag,
  ShieldCheck,
  KeyRound,
  BadgeCheck,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import { sendPasswordReset, deleteAccount } from '../backend/authService';
import {
  getPrivacySettings,
  updatePrivacySettings,
  clearPrivacySettings,
  DEFAULT_PRIVACY_SETTINGS,
} from '../backend/settingsService';
import { openSupportEmail } from '../backend/supportService';
import ScreenHeader from '../components/ScreenHeader';
import AccordionItem, { Bullet } from '../components/Accordion';
import {
  SectionLabel,
  SettingsCard,
  SettingsRow,
  SettingsDivider,
} from '../components/SettingsList';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function PrivacyAndSafety({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = auth.currentUser;

  const [settings,        setSettings]        = useState(DEFAULT_PRIVACY_SETTINGS);
  const [settingsLoaded,  setSettingsLoaded]  = useState(false);
  const [sendingReset,    setSendingReset]    = useState(false);
  const [deleteVisible,   setDeleteVisible]   = useState(false);

  // ── Load saved privacy settings ─────────────────────────────────────────────
  useEffect(() => {
    getPrivacySettings(currentUser?.uid).then((saved) => {
      setSettings(saved);
      setSettingsLoaded(true);
    });
  }, []);

  const toggleSetting = async (key, value) => {
    const previous = settings;
    setSettings((s) => ({ ...s, [key]: value })); // optimistic
    try {
      await updatePrivacySettings(currentUser.uid, { [key]: value });
    } catch (err) {
      console.error('Save setting error:', err);
      setSettings(previous);
      Alert.alert('Not saved', 'Could not save this setting. Please try again.');
    }
  };

  // ── Privacy actions ─────────────────────────────────────────────────────────
  const explainVisibility = () => {
    Alert.alert(
      'Who can see my reported items',
      'Every signed-in CampusFinder user can see the items you report, so the owner or finder can reach you.\n\n' +
      'Your email address is never shown. Only your display name appears on reports (or "Anonymous" if you turn off "Show my name on reports").\n\n' +
      'Chat messages are only visible to the two people in the conversation.',
    );
  };

  const openDevicePermissions = () => {
    Alert.alert(
      'Location & permissions',
      'CampusFinder does not track your GPS location. Item locations are only what you type in a report.\n\n' +
      'Camera, photo and notification access can be changed in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings().catch(() =>
            Alert.alert('Unavailable', 'Please open your device settings manually.'),
          ),
        },
      ],
    );
  };

  // ── Safety actions ──────────────────────────────────────────────────────────
  const explainBlocking = () => {
    Alert.alert(
      'Blocked users',
      "Blocking isn't available yet. If someone is bothering you, stop replying and use \"Report a user or content\" so our team can step in.",
    );
  };

  const reportUser = () =>
    openSupportEmail(
      'Report a user or content',
      'Who or what are you reporting? (name shown in the app, item name, or chat):\n\n' +
      'What happened?\n\n' +
      'When did it happen?\n',
    );

  // ── Account actions ─────────────────────────────────────────────────────────
  const handleChangePassword = () => {
    Alert.alert(
      'Change password',
      `We'll email a secure password-reset link to ${currentUser?.email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            setSendingReset(true);
            try {
              await sendPasswordReset();
              Alert.alert(
                'Email sent',
                `Check ${currentUser?.email} (and your spam folder) for a link to set a new password.`,
              );
            } catch (err) {
              console.error('Password reset error:', err);
              Alert.alert(
                'Could not send email',
                err?.code === 'auth/too-many-requests'
                  ? 'Too many requests. Please wait a few minutes and try again.'
                  : 'Something went wrong. Please check your connection and try again.',
              );
            } finally {
              setSendingReset(false);
            }
          },
        },
      ],
    );
  };

  const requestData = () =>
    openSupportEmail(
      'Data request',
      'I would like to (choose one): receive a copy of my data / correct my data.\n\nDetails:\n',
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Privacy & Safety" navigation={navigation} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Privacy ───────────────────────────────────────────────────── */}
        <SectionLabel>PRIVACY</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={UserRound}
            iconColor={colors.blue}
            iconBg={colors.tintBlue}
            title="Show my name on reports"
            subtitle={settings.showNameOnReports
              ? 'Your name appears on new reports'
              : 'New reports are posted as "Anonymous"'}
            right={
              <Switch
                value={settings.showNameOnReports}
                onValueChange={(v) => toggleSetting('showNameOnReports', v)}
                disabled={!settingsLoaded}
                trackColor={{ false: colors.switchTrackOff, true: colors.green }}
                thumbColor="#fff"
                accessibilityLabel="Show my name on reports"
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon={Eye}
            iconColor={colors.green}
            iconBg={colors.tintGreen}
            title="Who can see my reported items"
            value="Signed-in users"
            onPress={explainVisibility}
          />
          <SettingsDivider />
          <SettingsRow
            icon={MapPin}
            iconColor={colors.orange}
            iconBg={colors.tintOrange}
            title="Location & permissions"
            subtitle="No GPS tracking · manage camera & photos"
            onPress={openDevicePermissions}
          />
          <SettingsDivider />
          <AccordionItem
            icon={Database}
            iconColor="#5B6AD0"
            iconBg={colors.tintPurple}
            title="How we use your data"
          >
            <Bullet>Your name and email are used to sign you in and identify you to people you chat with. Your email is never shown publicly.</Bullet>
            <Bullet>Reports (name, description, category, location, date and photo) are visible to signed-in users so items can be returned.</Bullet>
            <Bullet>Photos are stored with our image host (Cloudinary); account and report data is stored in Google Firebase.</Bullet>
            <Bullet>Deleting a report removes it from the app. Deleting your account removes your profile and all your reports.</Bullet>
            <Bullet>Your theme and privacy preferences are saved only on this device.</Bullet>
          </AccordionItem>
        </SettingsCard>

        {/* ── Safety ────────────────────────────────────────────────────── */}
        <SectionLabel>SAFETY</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={UserX}
            iconColor={colors.textMuted}
            iconBg={colors.surfaceAlt}
            title="Blocked users"
            value="Coming soon"
            onPress={explainBlocking}
          />
          <SettingsDivider />
          <SettingsRow
            icon={Flag}
            iconColor={colors.danger}
            iconBg={colors.tintRed}
            title="Report a user or content"
            subtitle="Tell our team about abuse, scams or fake reports"
            onPress={reportUser}
          />
          <SettingsDivider />
          <AccordionItem
            icon={ShieldCheck}
            iconColor={colors.green}
            iconBg={colors.tintGreen}
            title="Safety guidelines"
          >
            <Bullet>Meet in busy, public places on campus — a library, cafeteria or security desk.</Bullet>
            <Bullet>Ask the other person to describe the item before handing it over.</Bullet>
            <Bullet>Never share passwords, bank details, PINs or ID numbers in chat.</Bullet>
            <Bullet>Never pay a "reward" or fee before you have the item.</Bullet>
            <Bullet>Valuable items (IDs, phones, laptops) can also be handed to campus security.</Bullet>
          </AccordionItem>
          <SettingsDivider />
          <SettingsRow
            icon={BadgeCheck}
            iconColor={currentUser?.emailVerified ? colors.green : colors.orange}
            iconBg={currentUser?.emailVerified ? colors.tintGreen : colors.tintOrange}
            title="Account security"
            subtitle={currentUser?.email}
            value={currentUser?.emailVerified ? 'Email verified' : 'Not verified'}
          />
        </SettingsCard>

        {/* ── Account & data ────────────────────────────────────────────── */}
        <SectionLabel>ACCOUNT & DATA</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={KeyRound}
            iconColor={colors.blue}
            iconBg={colors.tintBlue}
            title="Change password"
            subtitle="We'll email you a secure reset link"
            onPress={handleChangePassword}
            disabled={sendingReset}
            right={sendingReset ? <ActivityIndicator size="small" color={colors.blue} /> : undefined}
          />
          <SettingsDivider />
          <SettingsRow
            icon={Download}
            iconColor="#5B6AD0"
            iconBg={colors.tintPurple}
            title="Request my data"
            subtitle="Ask for a copy or correction of your data"
            onPress={requestData}
          />
          <SettingsDivider />
          <SettingsRow
            icon={Trash2}
            iconColor={colors.danger}
            iconBg={colors.tintRed}
            title="Delete account"
            subtitle="Permanently remove your account and reports"
            destructive
            onPress={() => setDeleteVisible(true)}
          />
        </SettingsCard>
      </ScrollView>

      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        uid={currentUser?.uid}
      />
    </SafeAreaView>
  );
}

// ─── Delete-account confirmation ──────────────────────────────────────────────

function DeleteAccountModal({ visible, onClose, uid }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState(null);

  const close = () => {
    if (deleting) return;
    setPassword('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!password) {
      setError('Please enter your password to confirm.');
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(password);
      await clearPrivacySettings(uid);
      // Auth listener in App.js now routes to the sign-in screen.
    } catch (err) {
      console.error('Delete account error:', err);
      switch (err?.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please wait a few minutes and try again.');
          break;
        case 'auth/network-request-failed':
          setError('No internet connection. Please check your network.');
          break;
        default:
          setError('Could not delete your account. Please try again.');
      }
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalIcon}>
            <AlertTriangle size={26} color={colors.danger} strokeWidth={2} />
          </View>
          <Text style={styles.modalTitle}>Delete your account?</Text>
          <Text style={styles.modalText}>
            This permanently deletes your account and every item you've reported. This can't be undone.
            {'\n\n'}Enter your password to confirm.
          </Text>

          <TextInput
            style={[styles.modalInput, error && { borderColor: colors.danger }]}
            placeholder="Password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            editable={!deleting}
            autoFocus
          />
          {error ? <Text style={styles.modalError}>{error}</Text> : null}

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={close} disabled={deleting}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalDelete, deleting && { opacity: 0.7 }]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalDeleteText}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // ── Delete modal ──────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: c.tintRed,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.text,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: c.input,
    color: c.text,
  },
  modalError: {
    color: c.danger,
    fontSize: 13,
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
  },
  modalDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: c.danger,
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
