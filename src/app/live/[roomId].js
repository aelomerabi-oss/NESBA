import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Room, RoomEvent } from 'livekit-client';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  endLiveRoom,
  getLiveParticipants,
  getLiveRoom,
  joinLiveRoom,
  leaveLiveRoom,
  setLiveParticipantRole,
  updateMyLiveParticipation,
} from '../../lib/nesba';

const POLL_MS = 4000;

/*
 * Live audio room.
 *
 * Audio uses livekit-client, which needs the browser's WebRTC and <audio>
 * elements, so it runs in the web version of the app. Phones need a
 * development build with @livekit/react-native; until then they see a notice.
 */
export default function LiveRoomScreen() {
  const { roomId } = useLocalSearchParams();
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const displayName = profile?.full_name?.trim() || session?.user?.email || 'NESBA User';

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | connecting | connected | ended | error
  const [message, setMessage] = useState('');
  const [canPublish, setCanPublish] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const [working, setWorking] = useState(false);

  // Read through a ref so the profile loading later does not rejoin the room.
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  const lkRoomRef = useRef(null);
  const audioElementsRef = useRef([]);
  const connectedRoleRef = useRef(null);
  const leftRef = useRef(false);

  const me = participants.find((p) => p.user_id === userId);
  const isHost = !!room && room.host_id === userId;

  const cleanupAudio = () => {
    audioElementsRef.current.forEach((el) => el?.parentNode?.removeChild(el));
    audioElementsRef.current = [];
  };

  const disconnect = useCallback(() => {
    lkRoomRef.current?.disconnect();
    lkRoomRef.current = null;
    connectedRoleRef.current = null;
    cleanupAudio();
    setMicOn(false);
  }, []);

  const connect = useCallback(async () => {
    disconnect();
    setStatus('connecting');

    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { roomId, participantName: displayNameRef.current },
    });
    if (error) throw error;
    if (!data?.token || !data?.url) throw new Error(data?.error || 'Live audio is not available right now.');

    const lkRoom = new Room();
    lkRoomRef.current = lkRoom;

    lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== 'audio' || typeof document === 'undefined') return;
      const el = track.attach();
      el.autoplay = true;
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElementsRef.current.push(el);
    });
    lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el?.parentNode?.removeChild(el));
    });
    lkRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      setNeedsAudioTap(!lkRoom.canPlaybackAudio);
    });
    lkRoom.on(RoomEvent.Disconnected, () => {
      if (lkRoomRef.current === lkRoom) {
        lkRoomRef.current = null;
        cleanupAudio();
        setMicOn(false);
        if (!leftRef.current) setStatus((s) => (s === 'ended' ? s : 'error'));
        if (!leftRef.current) setMessage('Disconnected from the live room.');
      }
    });

    await lkRoom.connect(data.url, data.token);
    connectedRoleRef.current = data.role;
    setCanPublish(!!data.canPublish);
    setNeedsAudioTap(!lkRoom.canPlaybackAudio);
    setStatus('connected');
    setMessage('');
  }, [roomId, disconnect]);

  const refreshParticipants = useCallback(async () => {
    const [roomRow, rows] = await Promise.all([getLiveRoom(roomId), getLiveParticipants(roomId)]);
    setRoom(roomRow);
    setParticipants(rows);
    return { roomRow, rows };
  }, [roomId]);

  // Join on open, leave on close.
  useEffect(() => {
    if (Platform.OS !== 'web' || !userId) return undefined;
    leftRef.current = false;
    let cancelled = false;

    (async () => {
      try {
        const roomRow = await getLiveRoom(roomId);
        if (cancelled) return;
        setRoom(roomRow);
        if (!roomRow || roomRow.status !== 'live') {
          setStatus('ended');
          return;
        }
        await joinLiveRoom(roomId);
        await refreshParticipants();
        if (!cancelled) await connect();
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setMessage(e.message);
        }
      }
    })();

    return () => {
      cancelled = true;
      leftRef.current = true;
      disconnect();
      leaveLiveRoom(roomId, userId).catch(() => {});
    };
  }, [roomId, userId, connect, disconnect, refreshParticipants]);

  // Poll for participants, role changes and the room ending.
  useEffect(() => {
    if (Platform.OS !== 'web' || status !== 'connected') return undefined;
    const timer = setInterval(async () => {
      try {
        const { roomRow, rows } = await refreshParticipants();
        if (roomRow?.status !== 'live') {
          leftRef.current = true;
          disconnect();
          setStatus('ended');
          return;
        }
        // Promoted or moved back to the audience: reconnect with a new token.
        const mine = rows.find((p) => p.user_id === userId);
        if (mine && connectedRoleRef.current && mine.role !== connectedRoleRef.current) {
          await connect();
        }
      } catch (e) {
        console.error('Live room refresh error:', e);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status, userId, refreshParticipants, connect, disconnect]);

  const run = async (action) => {
    try {
      setWorking(true);
      setMessage('');
      await action();
      await refreshParticipants();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setWorking(false);
    }
  };

  const toggleMic = () => run(async () => {
    const enabled = !micOn;
    await lkRoomRef.current?.localParticipant.setMicrophoneEnabled(enabled);
    setMicOn(enabled);
    await updateMyLiveParticipation(roomId, userId, { is_muted: !enabled });
  });

  const toggleHand = () => run(() =>
    updateMyLiveParticipation(roomId, userId, { hand_raised: !me?.hand_raised })
  );

  const endSession = () => run(async () => {
    await endLiveRoom(roomId);
    leftRef.current = true;
    disconnect();
    setStatus('ended');
  });

  const leave = () => {
    leftRef.current = true;
    disconnect();
    if (userId) leaveLiveRoom(roomId, userId).catch(() => {});
    router.back();
  };

  const title = room?.events?.title || 'Live session';

  if (Platform.OS !== 'web') {
    return (
      <Centered title={title} icon="desktop-outline">
        Live audio rooms currently work in the web version of NESBA. Open NESBA in your browser to join this session.
      </Centered>
    );
  }

  if (!userId) {
    return (
      <Centered title={title} icon="log-in-outline" action={{ label: 'Log in', onPress: () => router.push('/login') }}>
        Log in to join this live session.
      </Centered>
    );
  }

  if (status === 'loading') {
    return <Centered title={title}><ActivityIndicator color={colors.primary} /></Centered>;
  }

  if (status === 'ended') {
    return (
      <Centered title={title} icon="checkmark-circle-outline" action={{ label: 'Back to events', onPress: () => router.replace('/live') }}>
        This live session has ended.
      </Centered>
    );
  }

  const hands = participants.filter((p) => p.role === 'listener' && p.hand_raised);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />

      <View style={styles.banner}>
        <View style={styles.liveTag}><Text style={styles.liveText}>LIVE</Text></View>
        <Text style={styles.bannerText}>
          {status === 'connecting' ? 'Connecting…' : `${participants.length} in the room`}
        </Text>
      </View>

      {!!message && <Text style={styles.error}>{message}</Text>}

      {status === 'error' && (
        <Pressable
          style={[styles.smallButton, styles.reconnect]}
          onPress={() => run(async () => {
            leftRef.current = false;
            await joinLiveRoom(roomId);
            await connect();
          })}
        >
          <Text style={styles.smallButtonText}>Reconnect</Text>
        </Pressable>
      )}

      {needsAudioTap && (
        <Pressable style={styles.audioTap} onPress={() => lkRoomRef.current?.startAudio().then(() => setNeedsAudioTap(false))}>
          <Ionicons name="volume-high" size={18} color="#fff" />
          <Text style={styles.audioTapText}>Tap to hear the session</Text>
        </Pressable>
      )}

      {isHost && hands.length > 0 && (
        <Text style={styles.section}>Raised hands ({hands.length})</Text>
      )}

      <FlatList
        data={participants}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }) => {
          const name = item.profiles?.full_name || 'NESBA member';
          const isMe = item.user_id === userId;
          return (
            <View style={styles.person}>
              <View style={[styles.avatar, item.role !== 'listener' && styles.avatarSpeaker]}>
                <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{name}{isMe ? ' (you)' : ''}</Text>
                <Text style={styles.role}>
                  {item.role === 'host' ? 'Host' : item.role === 'speaker' ? 'Speaker' : 'Listener'}
                  {item.role !== 'listener' ? (item.is_muted ? ' · muted' : ' · mic on') : ''}
                  {item.hand_raised ? ' · ✋ hand raised' : ''}
                </Text>
              </View>
              {isHost && !isMe && item.role === 'listener' && (
                <Pressable disabled={working} style={styles.smallButton} onPress={() => run(() => setLiveParticipantRole(roomId, item.user_id, 'speaker'))}>
                  <Text style={styles.smallButtonText}>Invite to speak</Text>
                </Pressable>
              )}
              {isHost && !isMe && item.role === 'speaker' && (
                <Pressable disabled={working} style={styles.smallButtonOutline} onPress={() => run(() => setLiveParticipantRole(roomId, item.user_id, 'listener'))}>
                  <Text style={styles.smallButtonOutlineText}>Move to audience</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      <View style={styles.controls}>
        {canPublish ? (
          <Pressable disabled={working || status !== 'connected'} style={[styles.control, micOn && styles.controlActive]} onPress={toggleMic}>
            <Ionicons name={micOn ? 'mic' : 'mic-off'} size={20} color="#fff" />
            <Text style={styles.controlText}>{micOn ? 'Mute' : 'Unmute'}</Text>
          </Pressable>
        ) : (
          <Pressable disabled={working} style={[styles.control, me?.hand_raised && styles.controlActive]} onPress={toggleHand}>
            <Text style={styles.controlEmoji}>✋</Text>
            <Text style={styles.controlText}>{me?.hand_raised ? 'Lower hand' : 'Raise hand'}</Text>
          </Pressable>
        )}

        {isHost ? (
          <Pressable disabled={working} style={[styles.control, styles.controlDanger]} onPress={endSession}>
            <Ionicons name="stop-circle" size={20} color="#fff" />
            <Text style={styles.controlText}>End session</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.control, styles.controlDanger]} onPress={leave}>
            <Ionicons name="exit-outline" size={20} color="#fff" />
            <Text style={styles.controlText}>Leave</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Centered({ title, icon, action, children }) {
  return (
    <View style={[styles.container, styles.center]}>
      <Stack.Screen options={{ title }} />
      {!!icon && <Ionicons name={icon} size={42} color={colors.textMuted} />}
      {typeof children === 'string' ? <Text style={styles.centerText}>{children}</Text> : children}
      {!!action && (
        <Pressable style={[styles.smallButton, { marginTop: spacing.md }]} onPress={action.onPress}>
          <Text style={styles.smallButtonText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  centerText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  bannerText: { ...typography.caption },
  liveTag: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  audioTap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  audioTapText: { color: '#fff', fontWeight: '700' },
  section: { ...typography.caption, fontWeight: '700', marginBottom: spacing.xs },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarSpeaker: { borderWidth: 2, borderColor: colors.accent },
  avatarText: { color: colors.text, fontWeight: '700' },
  name: { ...typography.body, fontWeight: '700' },
  role: { ...typography.caption, marginTop: 2 },
  smallButton: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  smallButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reconnect: { alignSelf: 'flex-start', marginBottom: spacing.md },
  smallButtonOutline: { borderColor: colors.primaryLight, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  smallButtonOutlineText: { color: colors.primaryLight, fontSize: 12, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  control: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingVertical: 12 },
  controlActive: { backgroundColor: colors.primary },
  controlDanger: { backgroundColor: colors.danger },
  controlText: { color: '#fff', fontWeight: '700' },
  controlEmoji: { fontSize: 16 },
});
