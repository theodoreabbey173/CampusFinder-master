import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  Pencil,
  Moon,
  Package,
  Lock,
  HelpCircle,
  Power,
} from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import { logoutUser } from '../backend/authService';
import { subscribeToUserItems } from '../backend/itemsService';
import { APP_VERSION } from '../backend/supportService';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import {
  SectionLabel,
  SettingsCard,
  SettingsRow,
  SettingsDivider,
} from '../components/SettingsList';

export default function ProfileScreen({ navigation }) {
  const { colors, isDark, setDarkMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  const currentUser = auth.currentUser;
  const name  = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student';
  const email = currentUser?.email || '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToUserItems(
      currentUser.uid,
      (items) => setReportCount(items.length),
      (err) => console.warn('Report count error:', err?.message),
    );
    return unsubscribe;
  }, []);

  const comingSoon = (feature) => Alert.alert(feature, 'Coming soon.');

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => logoutUser(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('PrivacyAndSafety')}
            accessibilityLabel="Settings"
          >
            <Settings size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Profile card ───────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#1a237e', '#16a97a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileCard}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity style={styles.avatarEditBadge} onPress={() => comingSoon('Edit photo')}>
              <Pencil size={11} color="#101010" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
        </LinearGradient>

        {/* ── Preferences ────────────────────────────────────────────────── */}
        <SectionLabel>PREFERENCES</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={Moon}
            iconColor="#FB8C00"
            iconBg={colors.tintOrange}
            title="Dark mode"
            subtitle="Easier on the eyes at night"
            right={
              <Switch
                value={isDark}
                onValueChange={setDarkMode}
                trackColor={{ false: colors.switchTrackOff, true: colors.green }}
                thumbColor="#fff"
                accessibilityLabel="Dark mode"
              />
            }
          />
        </SettingsCard>

        {/* ── Account & safety ───────────────────────────────────────────── */}
        <SectionLabel>ACCOUNT & SAFETY</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={Package}
            iconColor="#E5793D"
            iconBg={colors.tintPeach}
            title="My reported items"
            value={reportCount > 0 ? reportCount : undefined}
            onPress={() => navigation.navigate('MyReportedItems')}
          />
          <SettingsDivider />
          <SettingsRow
            icon={Lock}
            iconColor="#E53935"
            iconBg={colors.tintRed}
            title="Privacy & safety"
            onPress={() => navigation.navigate('PrivacyAndSafety')}
          />
          <SettingsDivider />
          <SettingsRow
            icon={HelpCircle}
            iconColor="#E53935"
            iconBg={colors.tintPink}
            title="Help & support"
            onPress={() => navigation.navigate('HelpAndSupport')}
          />
        </SettingsCard>

        {/* ── Log out ────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Power size={15} color="#E53935" strokeWidth={2.4} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>CampusFinder · v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: c.text,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#3c355e',
    fontSize: 20,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0f1caf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: '#E53935',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E53935',
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: c.textFaint,
  },
});
