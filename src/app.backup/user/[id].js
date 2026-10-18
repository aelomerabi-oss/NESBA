import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getPublicProfile, getPublicProfilePosts, getPublicProfileCourses, toggleFollow } from '../../lib/nesba';
import CourseCard from '../../components/CourseCard';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[courses,setCourses]=useState([]);
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    try{
      const [p,ps,cs]=await Promise.all([
        getPublicProfile(id,session?.user?.id),
        getPublicProfilePosts(id),
        getPublicProfileCourses(id)
      ]);
      setProfile(p);setPosts(ps);setCourses(cs);
    }catch(e){Alert.alert('Could not load profile',e.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[id,session?.user?.id]);

  useEffect(()=>{load();},[load]);

  const follow=async()=>{
    if(!session) return router.push('/login');
    if(session.user.id===id) return;
    try{
      const now=await toggleFollow({followerId:session.user.id,followingUserId:id});
      setProfile(p=>({...p,isFollowing:now,stats:{...p.stats,followers:Math.max(0,p.stats.followers+(now?1:-1))}}));
    }catch(e){Alert.alert('Could not update follow',e.message);}
  };

  if(loading)return <View style={styles.center}><ActivityIndicator color={colors.primary}/></View>;
  if(!profile)return <View style={styles.center}><Text style={styles.muted}>Profile not found.</Text></View>;

  const initials=(profile.full_name||'NESBA Member').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={colors.primary}/>}>
    <Pressable style={styles.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={22} color={colors.text}/><Text style={styles.backText}>Back</Text></Pressable>
    <View style={styles.hero}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <Text style={styles.title}>{profile.full_name||'NESBA Member'}</Text>
      <Text style={styles.role}>{profile.role==='teacher'?'Teacher / Mentor':profile.role==='organization'?'Organization':'NESBA Member'}</Text>
      {!!profile.bio&&<Text style={styles.bio}>{profile.bio}</Text>}
      <View style={styles.stats}>
        <Stat n={profile.stats.followers} label="Followers"/><Stat n={profile.stats.following} label="Following"/><Stat n={profile.stats.courses} label="Courses"/><Stat n={profile.stats.posts} label="Posts"/>
      </View>
      {session?.user?.id!==id&&<View style={styles.profileActions}><Pressable style={[styles.follow,profile.isFollowing&&styles.following]} onPress={follow}><Text style={[styles.followText,profile.isFollowing&&styles.followingText]}>{profile.isFollowing?'Following':'Follow'}</Text></Pressable><Pressable style={styles.message} onPress={()=>session ? router.push(`/messages/${id}`) : router.push('/login')}><Text style={styles.messageText}>Message</Text></Pressable></View>}
    </View>

    <Text style={styles.section}>Courses</Text>
    {courses.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}>{courses.map(c=><CourseCard key={c.id} course={c}/>)}</ScrollView>:<Text style={styles.muted}>No published courses yet.</Text>}

    <Text style={styles.section}>Posts</Text>
    {posts.length?posts.map(p=><Pressable key={p.id} style={styles.post} onPress={()=>router.push(`/post/${p.id}`)}><Text style={styles.date}>{new Date(p.created_at).toLocaleDateString()}</Text><Text style={styles.postText}>{p.content}</Text><Text style={styles.open}>Open post →</Text></Pressable>):<Text style={styles.muted}>No public posts yet.</Text>}
  </ScrollView>;
}
function Stat({n,label}){return <View style={styles.stat}><Text style={styles.statN}>{n}</Text><Text style={styles.statL}>{label}</Text></View>}
const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:spacing.xl},center:{flex:1,backgroundColor:colors.background,justifyContent:'center',alignItems:'center'},back:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:spacing.md},backText:{color:colors.textMuted},hero:{alignItems:'center'},avatar:{width:92,height:92,borderRadius:46,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontSize:28,fontWeight:'800'},title:{...typography.h1,fontSize:25,textAlign:'center',marginTop:spacing.md},role:{color:colors.primaryLight,fontWeight:'700',marginTop:4},bio:{...typography.body,textAlign:'center',lineHeight:22,color:colors.textMuted,marginTop:spacing.sm,maxWidth:500},stats:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:spacing.xs,marginTop:spacing.md},stat:{minWidth:75,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,alignItems:'center'},statN:{fontWeight:'800',fontSize:17,color:colors.primaryLight},statL:{fontSize:10,color:colors.textMuted},profileActions:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.md},follow:{backgroundColor:colors.primary,paddingHorizontal:24,paddingVertical:10,borderRadius:radius.pill},following:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.primary},followText:{color:'#fff',fontWeight:'700'},followingText:{color:colors.primary},message:{backgroundColor:colors.surface,borderColor:colors.primary,borderWidth:1,paddingHorizontal:24,paddingVertical:10,borderRadius:radius.pill},messageText:{color:colors.primaryLight,fontWeight:'700'},section:{...typography.h2,marginTop:spacing.lg,marginBottom:spacing.sm},muted:{...typography.body,color:colors.textMuted,lineHeight:21},post:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},date:{...typography.caption,color:colors.textMuted},postText:{...typography.body,lineHeight:22,marginTop:spacing.xs},open:{color:colors.primaryLight,fontWeight:'700',marginTop:spacing.sm}
});
