import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const categories = [
  { key: 'bug', label: 'Report a bug', icon: 'bug-outline' },
  { key: 'idea', label: 'Suggest an idea', icon: 'bulb-outline' },
  { key: 'praise', label: 'Give praise', icon: 'heart-outline' },
  { key: 'other', label: 'Something else', icon: 'chatbubble-outline' },
];

export default function FeedbackScreen() {
  const { session } = useAuth();

  const [category, setCategory] = useState('idea');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async () => {
    setStatus(null);

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setStatus({
        type: 'error',
        text: 'Please write some feedback before sending.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: session?.user?.id || null,
        category,
        message: trimmedMessage,
      });

      if (error) {
        console.error('Feedback submission error:', error);

        setStatus({
          type: 'error',
          text: `Could not send feedback: ${error.message}`,
        });

        return;
      }

      setMessage('');

      setStatus({
        type: 'success',
        text: 'Thank you! Your feedback has been sent successfully.',
      });
    } catch (error) {
      console.error('Unexpected feedback error:', error);

      setStatus({
        type: 'error',
        text: 'Something went wrong while sending your feedback.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>We'd love your feedback</Text>

      <Text style={styles.subtitle}>
        Tell us what's working, what's not, or what you'd like to see next.
      </Text>

      <View style={styles.categoryGrid}>
        {categories.map((c) => {
          const active = category === c.key;

          return (
            <Pressable
              key={c.key}
              style={[
                styles.categoryChip,
                active && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(c.key)}
            >
              <Ionicons
                name={c.icon}
                size={18}
                color={active ? '#fff' : colors.textMuted}
              />

              <Text
                style={[
                  styles.categoryChipText,
                  active && styles.categoryChipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Type your feedback here..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      {status && (
        <View
          style={[
            styles.statusBox,
            status.type === 'success'
              ? styles.successBox
              : styles.errorBox,
          ]}
        >
          <Ionicons
            name={
              status.type === 'success'
                ? 'checkmark-circle-outline'
                : 'alert-circle-outline'
            }
            size={20}
            color={
              status.type === 'success'
                ? colors.primary
                : colors.danger
            }
          />

          <Text
            style={[
              styles.statusText,
              status.type === 'success'
                ? styles.successText
                : styles.errorText,
            ]}
          >
            {status.text}
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.submitBtn,
          submitting && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons
              name="send-outline"
              size={18}
              color="#fff"
            />
            <Text style={styles.submitBtnText}>
              Send Feedback
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.backBtn}
        onPress={() => router.back()}
        disabled={submitting}
      >
        <Text style={styles.backBtnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },

  title: {
    ...typography.h1,
    fontSize: 20,
    marginTop: spacing.md,
  },

  subtitle: {
    ...typography.caption,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },

  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  categoryChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  categoryChipTextActive: {
    color: '#fff',
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text,
    fontSize: 15,
    height: 140,
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: colors.primary,
  },

  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: colors.danger,
  },

  statusText: {
    flex: 1,
    fontSize: 13,
  },

  successText: {
    color: colors.primary,
  },

  errorText: {
    color: colors.danger,
  },

  submitBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    flexDirection: 'row',
    gap: spacing.sm,
  },

  submitBtnDisabled: {
    opacity: 0.7,
  },

  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  backBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
  },

  backBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});