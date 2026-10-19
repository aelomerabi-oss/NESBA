import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';

const EMOJIS = [
  '😀', '😂', '😊', '😍', '🥰', '😎', '🤩', '🥳', '😇', '🙂', '😉', '😅',
  '🤔', '😮', '😢', '😭', '😡', '🙏', '👍', '👎', '👏', '🙌', '💪', '🤝',
  '👋', '✌️', '🔥', '✨', '🎉', '🎓', '📚', '💡', '🚀', '✅', '❌', '⭐',
  '❤️', '💜', '💙', '💚', '💛', '🧡', '💯', '👀', '📌', '📅', '💼', '💰',
];

/*
 * Simple emoji grid for the phone app, with the same onEmojiClick({ emoji })
 * callback as emoji-picker-react, which only works in a browser.
 */
export default function EmojiPicker({ onEmojiClick, height = 260 }) {
  return (
    <ScrollView style={[styles.container, { maxHeight: height }]}>
      <View style={styles.grid}>
        {EMOJIS.map((emoji) => (
          <Pressable key={emoji} style={styles.cell} onPress={() => onEmojiClick({ emoji })}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  cell: { width: '12.5%', alignItems: 'center', paddingVertical: 8 },
  emoji: { fontSize: 24 },
});
