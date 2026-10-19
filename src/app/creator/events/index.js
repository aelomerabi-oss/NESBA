import { useEffect, useState } from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../../constants/theme';

import { createEvent } from '../../../lib/nesba';
import { useAuth } from '../../../context/AuthContext';
import { canReceivePayments, formatPrice, parsePrice, PLATFORM_FEE_PERCENT } from '../../../lib/payments';
import { MIN_TICKET_CENTS } from '../../../lib/workshops';

export default function CreatorEvents() {
  const [eventType, setEventType] =
    useState('live_class');

  const [title, setTitle] = useState('');
  const [description, setDescription] =
    useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [duration, setDuration] =
    useState('60');

  const [saving, setSaving] =
    useState(false);

  const { session } = useAuth();
  const userId = session?.user?.id;

  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [canSell, setCanSell] = useState(false);

  useEffect(() => {
    if (userId) canReceivePayments(userId).then(setCanSell);
  }, [userId]);

  const priceCents = parsePrice(price);

  const eventTypes = [
    {
      id: 'live_class',
      title: 'Live Class',
      description:
        'Teach students live online.',
      icon: 'videocam-outline',
    },
    {
      id: 'workshop',
      title: 'Workshop',
      description:
        'Interactive educational workshop.',
      icon: 'people-outline',
    },
    {
      id: 'masterclass',
      title: 'Masterclass',
      description:
        'A one-off session where an expert shares their know-how.',
      icon: 'school-outline',
    },
    {
      id: 'webinar',
      title: 'Webinar',
      description:
        'Online presentation or seminar.',
      icon: 'globe-outline',
    },
    {
      id: 'event',
      title: 'Event',
      description:
        'General educational event.',
      icon: 'calendar-outline',
    },
  ];

  async function scheduleEvent() {
    if (!title.trim()) {
      Alert.alert(
        'Required',
        'Event title is required.'
      );
      return;
    }

    if (!date.trim()) {
      Alert.alert(
        'Required',
        'Event date is required.'
      );
      return;
    }

    if (!time.trim()) {
      Alert.alert(
        'Required',
        'Event time is required.'
      );
      return;
    }

    /*
     * Date and time are entered in the device's local time zone.
     */
    const startsAt = new Date(
      `${date.trim()}T${time.trim().padStart(5, '0')}`
    );

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ||
      !/^\d{1,2}:\d{2}$/.test(time.trim()) ||
      Number.isNaN(startsAt.getTime())
    ) {
      Alert.alert(
        'Invalid date',
        'Use the format YYYY-MM-DD for the date and HH:MM for the time.'
      );
      return;
    }

    if (priceCents === null || (priceCents > 0 && priceCents < MIN_TICKET_CENTS)) {
      Alert.alert(
        'Invalid price',
        'Enter a ticket price like 25 or 19.99 (at least €1), or leave it empty for a free event.'
      );
      return;
    }

    if (capacity.trim() && !(Number(capacity) > 0)) {
      Alert.alert(
        'Invalid number of seats',
        'Enter how many people can join, or leave it empty for no limit.'
      );
      return;
    }

    setSaving(true);

    try {
      const event = await createEvent({
        title,
        description,
        eventType,
        startsAt,
        durationMinutes: duration,
        capacity: capacity.trim() || null,
        priceCents,
      });

      // The event page has the link to share and the Go live button.
      router.replace(`/event/${event.id}`);
    } catch (error) {
      Alert.alert(
        'Could not schedule event',
        error.message
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Live & Events
          </Text>

          <Text style={styles.subtitle}>
            Schedule live classes, workshops,
            webinars and educational events.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Event Type
        </Text>

        <View style={styles.typeList}>
          {eventTypes.map((type) => {
            const selected =
              eventType === type.id;

            return (
              <Pressable
                key={type.id}
                onPress={() =>
                  setEventType(type.id)
                }
                style={[
                  styles.typeCard,
                  selected &&
                    styles.typeCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.typeIcon,
                    selected &&
                      styles.typeIconSelected,
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={25}
                    color={
                      selected
                        ? colors.primary
                        : colors.textMuted
                    }
                  />
                </View>

                <View
                  style={styles.typeInfo}
                >
                  <Text
                    style={
                      styles.typeTitle
                    }
                  >
                    {type.title}
                  </Text>

                  <Text
                    style={
                      styles.typeDescription
                    }
                  >
                    {type.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected &&
                      styles.radioSelected,
                  ]}
                >
                  {selected ? (
                    <View
                      style={
                        styles.radioDot
                      }
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Event Details
        </Text>

        <FieldLabel
          label="Event Title"
          required
        />

        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="Example: Introduction to Business Analytics"
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Description"
        />

        <TextInput
          value={description}
          onChangeText={
            setDescription
          }
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.textArea,
          ]}
          placeholder="Describe your event..."
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Date"
          required
        />

        <TextInput
          value={date}
          onChangeText={setDate}
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Time"
          required
        />

        <TextInput
          value={time}
          onChangeText={setTime}
          style={styles.input}
          placeholder="19:00"
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Duration (minutes)"
        />

        <TextInput
          value={duration}
          onChangeText={setDuration}
          style={styles.input}
          keyboardType="numeric"
          placeholder="60"
          placeholderTextColor={
            colors.textMuted
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Tickets
        </Text>

        <FieldLabel
          label="Ticket price (€)"
        />

        <TextInput
          value={price}
          onChangeText={setPrice}
          editable={canSell}
          style={[
            styles.input,
            !canSell && styles.disabled,
          ]}
          keyboardType="decimal-pad"
          placeholder="Leave empty for a free event"
          placeholderTextColor={
            colors.textMuted
          }
        />

        {canSell ? (
          priceCents > 0 ? (
            <Text style={styles.hint}>
              You receive {formatPrice(Math.round(priceCents * (100 - PLATFORM_FEE_PERCENT) / 100))} per ticket; NESBA keeps {PLATFORM_FEE_PERCENT}%.
            </Text>
          ) : null
        ) : (
          <Pressable
            onPress={() =>
              router.push('/creator/payouts')
            }
          >
            <Text style={styles.hintLink}>
              To sell tickets, first connect your payout account in Creator Studio › Payouts.
            </Text>
          </Pressable>
        )}

        <FieldLabel
          label="Number of seats"
        />

        <TextInput
          value={capacity}
          onChangeText={setCapacity}
          style={styles.input}
          keyboardType="numeric"
          placeholder="Leave empty for no limit"
          placeholderTextColor={
            colors.textMuted
          }
        />

        <Text style={styles.hint}>
          After scheduling you get a link to share on Instagram, LinkedIn or WhatsApp. People sign up and pay there.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Event Platform
        </Text>

        <View style={styles.platformBox}>
          <Ionicons
            name="radio-outline"
            size={25}
            color={colors.primary}
          />

          <View style={styles.platformInfo}>
            <Text style={styles.platformTitle}>
              NESBA Live
            </Text>

            <Text
              style={
                styles.platformDescription
              }
            >
              Host the event directly through
              the NESBA platform.
            </Text>
          </View>

          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.primary}
          />
        </View>
      </View>

      <Pressable
        onPress={scheduleEvent}
        disabled={saving}
        style={({ pressed }) => [
          styles.scheduleButton,
          pressed &&
            styles.pressed,
          saving &&
            styles.disabled,
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={21}
          color="#fff"
        />

        <Text
          style={
            styles.scheduleButtonText
          }
        >
          {saving
            ? 'Scheduling...'
            : 'Schedule Event'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.push('/creator')
        }
        style={styles.cancelButton}
      >
        <Text
          style={
            styles.cancelButtonText
          }
        >
          Back to Creator Studio
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function FieldLabel({
  label,
  required = false,
}) {
  return (
    <Text style={styles.label}>
      {label}{' '}
      {required ? (
        <Text style={styles.required}>
          *
        </Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  content: {
    padding: spacing.md,
    paddingBottom:
      spacing.xl * 3,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  headerText: {
    flex: 1,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 28,
  },

  subtitle: {
    color:
      colors.textMuted,
    lineHeight: 21,
    marginTop: 4,
  },

  card: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding: spacing.md,
    marginBottom:
      spacing.md,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom:
      spacing.md,
  },

  typeList: {
    gap: spacing.sm,
  },

  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    padding: spacing.sm,
    backgroundColor:
      colors.background,
  },

  typeCardSelected: {
    borderColor:
      colors.primary,
    borderWidth: 2,
  },

  typeIcon: {
    width: 46,
    height: 46,
    borderRadius:
      radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.surface,
    marginRight:
      spacing.sm,
  },

  typeIconSelected: {
    backgroundColor:
      colors.background,
  },

  typeInfo: {
    flex: 1,
  },

  typeTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  typeDescription: {
    color:
      colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor:
      colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor:
      colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor:
      colors.primary,
  },

  label: {
    color: colors.text,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  required: {
    color: '#ff4d67',
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.background,
    color: colors.text,
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.sm,
  },

  textArea: {
    minHeight: 120,
  },

  platformBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      colors.primary,
    borderRadius:
      radius.md,
    padding: spacing.md,
    backgroundColor:
      colors.background,
  },

  platformInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  platformTitle: {
    color: colors.text,
    fontWeight: '900',
  },

  platformDescription: {
    color:
      colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  scheduleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor:
      colors.primary,
    borderRadius:
      radius.md,
    marginTop: spacing.xs,
  },

  scheduleButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  cancelButtonText: {
    color:
      colors.textMuted,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.6,
  },

  hint: {
    color:
      colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  hintLink: {
    color:
      colors.primary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});