import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { DisconnectReason, Room, RoomEvent, Track } from 'livekit-client';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  endLiveRoom,
  getLiveParticipants,
  getLiveRoom,
  joinLiveRoom,
  leaveLiveRoom,
  moderateLiveParticipant,
  updateMyLiveParticipation,
} from '../../lib/nesba';
import LiveChat from '../../components/live/LiveChat';

const POLL_MS = 8000;

// three.js is only downloaded when someone opens a live room.
const LectureHall3D = lazy(() => import('../../components/live/LectureHall3D'));

// LiveKit identities are "<userId>-<random uuid>".
const userIdFromIdentity = (identity) => String(identity || '').slice(0, 36);

/*
 * Live session room: 3D lecture hall, Clubhouse-style stage and audience,
 * host moderation, chat and screen sharing.
 *
 * Audio and screen sharing use livekit-client, which needs the browser's
 * WebRTC, so the room runs in the web version of the app. Phones need a
 * development build with @livekit/react-native; until then they see a notice.
 */
export default function LiveRoomScreen() {
  const { roomId } = useLocalSearchParams();
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const displayName = profile?.full_name?.trim() || session?.user?.email || 'NESBA User';
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | connecting | connected | ended | removed | error
  const [message, setMessage] = useState('');
  const [canPublish, setCanPublish] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const [working, setWorking] = useState(false);
  const [speakingIds, setSpeakingIds] = useState(new Set());
  const [screenTrack, setScreenTrack] = useState(null);
  const [screenOwnerId, setScreenOwnerId] = useState(null);
  const [panel, setPanel] = useState('people');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [presentationOpen, setPresentationOpen] = useState(false);

  // Read through a ref so the profile loading later does not rejoin the room.
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  const lkRoomRef = useRef(null);
  const audioElementsRef = useRef([]);
  const connectedRoleRef = useRef(null);
  const leftRef = useRef(false);
  const micOnRef = useRef(false);
  micOnRef.current = micOn;

  const me = participants.find((p) => p.user_id === userId);
  const isHost = !!room && room.host_id === userId;

  const people = useMemo(
    () =>
      participants.map((p) => ({
        ...p,
        name: p.profiles?.full_name || 'NESBA member',
        avatarUrl: p.profiles?.avatar_url || null,
      })),
    [participants]
  );
  const peopleById = useMemo(() => new Map(people.map((p) => [p.user_id, p])), [people]);
  const selected = selectedUserId ? peopleById.get(selectedUserId) : null;

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
    setScreenTrack(null);
    setScreenOwnerId(null);
    setSpeakingIds(new Set());
  }, []);

  const connect = useCallback(async () => {
    disconnect();
    setStatus('connecting');

    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { roomId, participantName: displayNameRef.current },
    });
    if (error) {
      let detail = null;
      try { detail = (await error.context?.json?.())?.error; } catch { detail = null; }
      throw new Error(detail || error.message);
    }
    if (!data?.token || !data?.url) throw new Error(data?.error || 'Live audio is not available right now.');

    const lkRoom = new Room({ adaptiveStream: true, dynacast: true });
    lkRoomRef.current = lkRoom;

    const showScreen = (track, ownerIdentity) => {
      setScreenTrack(track.mediaStreamTrack);
      setScreenOwnerId(userIdFromIdentity(ownerIdentity));
    };
    const clearScreen = (track) => {
      setScreenTrack((current) => (current === track.mediaStreamTrack ? null : current));
      setScreenOwnerId((current) => (current ? null : current));
    };

    lkRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (typeof document === 'undefined') return;
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        el.style.display = 'none';
        document.body.appendChild(el);
        audioElementsRef.current.push(el);
      } else if (track.source === Track.Source.ScreenShare) {
        showScreen(track, participant.identity);
      }
    });
    lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((el) => el?.parentNode?.removeChild(el));
      } else if (track.source === Track.Source.ScreenShare) {
        clearScreen(track);
      }
    });
    lkRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare && publication.track) {
        showScreen(publication.track, lkRoom.localParticipant.identity);
      }
    });
    lkRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare && publication.track) {
        clearScreen(publication.track);
      }
    });
    lkRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
      // The host muted us on the server.
      if (participant === lkRoom.localParticipant && publication.kind === Track.Kind.Audio) setMicOn(false);
    });
    lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setSpeakingIds(new Set(speakers.map((s) => userIdFromIdentity(s.identity))));
    });
    lkRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      setNeedsAudioTap(!lkRoom.canPlaybackAudio);
    });
    lkRoom.on(RoomEvent.Disconnected, (reason) => {
      if (lkRoomRef.current !== lkRoom) return;
      lkRoomRef.current = null;
      cleanupAudio();
      setMicOn(false);
      setScreenTrack(null);
      if (leftRef.current) return;
      if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        setStatus('removed');
      } else if (reason === DisconnectReason.ROOM_DELETED) {
        setStatus('ended');
      } else {
        setStatus((s) => (s === 'ended' || s === 'removed' ? s : 'error'));
        setMessage('Disconnected from the live room.');
      }
    });

    await lkRoom.connect(data.url, data.token);
    connectedRoleRef.current = data.role;
    setCanPublish(!!data.canPublish);
    setNeedsAudioTap(!lkRoom.canPlaybackAudio);
    setStatus('connected');
    setMessage('');
  }, [roomId, disconnect]);

  const refresh = useCallback(async () => {
    const [roomRow, rows, mine] = await Promise.all([
      getLiveRoom(roomId),
      getLiveParticipants(roomId),
      supabase
        .from('live_audio_participants')
        .select('role,is_muted,is_removed')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => data),
    ]);
    setRoom(roomRow);
    setParticipants(rows);
    return { roomRow, rows, mine };
  }, [roomId, userId]);

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
        await refresh();
        if (!cancelled) await connect();
      } catch (e) {
        if (cancelled) return;
        if (/removed you/i.test(e.message)) setStatus('removed');
        else {
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
  }, [roomId, userId, connect, disconnect, refresh]);

  // React to the room, roles, mutes and removals.
  const sync = useCallback(async () => {
    try {
      const { roomRow, mine } = await refresh();
      if (roomRow?.status !== 'live') {
        leftRef.current = true;
        disconnect();
        setStatus('ended');
        return;
      }
      if (mine?.is_removed) {
        leftRef.current = true;
        disconnect();
        setStatus('removed');
        return;
      }
      if (mine?.is_muted && micOnRef.current) {
        await lkRoomRef.current?.localParticipant.setMicrophoneEnabled(false);
        setMicOn(false);
      }
      // Invited on stage or moved to the audience: reconnect with a new token.
      if (mine && connectedRoleRef.current && mine.role !== connectedRoleRef.current) {
        await connect();
      }
    } catch (e) {
      console.error('Live room refresh error:', e);
    }
  }, [refresh, connect, disconnect]);

  useEffect(() => {
    if (Platform.OS !== 'web' || status !== 'connected') return undefined;

    const channel = supabase
      .channel(`live-room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_audio_participants', filter: `room_id=eq.${roomId}` }, () => sync())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_audio_rooms', filter: `id=eq.${roomId}` }, () => sync())
      .subscribe();

    // Fallback if realtime is unavailable.
    const timer = setInterval(sync, POLL_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [status, roomId, sync]);

  const run = async (action) => {
    try {
      setWorking(true);
      setMessage('');
      await action();
      await refresh();
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

  const toggleScreenShare = () => run(async () => {
    const local = lkRoomRef.current?.localParticipant;
    if (!local) return;
    const sharing = screenOwnerId === userId;
    if (!sharing && screenOwnerId) {
      throw new Error(`${peopleById.get(screenOwnerId)?.name || 'Someone'} is already presenting.`);
    }
    try {
      await local.setScreenShareEnabled(!sharing, { audio: false });
    } catch (e) {
      // Closing the browser's picker is not an error.
      if (e?.name !== 'NotAllowedError') throw e;
    }
  });

  const moderate = (targetId, action) => run(async () => {
    await moderateLiveParticipant(roomId, targetId, action);
    if (action === 'remove') setSelectedUserId(null);
  });

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
        Live sessions currently work in the web version of NESBA. Open NESBA in your browser to join this session.
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

  if (status === 'removed') {
    return (
      <Centered title={title} icon="remove-circle-outline" action={{ label: 'Back to events', onPress: () => router.replace('/live') }}>
        The host removed you from this session.
      </Centered>
    );
  }

  const presenterName = screenOwnerId ? (screenOwnerId === userId ? 'You are' : `${peopleById.get(screenOwnerId)?.name || 'Someone'} is`) : null;

  const sidePanel = (
    <View style={[styles.panel, wide ? styles.panelWide : styles.panelNarrow]}>
      <View style={styles.tabs}>
        {[['people', `People (${people.length})`], ['chat', 'Chat']].map(([key, label]) => (
          <Pressable key={key} style={[styles.tab, panel === key && styles.tabActive]} onPress={() => setPanel(key)}>
            <Text style={[styles.tabText, panel === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {panel === 'chat' ? (
        <LiveChat roomId={roomId} currentUserId={userId} isHost={isHost} people={peopleById} disabled={status !== 'connected'} />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              isMe={item.user_id === userId}
              speaking={speakingIds.has(item.user_id)}
              isHost={isHost}
              working={working}
              onModerate={moderate}
            />
          )}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />

      <View style={styles.banner}>
        <View style={styles.liveTag}><Text style={styles.liveText}>LIVE</Text></View>
        <Text style={styles.bannerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.bannerText}>
          {status === 'connecting' ? 'Connecting…' : `${people.length} in the room`}
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

      <View style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.stage, !wide && styles.stageNarrow]}>
          <Suspense fallback={<View style={[styles.center, { flex: 1 }]}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>Opening the lecture hall…</Text></View>}>
            <LectureHall3D
              participants={people}
              speakingIds={speakingIds}
              screenTrack={screenTrack}
              title={title}
              currentUserId={userId}
              onSelect={(id) => setSelectedUserId(id)}
            />
          </Suspense>

          {!!presenterName && (
            <Pressable style={styles.presentingChip} onPress={() => setPresentationOpen(true)}>
              <Ionicons name="easel-outline" size={15} color="#fff" />
              <Text style={styles.presentingText}>{presenterName} presenting · View full screen</Text>
            </Pressable>
          )}

          {!!selected && (
            <View style={styles.popover}>
              <PersonRow
                person={selected}
                isMe={selected.user_id === userId}
                speaking={speakingIds.has(selected.user_id)}
                isHost={isHost}
                working={working}
                onModerate={moderate}
              />
              <Pressable onPress={() => setSelectedUserId(null)} style={styles.popoverClose} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
        </View>

        {sidePanel}
      </View>

      <View style={styles.controls}>
        {canPublish ? (
          <ControlButton disabled={working || status !== 'connected'} active={micOn} icon={micOn ? 'mic' : 'mic-off'} label={micOn ? 'Mute' : 'Unmute'} onPress={toggleMic} />
        ) : (
          <ControlButton disabled={working} active={me?.hand_raised} emoji="✋" label={me?.hand_raised ? 'Lower hand' : 'Raise hand'} onPress={toggleHand} />
        )}

        {canPublish && (
          <ControlButton
            disabled={working || status !== 'connected'}
            active={screenOwnerId === userId}
            icon="easel-outline"
            label={screenOwnerId === userId ? 'Stop sharing' : 'Share screen'}
            onPress={toggleScreenShare}
          />
        )}

        {isHost ? (
          <ControlButton disabled={working} danger icon="stop-circle" label="End session" onPress={endSession} />
        ) : (
          <ControlButton danger icon="exit-outline" label="Leave" onPress={leave} />
        )}
      </View>

      {presentationOpen && !!screenTrack && (
        <View style={styles.presentationOverlay}>
          <PresentationVideo track={screenTrack} />
          <Pressable style={styles.presentationClose} onPress={() => setPresentationOpen(false)}>
            <Ionicons name="contract-outline" size={18} color="#fff" />
            <Text style={styles.presentingText}>Back to the hall</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PresentationVideo({ track }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    video.srcObject = new MediaStream([track]);
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [track]);

  // react-native-web renders plain DOM elements.
  return <video ref={ref} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />;
}

function PersonRow({ person, isMe, speaking, isHost, working, onModerate }) {
  const role = person.role === 'host' ? 'Host' : person.role === 'speaker' ? 'Speaker' : 'Listener';
  return (
    <View style={styles.person}>
      <View style={[styles.avatar, person.role !== 'listener' && styles.avatarStage, speaking && styles.avatarSpeaking]}>
        <Text style={styles.avatarText}>{person.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{person.name}{isMe ? ' (you)' : ''}</Text>
        <Text style={styles.role}>
          {role}
          {person.role !== 'listener' ? (person.is_muted ? ' · muted' : ' · mic on') : ''}
          {person.hand_raised ? ' · ✋ hand raised' : ''}
        </Text>
      </View>
      {isHost && !isMe && person.role !== 'host' && (
        <View style={styles.actions}>
          {person.role === 'listener' ? (
            <SmallButton disabled={working} label="Invite to speak" onPress={() => onModerate(person.user_id, 'speaker')} />
          ) : (
            <>
              {!person.is_muted && <SmallButton outline disabled={working} label="Mute" onPress={() => onModerate(person.user_id, 'mute')} />}
              <SmallButton outline disabled={working} label="To audience" onPress={() => onModerate(person.user_id, 'listener')} />
            </>
          )}
          <SmallButton danger disabled={working} label="Remove" onPress={() => onModerate(person.user_id, 'remove')} />
        </View>
      )}
    </View>
  );
}

function SmallButton({ label, onPress, disabled, outline, danger }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.smallButton, outline && styles.smallButtonOutline, danger && styles.smallButtonDanger, disabled && { opacity: 0.6 }]}
    >
      <Text style={[styles.smallButtonText, outline && styles.smallButtonOutlineText]}>{label}</Text>
    </Pressable>
  );
}

function ControlButton({ icon, emoji, label, onPress, disabled, active, danger }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.control, active && styles.controlActive, danger && styles.controlDanger, disabled && { opacity: 0.6 }]}>
      {emoji ? <Text style={styles.controlEmoji}>{emoji}</Text> : <Ionicons name={icon} size={20} color="#fff" />}
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  bannerTitle: { ...typography.body, fontWeight: '700', flexShrink: 1 },
  bannerText: { ...typography.caption, marginLeft: 'auto' },
  liveTag: { backgroundColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  reconnect: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  audioTap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  audioTapText: { color: '#fff', fontWeight: '700' },
  main: { flex: 1, gap: spacing.md },
  mainWide: { flexDirection: 'row' },
  stage: { flex: 1, minHeight: 320, position: 'relative' },
  stageNarrow: { flex: 0, height: 380 },
  presentingChip: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(108,92,231,0.92)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  presentingText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  popover: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(24,28,46,0.97)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingRight: 28 },
  popoverClose: { position: 'absolute', top: 10, right: 10 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm },
  panelWide: { width: 360 },
  panelNarrow: { flex: 1, minHeight: 260 },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarStage: { borderWidth: 2, borderColor: colors.primaryLight },
  avatarSpeaking: { borderColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.8, shadowRadius: 8 },
  avatarText: { color: colors.text, fontWeight: '700' },
  name: { ...typography.body, fontWeight: '700', fontSize: 14 },
  role: { ...typography.caption, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%', paddingLeft: 46 },
  smallButton: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  smallButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  smallButtonOutline: { backgroundColor: 'transparent', borderColor: colors.primaryLight, borderWidth: 1 },
  smallButtonOutlineText: { color: colors.primaryLight },
  smallButtonDanger: { backgroundColor: colors.danger },
  controls: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md },
  control: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingVertical: 12 },
  controlActive: { backgroundColor: colors.primary },
  controlDanger: { backgroundColor: colors.danger },
  controlText: { color: '#fff', fontWeight: '700' },
  controlEmoji: { fontSize: 16 },
  presentationOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', padding: spacing.md },
  presentationClose: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,18,32,0.85)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
});
