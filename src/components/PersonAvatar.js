import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

// Profile photo, or the first letter of the name when there is none.
export default function PersonAvatar({ person, size = 44 }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (person?.avatar_url) {
    return <Image source={{ uri: person.avatar_url }} style={shape} />;
  }

  return (
    <View style={[styles.fallback, shape]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>
        {(person?.full_name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  letter: { color: colors.primary, fontWeight: '800' },
});
