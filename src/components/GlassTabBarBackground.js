import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

export default function GlassTabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={65}
        tint="dark"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.fallback]}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(24, 28, 46, 0.92)',
  },
});