import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera } from 'lucide-react-native';

export default function LucideIconExample() {
  return (
    <View style={styles.container}>
      <Camera color="#4F46E5" size={32} />
      <Text style={styles.label}>Lucide icons are working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
});
