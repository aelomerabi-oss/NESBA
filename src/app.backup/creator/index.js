import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getCategories, getMyOrganizations, createCourseWithModules, requestCreatorRole, getMyCreatorRequest, createOrganization, getMyCourses, updateCourse, getCreatorCourseAnalytics, createEvent, getMyEvents, createMediaItem } from '../../lib/nesba';

export default function CreatorStudioScreen() {
  const { user, session } = useAuth();
  const [request, setRequest] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [courseStats, setCourseStats] = useState({});
  const [myEvents, setMyEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDuration, setModuleDuration] = useState('10');
  const [modules, setModules] = useState([]);
  const [organizationId, setOrganizationId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgLocation, setOrgLocation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventEndsAt, setEventEndsAt] = useState('');
  const [eventUrl, setEventUrl] = useState('');
  const [eventType, setEventType] = useState('live_class');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('recording');

  const approved = ['teacher', 'mentor', 'organization', 'admin'].includes(user.role) && user.verificationStatus !== 'suspended';

  const load = async () => {
    if (!session?.user) return;
    const [req, cats, orgs, courses, events] = await Promise.all([
      getMyCreatorRequest(session.user.id).catch(() => null),
      getCategories().catch(() => []),
      getMyOrganizations(session.user.id).catch(() => []),
      getMyCourses(session.user.id).catch(() => []),
      getMyEvents(session.user.id).catch(() => []),
    ]);
    const statEntries = await Promise.all(courses.map(async (course) => [course.id, await getCreatorCourseAnalytics(course.id).catch(() => null)]));
    setRequest(req); setCategories(cats); setOrganizations(orgs); setMyCourses(courses); setMyEvents(events);
    setCourseStats(Object.fromEntries(statEntries.filter(([, stats]) => stats)));
    if (!organizationId && orgs[0]) setOrganizationId(orgs[0].id);
  };

  useEffect(() => { load(); }, [session]);

  const apply = async (role) => {
    try {
      setSaving(true);
      const result = await requestCreatorRole({
        requestedRole: role,
        organizationName: role === 'organization' ? orgName : null,
        reason: 'I want to contribute educational content to NESBA.',
      });
      setRequest(result);
      Alert.alert('Application submitted', 'NESBA will review your creator request.');
    } catch (e) { Alert.alert('Could not apply', e.message); }
    finally { setSaving(false); }
  };

  const createOrg = async () => {
    if (!orgName.trim()) return Alert.alert('Organization name required');
    try {
      setSaving(true);
      const org = await createOrganization({ name: orgName, description: orgDescription, organizationType: 'Educational Organization', website: orgWebsite, location: orgLocation });
      setOrganizations((prev) => [org, ...prev]);
      setOrganizationId(org.id);
      setOrgName(''); setOrgDescription(''); setOrgWebsite(''); setOrgLocation('');
      Alert.alert('Organization created', 'Your organization is pending NESBA verification. You can prepare courses while it is under review.');
    } catch (e) { Alert.alert('Could not create organization', e.message); }
    finally { setSaving(false); }
  };

  const saveCourse = async (published) => {
    if (!title.trim()) return Alert.alert('Course title required');
    const outline = moduleTitle.trim()
      ? [...modules, { title: moduleTitle, durationMinutes: moduleDuration, videoUrl }]
      : modules;
    if (!outline.length) return Alert.alert('Add at least one lesson');
    try {
      setSaving(true);
      await createCourseWithModules({ title, description, difficulty, thumbnailUrl, categoryId, organizationId: organizationId || null, isPublished: published, modules: outline });
      await load();
      setTitle(''); setDescription(''); setThumbnailUrl(''); setModuleTitle(''); setVideoUrl(''); setModuleDuration('10'); setModules([]);
      Alert.alert(published ? 'Course published' : 'Draft saved', published ? 'Your course is now available to students.' : 'Your course is saved as a draft.');
    } catch (e) { Alert.alert('Could not save course', e.message); }
    finally { setSaving(false); }
  };

  const addLessonToOutline = () => {
    if (!moduleTitle.trim()) return Alert.alert('Lesson title required');
    setModules((current) => [...current, { id: `${Date.now()}-${current.length}`, title: moduleTitle.trim(), durationMinutes: moduleDuration, videoUrl }]);
    setModuleTitle(''); setModuleDuration('10'); setVideoUrl('');
  };

  const publishDraft = async (course) => {
    try { setSaving(true); await updateCourse(course.id, { is_published: true }); await load(); }
    catch (e) { Alert.alert('Could not publish course', e.message); }
    finally { setSaving(false); }
  };

  const saveEvent = async () => {
    try {
      setSaving(true);
      await createEvent({ title: eventTitle, description: eventDescription, startsAt: eventStartsAt, endsAt: eventEndsAt, meetingUrl: eventUrl, eventType, organizationId: organizationId || null });
      setEventTitle(''); setEventDescription(''); setEventStartsAt(''); setEventEndsAt(''); setEventUrl('');
      await load();
      Alert.alert('Event scheduled', 'Students can now find and register for it in Live.');
    } catch (e) { Alert.alert('Could not schedule event', e.message); }
    finally { setSaving(false); }
  };

  const publishMedia = async () => {
    try {
      setSaving(true);
      await createMediaItem({ title: mediaTitle, description: mediaDescription, mediaUrl, mediaType, isPublished: true });
      setMediaTitle(''); setMediaDescription(''); setMediaUrl('');
      Alert.alert('Media published', 'It is now available in the NESBA Media Library.');
    } catch (e) { Alert.alert('Could not publish media', e.message); }
    finally { setSaving(false); }
  };

  if (!session) return <View style={[styles.container, styles.center]}><Text style={styles.title}>Creator Studio</Text><Text style={styles.muted}>Log in to create educational content.</Text></View>;

  if (!approved) return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Become a NESBA Creator</Text>
      <Text style={styles.muted}>Teachers, mentors and organizations are reviewed by NESBA. You can apply without creating a second account.</Text>
      {request ? <View style={styles.statusCard}><Text style={styles.statusTitle}>Application: {request.requested_role}</Text><Text style={styles.muted}>Status: {request.status}</Text></View> : <>
        <Pressable style={styles.primary} onPress={() => apply('teacher')} disabled={saving}><Text style={styles.primaryText}>Apply as Teacher</Text></Pressable>
        <Pressable style={styles.secondary} onPress={() => apply('mentor')} disabled={saving}><Text style={styles.secondaryText}>Apply as Mentor</Text></Pressable>
        <Pressable style={styles.secondary} onPress={() => apply('organization')} disabled={saving}><Text style={styles.secondaryText}>Apply as Organization</Text></Pressable>
      </>}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Creator Studio</Text>
      <Text style={styles.muted}>Manage your educational presence and publish courses.</Text>

      {myCourses.length > 0 && <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Course Analytics</Text>
        {myCourses.map((course) => <View key={course.id} style={styles.courseRow}><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{course.title}</Text><Text style={styles.mutedSmall}>{courseStats[course.id] ? `${courseStats[course.id].enrollments} enrolled · ${courseStats[course.id].completions} completed · ${courseStats[course.id].average_progress}% average progress` : 'Analytics unavailable until the migration is applied.'}</Text></View></View>)}
      </View>}

      {user.role === 'organization' && <View style={styles.orgCard}>
        <Text style={styles.sectionTitle}>Create Organization Profile</Text>
        <TextInput value={orgName} onChangeText={setOrgName} style={styles.input} placeholder="Organization name" placeholderTextColor={colors.textMuted} />
        <TextInput value={orgDescription} onChangeText={setOrgDescription} style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={colors.textMuted} multiline />
        <TextInput value={orgWebsite} onChangeText={setOrgWebsite} style={styles.input} placeholder="Website (optional)" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
        <TextInput value={orgLocation} onChangeText={setOrgLocation} style={styles.input} placeholder="Location (optional)" placeholderTextColor={colors.textMuted} />
        <Pressable style={styles.secondary} onPress={createOrg} disabled={saving}><Text style={styles.secondaryText}>Create Organization</Text></Pressable>
      </View>}

      {organizations.length > 0 && <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Your Organizations</Text>
        {organizations.map((org) => <Pressable key={org.id} style={styles.orgRow} onPress={() => router.push(`/organization/${org.id}`)}>
          <View style={styles.miniLogo}><Text style={styles.miniLogoText}>{org.name.charAt(0).toUpperCase()}</Text></View>
          <View style={{flex:1}}><Text style={styles.statusTitle}>{org.name}</Text><Text style={styles.mutedSmall}>{org.verification_status === 'verified' ? '✓ Verified' : 'Verification pending'}</Text></View>
          <Text style={styles.link}>View</Text>
        </Pressable>)}
      </View>}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Create Course</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Course title" placeholderTextColor={colors.textMuted} />
        <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} multiline placeholder="What will students learn?" placeholderTextColor={colors.textMuted} />
        <TextInput value={thumbnailUrl} onChangeText={setThumbnailUrl} style={styles.input} autoCapitalize="none" placeholder="Course image URL (optional)" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.chips}>{['beginner', 'intermediate', 'advanced'].map((level) => <Pressable key={level} style={[styles.chip, difficulty === level && styles.chipActive]} onPress={() => setDifficulty(level)}><Text style={[styles.chipText, difficulty === level && styles.chipTextActive]}>{level[0].toUpperCase() + level.slice(1)}</Text></Pressable>)}</View>
        <Text style={[styles.label, { marginTop: spacing.md }]}>Course outline</Text>
        {modules.map((module, index) => <View key={module.id} style={styles.lessonRow}><View style={styles.lessonNumber}><Text style={styles.lessonNumberText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{module.title}</Text><Text style={styles.mutedSmall}>{module.durationMinutes || 0} min{module.videoUrl ? ' • Video attached' : ''}</Text></View><Pressable accessibilityLabel={`Remove ${module.title}`} onPress={() => setModules((current) => current.filter((item) => item.id !== module.id))}><Text style={styles.removeText}>Remove</Text></Pressable></View>)}
        <TextInput value={moduleTitle} onChangeText={setModuleTitle} style={styles.input} placeholder={modules.length ? 'Next lesson title' : 'First lesson title'} placeholderTextColor={colors.textMuted} />
        <TextInput value={moduleDuration} onChangeText={setModuleDuration} style={styles.input} keyboardType="numeric" placeholder="Lesson duration (minutes)" placeholderTextColor={colors.textMuted} />
        <TextInput value={videoUrl} onChangeText={setVideoUrl} style={styles.input} autoCapitalize="none" placeholder="Video URL (optional)" placeholderTextColor={colors.textMuted} />
        <Pressable style={styles.addLessonButton} onPress={addLessonToOutline} disabled={saving}><Text style={styles.addLessonText}>+ Add Lesson to Outline</Text></Pressable>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>{categories.map((cat) => <Pressable key={cat.id} style={[styles.chip, categoryId === cat.id && styles.chipActive]} onPress={() => setCategoryId(cat.id)}><Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text></Pressable>)}</View>
        {organizations.length > 0 && <><Text style={styles.label}>Organization</Text><View style={styles.chips}>{organizations.map((org) => <Pressable key={org.id} style={[styles.chip, organizationId === org.id && styles.chipActive]} onPress={() => setOrganizationId(org.id)}><Text style={[styles.chipText, organizationId === org.id && styles.chipTextActive]}>{org.name}</Text></Pressable>)}</View></>}
        <Pressable style={styles.primary} onPress={() => saveCourse(false)} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save Draft</Text>}</Pressable>
        <Pressable style={styles.secondary} onPress={() => saveCourse(true)} disabled={saving}><Text style={styles.secondaryText}>Publish Course</Text></Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Your Courses</Text>
        {myCourses.length === 0 ? <Text style={styles.muted}>No courses yet.</Text> : myCourses.map((course) => <View key={course.id} style={styles.courseRow}>
          <View style={{flex:1}}><Text style={styles.statusTitle}>{course.title}</Text><Text style={styles.mutedSmall}>{course.is_published ? 'Published' : 'Draft'}{course.categories?.name ? ` • ${course.categories.name}` : ''}</Text></View>
          {!course.is_published && <Pressable style={styles.smallButton} onPress={() => publishDraft(course)} disabled={saving}><Text style={styles.smallButtonText}>Publish</Text></Pressable>}
        </View>)}
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Schedule Live Class or Event</Text>
        <Text style={styles.muted}>Use an ISO date/time, for example 2026-09-01T18:30. Students can register from the Live tab.</Text>
        <TextInput value={eventTitle} onChangeText={setEventTitle} style={styles.input} placeholder="Event title" placeholderTextColor={colors.textMuted} />
        <TextInput value={eventDescription} onChangeText={setEventDescription} style={[styles.input, styles.textArea]} multiline placeholder="What will attendees learn?" placeholderTextColor={colors.textMuted} />
        <TextInput value={eventStartsAt} onChangeText={setEventStartsAt} style={styles.input} autoCapitalize="none" placeholder="Starts at (2026-09-01T18:30)" placeholderTextColor={colors.textMuted} />
        <TextInput value={eventEndsAt} onChangeText={setEventEndsAt} style={styles.input} autoCapitalize="none" placeholder="Ends at (optional)" placeholderTextColor={colors.textMuted} />
        <TextInput value={eventUrl} onChangeText={setEventUrl} style={styles.input} autoCapitalize="none" placeholder="Meeting link (optional)" placeholderTextColor={colors.textMuted} />
        <View style={styles.chips}>{[['live_class', 'Live class'], ['workshop', 'Workshop'], ['webinar', 'Webinar'], ['event', 'Event']].map(([value, label]) => <Pressable key={value} style={[styles.chip, eventType === value && styles.chipActive]} onPress={() => setEventType(value)}><Text style={[styles.chipText, eventType === value && styles.chipTextActive]}>{label}</Text></Pressable>)}</View>
        <Pressable style={styles.primary} onPress={saveEvent} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Schedule Event</Text>}</Pressable>
        {myEvents.length > 0 && <View style={{ marginTop: spacing.md }}>{myEvents.map((event) => <View key={event.id} style={styles.courseRow}><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{event.title}</Text><Text style={styles.mutedSmall}>{new Date(event.starts_at).toLocaleString()} · {event.status}</Text></View></View>)}</View>}
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Publish Recording or Podcast</Text>
        <Text style={styles.muted}>Publish a hosted audio or video link to the Media Library.</Text>
        <TextInput value={mediaTitle} onChangeText={setMediaTitle} style={styles.input} placeholder="Title" placeholderTextColor={colors.textMuted} />
        <TextInput value={mediaDescription} onChangeText={setMediaDescription} style={[styles.input, styles.textArea]} multiline placeholder="Description (optional)" placeholderTextColor={colors.textMuted} />
        <TextInput value={mediaUrl} onChangeText={setMediaUrl} style={styles.input} autoCapitalize="none" placeholder="Audio or video URL" placeholderTextColor={colors.textMuted} />
        <View style={styles.chips}>{[['recording','Recording'],['podcast_episode','Podcast episode'],['audio_lesson','Audio lesson']].map(([value,label])=><Pressable key={value} style={[styles.chip,mediaType===value&&styles.chipActive]} onPress={()=>setMediaType(value)}><Text style={[styles.chipText,mediaType===value&&styles.chipTextActive]}>{label}</Text></Pressable>)}</View>
        <Pressable style={styles.primary} onPress={publishMedia} disabled={saving}><Text style={styles.primaryText}>Publish Media</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},content:{padding:spacing.md,paddingBottom:spacing.xl},center:{justifyContent:'center',alignItems:'center',padding:spacing.lg},title:{...typography.h1,fontSize:24,marginBottom:spacing.sm},muted:{...typography.body,color:colors.textMuted,lineHeight:21,marginBottom:spacing.md},mutedSmall:{...typography.caption,color:colors.textMuted},label:{...typography.caption,marginTop:spacing.sm,marginBottom:5},sectionTitle:{...typography.h2,fontSize:17,marginBottom:spacing.sm},input:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:radius.md,padding:spacing.sm,color:colors.text,minHeight:48,marginBottom:spacing.sm},textArea:{minHeight:100,textAlignVertical:'top'},primary:{backgroundColor:colors.primary,padding:spacing.md,borderRadius:radius.md,alignItems:'center',marginTop:spacing.sm,minHeight:50,justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'700'},secondary:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,padding:spacing.md,borderRadius:radius.md,alignItems:'center',marginTop:spacing.sm,minHeight:50,justifyContent:'center'},secondaryText:{color:colors.text,fontWeight:'700'},addLessonButton:{borderColor:colors.primary,borderWidth:1,borderRadius:radius.md,padding:spacing.sm,alignItems:'center',marginBottom:spacing.sm},addLessonText:{color:colors.primaryLight,fontWeight:'700'},lessonRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:radius.md,padding:spacing.sm,marginBottom:spacing.xs},lessonNumber:{width:26,height:26,borderRadius:13,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},lessonNumberText:{color:'#fff',fontWeight:'800',fontSize:12},removeText:{color:colors.danger,fontSize:12,fontWeight:'700'},orgCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.md},sectionCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.md},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs,marginBottom:spacing.sm},chip:{backgroundColor:colors.surfaceAlt,borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:11,paddingVertical:8},chipActive:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{color:colors.textMuted,fontSize:12,fontWeight:'600'},chipTextActive:{color:'#fff'},statusCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md,marginTop:spacing.lg},statusTitle:{...typography.body,fontWeight:'700'},orgRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border},miniLogo:{width:42,height:42,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},miniLogoText:{color:'#fff',fontWeight:'800',fontSize:18},link:{color:colors.primaryLight,fontWeight:'700'},courseRow:{flexDirection:'row',alignItems:'center',paddingVertical:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border,gap:spacing.sm},smallButton:{backgroundColor:colors.primary,paddingHorizontal:12,paddingVertical:8,borderRadius:radius.pill},smallButtonText:{color:'#fff',fontWeight:'700',fontSize:12}
});
