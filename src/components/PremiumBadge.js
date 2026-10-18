import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';

export default function PremiumBadge({ small }) {
  return (
    <View style={[styles.badge, small && styles.badgeSmall]}>
      <Ionicons name="star" size={small ? 10 : 12} color="#181C2E" />
      <Text style={[styles.text, small && styles.textSmall]}>PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.premium,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: '#181C2E',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 9,
  },
});
