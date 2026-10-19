import { Redirect, useLocalSearchParams } from 'expo-router';
import { Room, RoomEvent } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// A developer test page: not reachable in production builds.
export default function LiveTestRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <LiveTestScreen />;
}

function LiveTestScreen() {
  const { session, profile } = useAuth();

  const participantDisplayName =
    profile?.full_name?.trim() ||
    session?.user?.email ||
    'NESBA User';

  const { roomName: routeRoomName } =
    useLocalSearchParams();

  const roomName =
    typeof routeRoomName === 'string' &&
    routeRoomName.trim()
      ? routeRoomName.trim()
      : 'nesba-live-test';

  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [loading, setLoading] = useState(false);

  const [liveParticipants, setLiveParticipants] =
    useState([]);

  const [debugMessage, setDebugMessage] =
    useState('Checking live room...');

  const roomRef = useRef(null);

  const remoteAudioElementsRef =
    useRef([]);

  const loadLiveParticipants = async () => {
    try {
      console.log(
        'Checking live participants:',
        roomName
      );

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          'livekit-participants',
          {
            body: {
              roomName,
            },
          }
        );

      console.log(
        'Live participant response:',
        data
      );

      if (error) {
        console.error(
          'Live participant error:',
          error
        );

        setDebugMessage(
          `Could not check live room: ${
            error.message ||
            'Unknown error'
          }`
        );

        return;
      }

      const participants =
        Array.isArray(
          data?.participants
        )
          ? data.participants
          : [];

      setLiveParticipants(
        participants
      );

      if (participants.length > 0) {
        setDebugMessage(
          `${participants.length} ${
            participants.length === 1
              ? 'person'
              : 'people'
          } currently in the room.`
        );
      } else {
        setDebugMessage(
          'Nobody is currently in the room.'
        );
      }
    } catch (error) {
      console.error(
        'Live participant loading error:',
        error
      );

      setDebugMessage(
        error?.message ||
          'Could not check live room.'
      );
    }
  };

  useEffect(() => {
    loadLiveParticipants();

    const interval =
      setInterval(
        loadLiveParticipants,
        5000
      );

    return () =>
      clearInterval(interval);
  }, [roomName]);

  const updateParticipantCount = (
    liveRoom
  ) => {
    if (!liveRoom) {
      return;
    }

    setLiveParticipants(
      Array.from(
        liveRoom.remoteParticipants.values()
      ).map(
        (participant) => ({
          identity:
            participant.identity,
          name:
            participant.name ||
            participant.identity,
        })
      )
    );
  };

  const attachRemoteAudio = (
    track,
    publication,
    participant
  ) => {
    console.log(
      'REMOTE TRACK SUBSCRIBED:',
      {
        trackKind: track.kind,
        participant:
          participant.identity,
        publication:
          publication.trackSid,
      }
    );

    setDebugMessage(
      `Audio connected from ${
        participant.name ||
        participant.identity
      }`
    );

    if (
      typeof document !== 'undefined' &&
      typeof track.attach === 'function'
    ) {
      try {
        const audioElement =
          track.attach();

        audioElement.autoplay = true;
        audioElement.controls = false;
        audioElement.style.display =
          'none';

        document.body.appendChild(
          audioElement
        );

        remoteAudioElementsRef.current.push(
          audioElement
        );

        console.log(
          'REMOTE AUDIO ATTACHED'
        );
      } catch (error) {
        console.error(
          'Could not attach remote audio:',
          error
        );
      }
    }
  };

  const detachRemoteAudio = (
    track
  ) => {
    console.log(
      'REMOTE TRACK UNSUBSCRIBED'
    );

    if (
      typeof track.detach ===
      'function'
    ) {
      try {
        const elements =
          track.detach();

        if (elements) {
          elements.forEach(
            (element) => {
              if (
                element?.parentNode
              ) {
                element.parentNode.removeChild(
                  element
                );
              }
            }
          );
        }
      } catch (error) {
        console.error(
          'Could not detach remote audio:',
          error
        );
      }
    }
  };

  const cleanupRemoteAudio =
    () => {
      remoteAudioElementsRef.current.forEach(
        (element) => {
          try {
            if (
              element?.parentNode
            ) {
              element.parentNode.removeChild(
                element
              );
            }
          } catch {
            // Ignore cleanup errors.
          }
        }
      );

      remoteAudioElementsRef.current =
        [];
    };

  const connect = async () => {
    console.log(
      'JOIN BUTTON PRESSED'
    );

    setDebugMessage(
      'Joining live room...'
    );

    if (!session) {
      console.log(
        'NO SUPABASE SESSION'
      );

      Alert.alert(
        'Login required',
        'Please log in first.'
      );

      setDebugMessage(
        'No login session found.'
      );

      return;
    }

    if (loading) {
      return;
    }

    if (connected) {
      return;
    }

    try {
      setLoading(true);

      console.log(
        'Joining LiveKit as:',
        participantDisplayName
      );

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          'livekit-token',
          {
            body: {
              roomName,
              participantName:
                participantDisplayName,
            },
          }
        );

      console.log(
        'TOKEN RESPONSE:',
        data
      );

      if (error) {
        throw error;
      }

      if (!data?.token) {
        throw new Error(
          'LiveKit token was not returned.'
        );
      }

      if (!data?.url) {
        throw new Error(
          'LiveKit URL was not returned.'
        );
      }

      const newRoom =
        new Room();

      roomRef.current =
        newRoom;

      newRoom.on(
        RoomEvent.ParticipantConnected,
        (participant) => {
          console.log(
            'PARTICIPANT JOINED:',
            participant.identity,
            participant.name
          );

          updateParticipantCount(
            newRoom
          );

          setDebugMessage(
            `${
              participant.name ||
              participant.identity
            } joined the room.`
          );
        }
      );

      newRoom.on(
        RoomEvent.ParticipantDisconnected,
        (participant) => {
          console.log(
            'PARTICIPANT LEFT:',
            participant.identity,
            participant.name
          );

          updateParticipantCount(
            newRoom
          );

          setDebugMessage(
            `${
              participant.name ||
              participant.identity
            } left the room.`
          );
        }
      );

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (
          track,
          publication,
          participant
        ) => {
          console.log(
            'TRACK SUBSCRIBED:',
            track.kind
          );

          if (
            track.kind === 'audio'
          ) {
            attachRemoteAudio(
              track,
              publication,
              participant
            );
          }
        }
      );

      newRoom.on(
        RoomEvent.TrackUnsubscribed,
        (
          track
        ) => {
          console.log(
            'TRACK UNSUBSCRIBED:',
            track.kind
          );

          if (
            track.kind === 'audio'
          ) {
            detachRemoteAudio(
              track
            );
          }
        }
      );

      newRoom.on(
        RoomEvent.Disconnected,
        (reason) => {
          console.log(
            'DISCONNECTED:',
            reason
          );

          setConnected(false);
          setMicOn(false);
          setRoom(null);

          cleanupRemoteAudio();

          if (
            roomRef.current ===
            newRoom
          ) {
            roomRef.current =
              null;
          }

          setDebugMessage(
            'Disconnected from room.'
          );

          loadLiveParticipants();
        }
      );

      newRoom.on(
        RoomEvent.Reconnecting,
        () => {
          console.log(
            'RECONNECTING...'
          );

          setDebugMessage(
            'Reconnecting...'
          );
        }
      );

      newRoom.on(
        RoomEvent.Reconnected,
        () => {
          console.log(
            'RECONNECTED'
          );

          updateParticipantCount(
            newRoom
          );

          setDebugMessage(
            'Connection restored.'
          );
        }
      );

      await newRoom.connect(
        data.url,
        data.token
      );

      console.log(
        'SUCCESSFULLY CONNECTED:',
        roomName
      );

      console.log(
        'MY LIVEKIT NAME:',
        participantDisplayName
      );

      setRoom(newRoom);
      setConnected(true);

      updateParticipantCount(
        newRoom
      );

      setDebugMessage(
        'Connected successfully.'
      );

      newRoom.remoteParticipants.forEach(
        (participant) => {
          participant.trackPublications.forEach(
            (publication) => {
              if (
                publication.isSubscribed &&
                publication.track
              ) {
                if (
                  publication.track
                    .kind === 'audio'
                ) {
                  attachRemoteAudio(
                    publication.track,
                    publication,
                    participant
                  );
                }
              }
            }
          );
        }
      );
    } catch (error) {
      console.error(
        'LIVEKIT CONNECTION ERROR:',
        error
      );

      const message =
        error?.message ||
        'Could not connect to the live room.';

      setDebugMessage(
        `Connection error: ${message}`
      );

      Alert.alert(
        'Connection error',
        message
      );

      cleanupRemoteAudio();

      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch {
          // Ignore cleanup errors.
        }
      }

      roomRef.current =
        null;

      setRoom(null);
      setConnected(false);

      await loadLiveParticipants();
    } finally {
      setLoading(false);
    }
  };

  const toggleMicrophone =
    async () => {
      if (!room) {
        return;
      }

      try {
        const enabled =
          !micOn;

        await room.localParticipant.setMicrophoneEnabled(
          enabled
        );

        setMicOn(enabled);

        setDebugMessage(
          enabled
            ? 'Microphone is ON. Other participants can hear you.'
            : 'Microphone is OFF.'
        );
      } catch (error) {
        console.error(
          'MICROPHONE ERROR:',
          error
        );

        Alert.alert(
          'Microphone error',
          error?.message ||
            'Could not access microphone.'
        );
      }
    };

  const disconnect = () => {
    console.log(
      'LEAVE ROOM PRESSED'
    );

    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (error) {
        console.error(
          'Disconnect error:',
          error
        );
      }
    }

    cleanupRemoteAudio();

    roomRef.current =
      null;

    setRoom(null);
    setConnected(false);
    setMicOn(false);

    setDebugMessage(
      'You left the room. Checking who remains...'
    );

    setTimeout(
      loadLiveParticipants,
      500
    );
  };

  useEffect(() => {
    return () => {
      console.log(
        'LIVE SCREEN UNMOUNTING'
      );

      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch {
          // Ignore cleanup errors.
        }
      }

      cleanupRemoteAudio();

      roomRef.current =
        null;
    };
  }, []);

  const hasLiveParticipants =
    liveParticipants.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        NESBA Live Audio
      </Text>

      <Text style={styles.subtitle}>
        Clubhouse-style live audio
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Room
        </Text>

        <Text style={styles.roomName}>
          {roomName}
        </Text>

        {hasLiveParticipants ? (
          <Text style={styles.liveStatus}>
            🔴 LIVE
          </Text>
        ) : (
          <Text style={styles.status}>
            ⚪ Not live
          </Text>
        )}

        <Text
          style={styles.participants}
        >
          {liveParticipants.length}{' '}
          {liveParticipants.length ===
          1
            ? 'person'
            : 'people'}{' '}
          in this room
        </Text>

        <View
          style={styles.peopleContainer}
        >
          {liveParticipants.map(
            (participant, index) => (
              <View
                key={
                  participant.identity ||
                  `${participant.name}-${index}`
                }
                style={styles.personRow}
              >
                <View
                  style={styles.avatar}
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {(
                      participant.name ||
                      participant.identity ||
                      'N'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.personName
                    }
                  >
                    {participant.name ||
                      participant.identity ||
                      'NESBA User'}
                  </Text>

                  <Text
                    style={
                      styles.personStatus
                    }
                  >
                    In the room
                  </Text>
                </View>

                <View
                  style={
                    styles.onlineDot
                  }
                />
              </View>
            )
          )}
        </View>

        <Text style={styles.debug}>
          {debugMessage}
        </Text>
      </View>

      {!connected ? (
        <Pressable
          style={[
            styles.primaryButton,
            loading &&
              styles.disabledButton,
          ]}
          onPress={connect}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator
                color="#fff"
              />

              <Text
                style={[
                  styles.buttonText,
                  styles.loadingText,
                ]}
              >
                Connecting...
              </Text>
            </>
          ) : (
            <Text
              style={styles.buttonText}
            >
              {hasLiveParticipants
                ? 'Join Live Room'
                : 'Start Live Room'}
            </Text>
          )}
        </Pressable>
      ) : (
        <>
          <Pressable
            style={[
              styles.micButton,
              micOn &&
                styles.micButtonActive,
            ]}
            onPress={
              toggleMicrophone
            }
          >
            <Text
              style={styles.buttonText}
            >
              {micOn
                ? '🎙️ Microphone ON'
                : '🔇 Microphone OFF'}
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.leaveButton
            }
            onPress={disconnect}
          >
            <Text
              style={styles.buttonText}
            >
              Leave Room
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      justifyContent:
        'center',
      backgroundColor:
        '#fff',
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 24,
    },

    card: {
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#ddd',
      marginBottom: 20,
    },

    label: {
      fontSize: 13,
      color: '#777',
      marginBottom: 4,
    },

    roomName: {
      fontSize: 18,
      fontWeight: '700',
    },

    status: {
      marginTop: 12,
      fontSize: 16,
    },

    liveStatus: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '800',
    },

    participants: {
      marginTop: 8,
      color: '#444',
      fontSize: 16,
      fontWeight: '600',
    },

    peopleContainer: {
      marginTop: 16,
    },

    personRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },

    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#111',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    avatarText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },

    personName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#222',
    },

    personStatus: {
      marginTop: 2,
      fontSize: 12,
      color: '#777',
    },

    onlineDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#16a34a',
    },

    debug: {
      marginTop: 14,
      color: '#777',
      fontSize: 13,
    },

    primaryButton: {
      backgroundColor: '#111',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },

    disabledButton: {
      opacity: 0.6,
    },

    loadingText: {
      marginTop: 6,
    },

    micButton: {
      backgroundColor: '#555',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    },

    micButtonActive: {
      backgroundColor:
        '#16a34a',
    },

    leaveButton: {
      backgroundColor:
        '#dc2626',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },

    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });