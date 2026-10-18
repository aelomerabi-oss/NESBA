import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { getEvents, getMyEventRegistrations, toggleEventRegistration, startLiveRoom } from '../../lib/nesba';
import { useAuth } from '../../context/AuthContext';

export default function LiveScreen() {
  const { session, user } = useAuth();
  const userId = session?.user?.id;
  const [events, setEvents] = useState([]);
  const [registered, setRegistered] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [rows, registrations] = await Promise.all([getEvents(), getMyEventRegistrations(userId)]);
      setEvents(rows);
      setRegistered(registrations);
    } catch (error) { Alert.alert('Could not load events', error.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const register = async (event) => {
    if (!userId) return router.push('/login');
    try {
      const isRegistered = await toggleEventRegistration(event.id, userId);
      setRegistered((current) => {
        const next = new Set(current);
        if (isRegistered) next.add(event.id); else next.delete(event.id);
        return next;
      });
    } catch (error) { Alert.alert('Could not update registration', error.message); }
  };

  const goLive = async (event) => {
    try {
      setBusyId(event.id);
      const room = await startLiveRoom(event.id);
      router.push(`/live/${room.id}`);
      load();
    } catch (error) { Alert.alert('Could not go live', error.message); }
    finally { setBusyId(null); }
  };

  const join = async (event) => {
    if (!userId) return router.push('/login');
    if (event.liveRoom) return router.push(`/live/${event.liveRoom.id}`);
    if (!registered.has(event.id)) return Alert.alert('Registration required', 'Register before joining this session.');
    if (!event.meeting_url) return Alert.alert('Not live yet', 'The host has not started this session.');
    const supported = await Linking.canOpenURL(event.meeting_url);
    if (supported) Linking.openURL(event.meeting_url);
    else Alert.alert('Invalid meeting link', 'This event does not have a valid meeting link.');
  };

  const renderEvent = ({ item }) => {
    const startsAt = new Date(item.starts_at);
    const isLive = item.status === 'live';
    const isHost = !!userId && item.host_id === userId;
    const isRegistered = registered.has(item.id);
    const hostName = item.organizations?.name || item.host?.full_name || 'NESBA Creator';
    return <View style={styles.card}>
      <View style={[styles.iconWrap, isLive && styles.iconWrapLive]}><Ionicons name={item.event_type === 'workshop' ? 'construct' : item.liveRoom ? 'mic' : 'videocam'} size={22} color={isLive ? colors.accent : colors.primaryLight} /></View>
      <View style={styles.cardContent}>
        <View style={styles.titleRow}><Text style={styles.eventTitle}>{item.title}</Text>{isLive && <View style={styles.liveTag}><Text style={styles.liveText}>LIVE</Text></View>}</View>
        <Text style={styles.meta}>{startsAt.toLocaleString()} · {hostName}</Text>
        {!!item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.actions}>
          {isHost ? (
            item.liveRoom
              ? <Pressable style={styles.joinButton} onPress={() => router.push(`/live/${item.liveRoom.id}`)}><Text style={styles.joinText}>Open room</Text></Pressable>
              : <Pressable style={styles.registerButton} disabled={busyId === item.id} onPress={() => goLive(item)}><Text style={styles.registerText}>{busyId === item.id ? 'Starting…' : 'Go live'}</Text></Pressable>
          ) : <>
            <Pressable style={[styles.registerButton, isRegistered && styles.registeredButton]} onPress={() => register(item)}><Text style={styles.registerText}>{isRegistered ? 'Registered' : 'Register'}</Text></Pressable>
            {(isLive || isRegistered) && <Pressable style={styles.joinButton} onPress={() => join(item)}><Text style={styles.joinText}>{item.liveRoom ? 'Join live room' : 'Join'}</Text></Pressable>}
          </>}
        </View>
      </View>
    </View>;
  };

  return <View style={styles.container}>
    <View style={styles.headerRow}><View><Text style={styles.header}>Live & Events</Text><Text style={styles.subheader}>Learn together in real time.</Text></View>{['teacher', 'mentor', 'organization', 'admin'].includes(user.role) && <Pressable style={styles.createButton} onPress={() => router.push('/creator/events')}><Ionicons name="add" size={18} color="#fff" /></Pressable>}</View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : <FlatList data={events} keyExtractor={(item) => item.id} renderItem={renderEvent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />} contentContainerStyle={events.length ? styles.list : styles.empty} ListEmptyComponent={<View><Ionicons name="calendar-outline" size={42} color={colors.textMuted} style={{ alignSelf: 'center' }} /><Text style={styles.emptyTitle}>No events scheduled</Text><Text style={styles.emptyText}>Check back soon for live classes, workshops, and webinars.</Text></View>} />}
  </View>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background,paddingHorizontal:spacing.md},center:{flex:1,alignItems:'center',justifyContent:'center'},headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:spacing.lg,paddingBottom:spacing.md},header:{...typography.h1,fontSize:22},subheader:{...typography.caption,marginTop:3},createButton:{width:38,height:38,borderRadius:19,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},list:{paddingBottom:spacing.xl},card:{flexDirection:'row',gap:spacing.sm,backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},iconWrap:{width:44,height:44,borderRadius:radius.sm,backgroundColor:colors.surfaceAlt,alignItems:'center',justifyContent:'center'},iconWrapLive:{borderWidth:1,borderColor:colors.accent},cardContent:{flex:1},titleRow:{flexDirection:'row',alignItems:'center',gap:spacing.xs,flexWrap:'wrap'},eventTitle:{...typography.body,fontWeight:'700',flexShrink:1},meta:{...typography.caption,marginTop:3},description:{...typography.caption,color:colors.textMuted,marginTop:spacing.xs,lineHeight:18},liveTag:{backgroundColor:colors.danger,borderRadius:radius.pill,paddingHorizontal:7,paddingVertical:2},liveText:{color:'#fff',fontSize:10,fontWeight:'800'},actions:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.sm},registerButton:{backgroundColor:colors.primary,borderRadius:radius.pill,paddingHorizontal:13,paddingVertical:8},registeredButton:{backgroundColor:colors.success},registerText:{color:'#fff',fontSize:12,fontWeight:'700'},joinButton:{borderColor:colors.primaryLight,borderWidth:1,borderRadius:radius.pill,paddingHorizontal:13,paddingVertical:8},joinText:{color:colors.primaryLight,fontSize:12,fontWeight:'700'},empty:{flexGrow:1,justifyContent:'center',paddingHorizontal:spacing.xl},emptyTitle:{...typography.h2,textAlign:'center',fontSize:18,marginTop:spacing.sm},emptyText:{...typography.body,color:colors.textMuted,textAlign:'center',lineHeight:21,marginTop:spacing.xs}
});
