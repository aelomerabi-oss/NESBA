
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { colors, spacing, typography, radius } from '../constants/theme';
import { getOrganizations } from '../lib/nesba';

export default function OrganizationsScreen() {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{getOrganizations().then(setItems).catch(()=>{}).finally(()=>setLoading(false));},[]);
  if(loading) return <View style={[styles.container,styles.center]}><ActivityIndicator color={colors.primary}/></View>;
  return <FlatList style={styles.container} contentContainerStyle={styles.content} data={items} keyExtractor={x=>x.id}
    ListHeaderComponent={<><Text style={styles.title}>Organizations</Text><Text style={styles.muted}>Follow educational organizations and discover their courses, events and community content.</Text></>}
    renderItem={({item})=><Link href={`/organization/${item.id}`} asChild><Pressable style={styles.card}>
      <View style={styles.logo}><Text style={styles.logoText}>{item.name?.charAt(0)?.toUpperCase() || 'N'}</Text></View>
      <View style={{flex:1}}><Text style={styles.name}>{item.name}</Text><Text style={styles.mutedSmall}>{item.organization_type || 'Educational Organization'}{item.verification_status==='verified'?' • ✓ Verified':''}</Text><Text style={styles.desc} numberOfLines={2}>{item.description || 'NESBA organization'}</Text></View>
    </Pressable></Link>}
    ListEmptyComponent={<Text style={styles.muted}>No organizations have been published yet.</Text>}
  />;
}
const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:spacing.xl},center:{justifyContent:'center',alignItems:'center'},
 title:{...typography.h1,fontSize:24},muted:{...typography.body,color:colors.textMuted,lineHeight:21,marginTop:4,marginBottom:spacing.md},mutedSmall:{...typography.caption},
 card:{flexDirection:'row',gap:spacing.sm,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginTop:spacing.sm},
 logo:{width:48,height:48,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},logoText:{color:'#fff',fontSize:20,fontWeight:'800'},
 name:{...typography.body,fontWeight:'700'},desc:{...typography.caption,marginTop:4,lineHeight:18}
});
