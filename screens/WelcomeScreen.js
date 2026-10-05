import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Map, Lock } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const FEATURES = [
  {
    Icon: Search,
    color: '#E91E63',
    bg: 'tintPink',
    title: 'Report in seconds',
    description: 'Post a lost or found item with a photo and location.',
  },
  {
    Icon: Map,
    color: '#00897B',
    bg: 'tintGreen',
    title: 'Browse what\'s around',
    description: 'See everything lost and found across campus.',
  },
  {
    Icon: Lock,
    color: '#FB8C00',
    bg: 'tintOrange',
    title: 'Chat securely',
    description: 'Connect safely — your details stay private.',
  },
];

export default function WelcomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleGetStarted = () => {
    navigation.navigate('ItemList');
  };

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={['#16296b', '#1c4b8e', '#159e94']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.logoWrapper}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
        </View>
        <Text style={styles.title}>Welcome to{'\n'}CampusFinder!</Text>
        <Text style={styles.subtitle}>
          Reunite lost items with their owners — right here on campus.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        {FEATURES.map((feature) => (
          <View style={styles.featureRow} key={feature.title}>
            <View style={[styles.iconWrapper, { backgroundColor: colors[feature.bg] }]}>
              <feature.Icon size={22} color={feature.color} strokeWidth={2.2} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: c.surface,
  },
  header: {
    paddingTop: 70,
    paddingBottom: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
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
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flex: 1,
    backgroundColor: c.surface,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: '#1B3A8A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
