import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

/**
 * Back button + title header used by stack screens
 * (same look as ReportItemScreen / InboxScreen headers).
 *
 * @param {{ title: string, navigation: object, right?: React.ReactNode }} props
 */
export default function ScreenHeader({ title, navigation, right }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={22} color={colors.text} strokeWidth={2.4} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   c.surface,
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  backButton: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: c.surfaceAlt,
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     12,
  },
  headerTitle: {
    flex:       1,
    fontSize:   22,
    fontWeight: '800',
    color:      c.text,
  },
  right: {
    marginLeft: 8,
  },
});
