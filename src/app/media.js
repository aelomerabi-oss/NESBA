import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../constants/theme';
import { getMediaLibrary } from '../lib/nesba';
import { openStoredFile } from '../lib/storage-url';

export default function MediaScreen() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { setItems(await getMediaLibrary()); } catch (e) { Alert.alert('Could not load media', e.message); } finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary}/></View>;
  return <FlatList style={styles.container} contentContainerStyle={items.length ? styles.content : styles.empty} data={items} keyExtractor={x=>x.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={colors.primary}/>} ListHeaderComponent={<><Text style={styles.title}>Media Library</Text><Text style={styles.muted}>Recorded lessons and NESBA podcasts.</Text></>} ListEmptyComponent={<Text style={styles.muted}>No published recordings yet.</Text>} renderItem={({item})=><Pressable style={styles.card} onPress={()=>openStoredFile(item.media_url)}><View style={styles.icon}><Ionicons name={item.media_type==='podcast_episode'?'headset':'play'} size={23} color={colors.primaryLight}/></View><View style={{flex:1}}><Text style={styles.name}>{item.title}</Text><Text style={styles.type}>{item.media_type.replace('_',' ')}</Text>{!!item.description&&<Text style={styles.description} numberOfLines={2}>{item.description}</Text>}</View></Pressable>}/>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},center:{alignItems:'center',justifyContent:'center'},content:{padding:spacing.md,paddingBottom:spacing.xl},empty:{padding:spacing.md,flexGrow:1,justifyContent:'center'},title:{...typography.h1,fontSize:24},muted:{...typography.body,color:colors.textMuted,marginTop:4,marginBottom:spacing.md},card:{flexDirection:'row',gap:spacing.sm,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},icon:{width:48,height:48,backgroundColor:colors.surfaceAlt,borderRadius:radius.sm,alignItems:'center',justifyContent:'center'},name:{...typography.body,fontWeight:'700'},type:{...typography.caption,color:colors.accent,textTransform:'capitalize',marginTop:2},description:{...typography.caption,marginTop:5,lineHeight:18}});
