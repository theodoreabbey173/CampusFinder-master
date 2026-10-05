import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Expandable row for use inside a SettingsCard (FAQs, info panels).
 *
 * @param {{
 *   title: string,
 *   icon?: React.ComponentType<any>,
 *   iconColor?: string,
 *   iconBg?: string,
 *   children: React.ReactNode,   // string or custom content shown when expanded
 *   initiallyExpanded?: boolean,
 * }} props
 */
export default function AccordionItem({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  children,
  initiallyExpanded = false,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.row}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon size={16} color={iconColor} strokeWidth={2.2} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        <ChevronDown
          size={18}
          color={colors.chevron}
          strokeWidth={2.2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={[styles.body, Icon && styles.bodyIndented]}>
          {typeof children === 'string'
            ? <Text style={styles.bodyText}>{children}</Text>
            : children}
        </View>
      ) : null}
    </View>
  );
}

/** Bullet line for use inside an AccordionItem body. */
export function Bullet({ children }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.bodyText, styles.bulletText]}>{children}</Text>
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   14,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   10,
    justifyContent: 'center',
    alignItems:     'center',
    marginRight:    12,
  },
  title: {
    flex:        1,
    fontSize:    15,
    fontWeight:  '600',
    color:       c.text,
    marginRight: 8,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom:     14,
    marginTop:         -4,
  },
  bodyIndented: {
    paddingLeft: 62,
  },
  bodyText: {
    fontSize:   14,
    lineHeight: 21,
    color:      c.textSecondary,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom:  4,
  },
  bulletDot: {
    width:      14,
    fontSize:   14,
    lineHeight: 21,
    color:      c.textMuted,
  },
  bulletText: {
    flex: 1,
  },
});
