
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radius } from '../constants/theme';

export default function PremiumScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NESBA is Free 🎓</Text>
      <Text style={styles.text}>The initial NESBA platform is free. Premium subscriptions and paid features are intentionally disabled until the community grows.</Text>
      <Text style={styles.text}>Future premium features may include advanced creator tools, premium content and enhanced analytics.</Text>
      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Continue Learning</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background,padding:spacing.lg,justifyContent:'center'},
  title:{...typography.h1,textAlign:'center',marginBottom:spacing.md},
  text:{...typography.body,color:colors.textMuted,textAlign:'center',lineHeight:22,marginBottom:spacing.md},
  button:{backgroundColor:colors.primary,padding:spacing.md,borderRadius:radius.md,alignItems:'center',marginTop:spacing.md},
  buttonText:{color:'#fff',fontWeight:'700'}
});
