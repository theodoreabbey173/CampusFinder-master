import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Bug,
  MessageSquareHeart,
  ShieldAlert,
} from 'lucide-react-native';
import { openSupportEmail, APP_VERSION } from '../backend/supportService';
import { SUPPORT_EMAIL } from '../supportConfig';
import ScreenHeader from '../components/ScreenHeader';
import AccordionItem from '../components/Accordion';
import {
  SectionLabel,
  SettingsCard,
  SettingsRow,
  SettingsDivider,
} from '../components/SettingsList';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const FAQS = [
  {
    q: 'How do I report an item?',
    a: 'Tap the "Report" button on the Browse screen, or go to You → My reported items → Report Item. ' +
       'Choose Lost or Found, fill in the name, description, category, location and date, add a photo if you can, then tap Submit Report.',
  },
  {
    q: 'How do I delete a reported item?',
    a: 'Go to You → My reported items and tap Delete on the report, then confirm. ' +
       'You can also open the report and tap "Delete Report". Deleted reports are removed for everyone.',
  },
  {
    q: 'How do I mark an item as returned?',
    a: 'After you meet and the item changes hands, the other student taps "Confirm handover" in your chat. ' +
       'You then tap "Mark as returned" in the same chat. Returned items leave the main list but can still be seen under the "Returned" filter.',
  },
  {
    q: 'How do I edit my account?',
    a: 'Your name and email come from your sign-up details. To change your password, go to You → Privacy & safety → Change password. ' +
       'To change your name or email, contact support below.',
  },
  {
    q: 'How do I change my privacy settings?',
    a: 'Go to You → Privacy & safety. There you can choose whether your name is shown on new reports, review who can see your items, and manage camera and photo permissions.',
  },
  {
    q: 'How do I enable Dark Mode?',
    a: 'Go to You and turn on the "Dark mode" switch under Preferences. The whole app switches immediately, and your choice is remembered next time you open CampusFinder.',
  },
  {
    q: 'What should I do if I find a suspicious item or user?',
    a: "Don't engage further and never share personal or financial details. Go to You → Privacy & safety → Report a user or content, and tell us what happened. " +
       'If you feel unsafe or the item looks dangerous, contact campus security straight away.',
  },
];

export default function HelpAndSupport({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Help & Support" navigation={navigation} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <SectionLabel>FREQUENTLY ASKED QUESTIONS</SectionLabel>
        <SettingsCard>
          {FAQS.map((faq, index) => (
            <View key={faq.q}>
              {index > 0 ? <View style={styles.faqDivider} /> : null}
              <AccordionItem title={faq.q}>{faq.a}</AccordionItem>
            </View>
          ))}
        </SettingsCard>

        {/* ── Contact ───────────────────────────────────────────────────── */}
        <SectionLabel>CONTACT SUPPORT</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={Mail}
            iconColor={colors.blue}
            iconBg={colors.tintBlue}
            title="Contact Support"
            subtitle={SUPPORT_EMAIL}
            onPress={() => openSupportEmail('Support request', 'How can we help?\n')}
          />
          <SettingsDivider />
          <SettingsRow
            icon={Bug}
            iconColor="#E5793D"
            iconBg={colors.tintPeach}
            title="Report a Problem"
            subtitle="Something not working as expected?"
            onPress={() =>
              openSupportEmail(
                'Problem report',
                'What were you trying to do?\n\nWhat happened instead?\n\nSteps to reproduce (if you know them):\n',
              )
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon={MessageSquareHeart}
            iconColor={colors.green}
            iconBg={colors.tintGreen}
            title="Send Feedback"
            subtitle="Ideas to make CampusFinder better"
            onPress={() => openSupportEmail('Feedback', 'Your feedback:\n')}
          />
        </SettingsCard>

        {/* ── Safety information ────────────────────────────────────────── */}
        <SectionLabel>STAY SAFE</SectionLabel>
        <View style={styles.safetyCard}>
          <View style={styles.safetyTitleRow}>
            <ShieldAlert size={18} color={colors.orange} strokeWidth={2.2} />
            <Text style={styles.safetyTitle}>Protect your personal information</Text>
          </View>
          <Text style={styles.safetyText}>
            Never share passwords, bank details, PINs, ID numbers or your home address in reports or chats.
            CampusFinder staff will never ask for your password.
          </Text>
          <Text style={styles.safetyText}>
            If something feels wrong — a suspicious item, a request for money, or someone pressuring you —
            stop replying and report it from Privacy & safety → Report a user or content.
          </Text>
        </View>

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
  faqDivider: {
    height: 1,
    backgroundColor: c.divider,
    marginLeft: 14,
  },
  safetyCard: {
    backgroundColor: c.tintOrange,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: c.orange,
    padding: 16,
    marginBottom: 24,
  },
  safetyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  safetyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
  },
  safetyText: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    marginBottom: 6,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: c.textFaint,
  },
});
