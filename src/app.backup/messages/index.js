import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getInbox } from '../../lib/nesba';

export default function MessagesScreen() {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (!session?.user?.id) { setLoading(false); return; } try { setMessages(await getInbox(session.user.id)); } finally { setLoading(false); setRefreshing(false); } }, [session?.user?.id]);
  useEffect(() => { load(); }, [load]);
  if (!session) return <View style={[styles.container, styles.center]}><Text style={styles.title}>Messages</Text><Text style={styles.muted}>Log in to message NESBA members.</Text></View>;
  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  return <FlatList style={styles.container} contentContainerStyle={messages.length ? styles.content : styles.empty} data={messages} keyExtractor={(item) => item.personId} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />} ListHeaderComponent={<Text style={styles.title}>Messages</Text>} ListEmptyComponent={<View><Ionicons name="chatbubbles-outline" size={42} color={colors.textMuted} style={{ alignSelf: 'center' }} /><Text style={styles.emptyTitle}>No conversations yet</Text><Text style={styles.emptyText}>Open a member profile to start a conversation.</Text></View>} renderItem={({ item }) => <Pressable style={styles.row} onPress={() => router.push(`/messages/${item.personId}`)}><View style={styles.avatar}><Text style={styles.avatarText}>{(item.person?.full_name || 'N').charAt(0).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{item.person?.full_name || 'NESBA Member'}</Text><Text style={styles.preview} numberOfLines={1}>{item.content}</Text></View><Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text></Pressable>} />;
}
const styles = StyleSheet.create({container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:spacing.xl},center:{justifyContent:'center',alignItems:'center',padding:spacing.lg},title:{...typography.h1,fontSize:24,marginBottom:spacing.md},muted:{...typography.body,color:colors.textMuted},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,marginBottom:spacing.sm},avatar:{width:44,height:44,borderRadius:22,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontWeight:'800',fontSize:17},name:{...typography.body,fontWeight:'700'},preview:{...typography.caption,marginTop:3},date:{...typography.caption,fontSize:11,alignSelf:'flex-start'},empty:{flexGrow:1,justifyContent:'center',padding:spacing.xl},emptyTitle:{...typography.h2,fontSize:18,textAlign:'center',marginTop:spacing.sm},emptyText:{...typography.body,color:colors.textMuted,textAlign:'center',marginTop:spacing.xs}});
