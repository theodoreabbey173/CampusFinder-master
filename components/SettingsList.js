/**
 * components/SettingsList.js
 * --------------------------
 * Building blocks for the rounded settings cards used on the Account,
 * Privacy & Safety and Help & Support screens.
 *
 *   <SectionLabel>PRIVACY</SectionLabel>
 *   <SettingsCard>
 *     <SettingsRow icon={Lock} iconColor="#E53935" iconBg={colors.tintRed} title="…" onPress={…} />
 *     <SettingsDivider />
 *     <SettingsRow … right={<Switch … />} />
 *   </SettingsCard>
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export function SectionLabel({ children }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function SettingsCard({ children, style }) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SettingsDivider() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.divider} />;
}

/**
 * One row inside a SettingsCard.
 *
 * @param {{
 *   icon: React.ComponentType<any>,
 *   iconColor: string,
 *   iconBg: string,
 *   title: string,
 *   subtitle?: string,
 *   value?: string|number,     // small grey text before the chevron
 *   right?: React.ReactNode,   // replaces value + chevron (e.g. a Switch)
 *   onPress?: () => void,      // when set, the row is tappable and shows a chevron
 *   destructive?: boolean,     // red title
 *   disabled?: boolean,
 * }} props
 */
export function SettingsRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  value,
  right,
  onPress,
  destructive,
  disabled,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const content = (
    <>
      {Icon ? (
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} strokeWidth={2.2} />
        </View>
      ) : null}
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, destructive && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        <>
          {value !== undefined && value !== null && value !== '' ? (
            <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
          ) : null}
          {onPress ? <ChevronRight size={18} color={colors.chevron} strokeWidth={2.2} /> : null}
        </>
      )}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, disabled && styles.disabled]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabled]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}

const createStyles = (c) => StyleSheet.create({
  sectionLabel: {
    fontSize:      12,
    fontWeight:    '700',
    color:         c.textMuted,
    letterSpacing: 0.5,
    marginBottom:  10,
    marginLeft:    4,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius:    16,
    marginBottom:    24,
    shadowColor:     c.shadow,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.05,
    shadowRadius:    6,
    elevation:       2,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   14,
    paddingHorizontal: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  rowIconWrap: {
    width:          36,
    height:         36,
    borderRadius:   10,
    justifyContent: 'center',
    alignItems:     'center',
    marginRight:    12,
  },
  rowTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    fontSize:   15,
    fontWeight: '600',
    color:      c.text,
  },
  rowSubtitle: {
    fontSize:  12,
    color:     c.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontSize:    14,
    color:       c.textMuted,
    marginRight: 6,
    maxWidth:    140,
  },
  divider: {
    height:          1,
    backgroundColor: c.divider,
    marginLeft:      62,
  },
});
