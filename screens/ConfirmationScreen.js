import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CheckCircle2, PackageCheck, Lightbulb } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function ConfirmationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const itemName = route.params?.itemName;

  const handleBackToItems = () => {
    navigation.navigate('ItemList');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <CheckCircle2 size={72} color="#4CAF50" strokeWidth={1.8} />
      </View>

      <Text style={styles.title}>Item returned</Text>

      <Text style={styles.subtitle}>
        {itemName ? `"${itemName}" is` : 'Your item is'} now marked as returned. Thanks for helping
        reunite it with its owner.
      </Text>

      <View style={styles.infoBox}>
        <View style={styles.boxTitleRow}>
          <PackageCheck size={17} color={colors.text} strokeWidth={2.2} />
          <Text style={styles.infoTitle}>What happens now</Text>
        </View>
        <Text style={styles.infoText}>
          • The item no longer appears in the main list
        </Text>
        <Text style={styles.infoText}>
          • It can still be found under the "Returned" filter
        </Text>
        <Text style={styles.infoText}>
          • The chat stays available to read, but no new messages can be sent
        </Text>
      </View>

      <View style={styles.tipBox}>
        <View style={styles.boxTitleRow}>
          <Lightbulb size={17} color={colors.text} strokeWidth={2.2} />
          <Text style={styles.tipTitle}>Pro Tips</Text>
        </View>
        <Text style={styles.tipText}>
          • Meet in public places on campus
        </Text>
        <Text style={styles.tipText}>
          • Verify item details before meeting
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleBackToItems}>
          <Text style={styles.primaryButtonText}>Back to Items</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.surface,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: c.text,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: c.textSecondary,
    lineHeight: 26,
  },
  infoBox: {
    backgroundColor: c.tintGreen,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  boxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
  },
  infoText: {
    fontSize: 16,
    color: c.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  tipBox: {
    backgroundColor: c.tintOrange,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
  },
  tipText: {
    fontSize: 16,
    color: c.textSecondary,
    marginBottom: 8,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});