import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { deleteLiveRoomMessage, getLiveRoomMessages, sendLiveRoomMessage } from '../../lib/nesba';

/*
 * Live session chat. New messages arrive through Supabase Realtime.
 * The host and the author can delete a message.
 *
 * people: Map user_id -> { name } for showing names of new messages.
 */
export default function LiveChat({ roomId, currentUserId, isHost, people, disabled }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let active = true;

    getLiveRoomMessages(roomId)
      .then((rows) => active && setMessages(rows))
      .catch((e) => active && setError(e.message));

    const channel = supabase
      .channel(`live-chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_room_messages', filter: `room_id=eq.${roomId}` },
        ({ new: row }) => {
          setMessages((current) => (current.some((m) => m.id === row.id) ? current : [...current, row]));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'live_room_messages' },
        ({ old }) => {
          setMessages((current) => current.filter((m) => m.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    try {
      setSending(true);
      setError('');
      const row = await sendLiveRoomMessage(roomId, currentUserId, content);
      setText('');
      setMessages((current) => (current.some((m) => m.id === row.id) ? current : [...current, row]));
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteLiveRoomMessage(id);
      setMessages((current) => current.filter((m) => m.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const nameOf = (message) =>
    message.profiles?.full_name || people?.get(message.user_id)?.name || 'Member';

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello 👋</Text>}
        renderItem={({ item }) => {
          const mine = item.user_id === currentUserId;
          return (
            <View style={[styles.message, mine && styles.mine]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>{mine ? 'You' : nameOf(item)}</Text>
                <Text style={styles.text}>{item.content}</Text>
              </View>
              {(mine || isHost) && (
                <Pressable onPress={() => remove(item.id)} hitSlop={8} accessibilityLabel="Delete message">
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Chat is closed' : 'Message the room…'}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          maxLength={1000}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable style={[styles.send, (!text.trim() || disabled) && styles.sendDisabled]} disabled={!text.trim() || disabled || sending} onPress={send}>
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingVertical: spacing.sm, gap: spacing.xs },
  empty: { ...typography.caption, textAlign: 'center', marginTop: spacing.lg },
  message: { flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  mine: { backgroundColor: '#2c2860' },
  author: { ...typography.caption, fontSize: 11, fontWeight: '700', color: colors.primaryLight },
  text: { ...typography.body, fontSize: 14, marginTop: 1 },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.xs, paddingTop: spacing.xs },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 9, fontSize: 14 },
  send: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
