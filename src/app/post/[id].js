import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getPost, getPostComments, createPostComment, togglePostLike } from '../../lib/nesba';

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [post,setPost]=useState(null);
  const [comments,setComments]=useState([]);
  const [comment,setComment]=useState('');
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);

  const load=useCallback(async()=>{
    try {
      const [p,c]=await Promise.all([getPost(id,session?.user?.id),getPostComments(id)]);
      setPost(p); setComments(c);
    } catch(e) { Alert.alert('Could not load post',e.message); }
    finally { setLoading(false); }
  },[id,session]);
  useEffect(()=>{load();},[load]);

  const like=async()=>{
    if(!session) return router.push('/login');
    try { await togglePostLike(id,session.user.id); setPost(await getPost(id,session.user.id)); }
    catch(e){Alert.alert('Could not update like',e.message);}
  };

  const addComment=async()=>{
    if(!session) return router.push('/login');
    if(!comment.trim()) return;
    try { setSending(true); await createPostComment(id,comment,session.user.id); setComment(''); setComments(await getPostComments(id)); }
    catch(e){Alert.alert('Could not comment',e.message);}
    finally{setSending(false);}
  };

  if(loading) return <View style={styles.center}><ActivityIndicator color={colors.primary}/></View>;
  if(!post) return <View style={styles.center}><Text style={styles.title}>Post not found</Text></View>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={23} color={colors.text}/></Pressable><Text style={styles.title}>Post</Text><Pressable onPress={()=>Share.share({message:post.content})}><Ionicons name="share-outline" size={22} color={colors.text}/></Pressable></View>
    <View style={styles.card}>
      <Pressable style={styles.authorRow} onPress={() => post.author_id && router.push({ pathname: '/profile/[id]', params: { id: String(post.author_id) } })}><View style={styles.avatar}><Text style={styles.avatarText}>{(post.author_name||'N').charAt(0).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={styles.author}>{post.author_name||'NESBA Member'}</Text><Text style={styles.muted}>{new Date(post.created_at).toLocaleString()}</Text></View>{post.organizations?.verification_status==='verified'&&<Ionicons name="checkmark-circle" size={18} color={colors.primaryLight}/>}</Pressable>
      <Text style={styles.body}>{post.content}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={like}><Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?colors.danger:colors.textMuted}/><Text style={styles.actionText}>{post.likes} Likes</Text></Pressable>
        <View style={styles.action}><Ionicons name="chatbubble-outline" size={19} color={colors.textMuted}/><Text style={styles.actionText}>{comments.length} Comments</Text></View>
      </View>
    </View>

    <Text style={styles.section}>Comments</Text>
    {comments.length===0?<Text style={styles.muted}>Be the first to comment.</Text>:comments.map(c=><View key={c.id} style={styles.comment}><View style={styles.smallAvatar}><Text style={styles.avatarText}>{(c.author_name||'N').charAt(0).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={styles.author}>{c.author_name}</Text><Text style={styles.commentText}>{c.content}</Text><Text style={styles.muted}>{new Date(c.created_at).toLocaleString()}</Text></View></View>)}

    {session&&<View style={styles.composer}><TextInput value={comment} onChangeText={setComment} placeholder="Write a thoughtful comment..." placeholderTextColor={colors.textMuted} style={styles.input} multiline/><Pressable style={styles.primary} onPress={addComment} disabled={sending}>{sending?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Comment</Text>}</Pressable></View>}
  </ScrollView>;
}
const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:spacing.xl},center:{flex:1,backgroundColor:colors.background,alignItems:'center',justifyContent:'center'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:spacing.md},title:{...typography.h2},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md},authorRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},avatar:{width:44,height:44,borderRadius:22,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},smallAvatar:{width:34,height:34,borderRadius:17,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontWeight:'800'},author:{...typography.body,fontWeight:'700'},muted:{...typography.caption,color:colors.textMuted,marginTop:3},body:{...typography.body,lineHeight:24,marginTop:spacing.md},actions:{flexDirection:'row',gap:spacing.lg,borderTopWidth:1,borderTopColor:colors.border,marginTop:spacing.md,paddingTop:spacing.md},action:{flexDirection:'row',alignItems:'center',gap:6},actionText:{color:colors.textMuted,fontSize:12},section:{...typography.h2,marginTop:spacing.lg,marginBottom:spacing.sm},comment:{flexDirection:'row',gap:spacing.sm,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,marginBottom:spacing.sm},commentText:{...typography.body,lineHeight:20,marginTop:3},composer:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,marginTop:spacing.md},input:{color:colors.text,minHeight:60,textAlignVertical:'top'},primary:{backgroundColor:colors.primary,borderRadius:radius.pill,paddingHorizontal:18,paddingVertical:9,alignSelf:'flex-end',minWidth:75,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'700'}
});
