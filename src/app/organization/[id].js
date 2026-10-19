import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Switch, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { isFollowingOrganization, toggleFollow, setOrganizationFollowNotifications, getOrganizationPosts, getOrganizationStats, togglePostLike } from '../../lib/nesba';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import CourseCard from '../../components/CourseCard';
import { getCourses } from '../../lib/courses';

export default function OrganizationScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [org,setOrg]=useState(null), [courses,setCourses]=useState([]), [posts,setPosts]=useState([]);
  const [follow,setFollow]=useState(null), [stats,setStats]=useState({followers:0,courses:0,posts:0});
  const [loading,setLoading]=useState(true), [refreshing,setRefreshing]=useState(false), [liked,setLiked]=useState({});

  const load=useCallback(async()=>{
    try {
      const [{data,error}, allCourses, postData, statData]=await Promise.all([
        supabase.from('organizations').select('*').eq('id',id).single(),
        getCourses(), getOrganizationPosts(id), getOrganizationStats(id)
      ]);
      if(error) throw error;
      setOrg(data); setCourses(allCourses.filter(c=>c.organization_id===id)); setPosts(postData); setStats(statData);
      if(session?.user){
        setFollow(await isFollowingOrganization(session.user.id,id));
        // Start each heart from the user's real like, or tapping it would unlike.
        const postIds=postData.map(p=>p.id);
        if(postIds.length){
          const {data:likes}=await supabase.from('post_likes').select('post_id').eq('user_id',session.user.id).in('post_id',postIds);
          setLiked(Object.fromEntries((likes||[]).map(l=>[l.post_id,true])));
        }
      }
    } catch(e){Alert.alert('Could not load organization',e.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[id,session?.user?.id]);

  useEffect(()=>{load();},[load]);

  const onFollow=async()=>{
    if(!session) return router.push('/login');
    try{
      const now=await toggleFollow({followerId:session.user.id,followingOrganizationId:id});
      setFollow(now?{id:'new',notifications_enabled:true}:null);
      setStats(s=>({...s,followers:Math.max(0,s.followers+(now?1:-1))}));
    }catch(e){Alert.alert('Could not update follow',e.message);}
  };

  const onNotify=async(enabled)=>{
    if(!session||!follow||follow.id==='new') return;
    try{await setOrganizationFollowNotifications({followerId:session.user.id,organizationId:id,enabled});setFollow(f=>({...f,notifications_enabled:enabled}));}
    catch(e){Alert.alert('Could not update notifications',e.message);}
  };

  const like=async(post)=>{
    if(!session) return router.push('/login');
    const key=post.id, old=liked[key]||false;
    setLiked(v=>({...v,[key]:!old}));
    try{await togglePostLike(post.id,session.user.id);}catch(e){setLiked(v=>({...v,[key]:old}));}
  };

  if(loading) return <View style={[styles.container,styles.center]}><ActivityIndicator color={colors.primary}/></View>;
  if(!org) return <View style={styles.center}><Text style={styles.muted}>Organization not found.</Text></View>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={colors.primary}/>}>
    <Pressable style={styles.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={22} color={colors.text}/><Text style={styles.backText}>Organizations</Text></Pressable>

    <View style={styles.hero}>
      <View style={styles.logo}><Text style={styles.logoText}>{org.name?.charAt(0)?.toUpperCase()||'N'}</Text></View>
      <Text style={styles.title}>{org.name}</Text>
      <Text style={styles.muted}>{org.organization_type||'Educational Organization'}{org.verification_status==='verified'?' • ✓ Verified':' • Verification pending'}</Text>
      {!!org.location&&<Text style={styles.mutedSmall}>{org.location}</Text>}
      <View style={styles.stats}><Stat n={stats.followers} label="Followers"/><Stat n={stats.courses} label="Courses"/><Stat n={stats.posts} label="Posts"/></View>
      <Pressable style={[styles.follow,follow&&styles.following]} onPress={onFollow}><Text style={[styles.followText,follow&&styles.followingText]}>{follow?'Following':'Follow'}</Text></Pressable>
      {follow&&<View style={styles.notificationRow}><View style={{flex:1}}><Text style={styles.notificationTitle}>Notifications</Text><Text style={styles.mutedSmall}>New posts and organization updates</Text></View><Switch value={follow.notifications_enabled!==false} onValueChange={onNotify}/></View>}
    </View>

    <Text style={styles.section}>About</Text><Text style={styles.body}>{org.description||'This organization is building educational opportunities with NESBA.'}</Text>
    {!!org.website_url&&<Text style={styles.link}>{org.website_url}</Text>}

    <Text style={styles.section}>Courses</Text>
    {courses.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}>{courses.map(c=><CourseCard key={c.id} course={c}/>)}</ScrollView>:<Text style={styles.muted}>No published courses yet.</Text>}

    <Text style={styles.section}>Posts</Text>
    {posts.length?posts.map(post=><View key={post.id} style={styles.post}>
      <Text style={styles.author}>{post.author_name||org.name}</Text>
      <Text style={styles.date}>{new Date(post.created_at).toLocaleDateString()}</Text>
      <Text style={styles.postBody}>{post.content}</Text>
      <Pressable style={styles.like} onPress={()=>like(post)}><Ionicons name={liked[post.id]?'heart':'heart-outline'} size={19} color={liked[post.id]?colors.danger:colors.textMuted}/><Text style={styles.actionText}>Like</Text></Pressable>
    </View>):<Text style={styles.muted}>This organization has not published any posts yet.</Text>}
  </ScrollView>;
}

function Stat({n,label}){return <View style={styles.stat}><Text style={styles.statN}>{n}</Text><Text style={styles.statL}>{label}</Text></View>}

const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:spacing.xl},center:{flex:1,backgroundColor:colors.background,justifyContent:'center',alignItems:'center'},back:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:spacing.md},backText:{color:colors.textMuted},hero:{alignItems:'center',paddingBottom:spacing.md},logo:{width:84,height:84,borderRadius:22,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},logoText:{color:'#fff',fontSize:34,fontWeight:'800'},title:{...typography.h1,fontSize:25,textAlign:'center',marginTop:spacing.md},muted:{...typography.body,color:colors.textMuted,lineHeight:21,marginTop:4},mutedSmall:{...typography.caption,color:colors.textMuted,marginTop:3},stats:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.md},stat:{minWidth:90,alignItems:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm},statN:{fontSize:18,fontWeight:'800',color:colors.primaryLight},statL:{fontSize:11,color:colors.textMuted},follow:{backgroundColor:colors.primary,paddingHorizontal:30,paddingVertical:10,borderRadius:radius.pill,marginTop:spacing.md},following:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.primary},followText:{color:'#fff',fontWeight:'700'},followingText:{color:colors.primary},notificationRow:{width:'100%',flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,marginTop:spacing.md},notificationTitle:{...typography.body,fontWeight:'700'},section:{...typography.h2,marginTop:spacing.lg,marginBottom:spacing.sm},body:{...typography.body,lineHeight:22},link:{color:colors.primaryLight,marginTop:spacing.sm},post:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},author:{...typography.body,fontWeight:'700'},date:{...typography.caption,color:colors.textMuted,marginTop:2},postBody:{...typography.body,lineHeight:22,marginTop:spacing.sm},like:{flexDirection:'row',alignItems:'center',gap:5,marginTop:spacing.md},actionText:{color:colors.textMuted,fontSize:12}
});
