import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  addProjectPost,
  addProjectTask,
  deleteProject,
  deleteProjectPost,
  deleteProjectTask,
  getProject,
  getProjectMembers,
  getProjectPosts,
  getProjectTasks,
  completeProject,
  joinProject,
  leaveProject,
  setProjectOpen,
  updateProjectTask,
} from '../../lib/projects';

const COLUMNS = [
  { status: 'todo', label: 'To do', next: 'doing' },
  { status: 'doing', label: 'In progress', next: 'done' },
  { status: 'done', label: 'Done', next: 'todo' },
];

function Avatar({ profile, size = 36 }) {
  const name = profile?.full_name || '?';
  if (profile?.avatar_url) {
    return <Image source={{ uri: profile.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('discussion');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [postText, setPostText] = useState('');
  const [postLink, setPostLink] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState('');
  const [showcaseUrl, setShowcaseUrl] = useState('');

  const isMember = members.some((m) => m.user_id === userId);
  const isOwner = !!project && project.owner_id === userId;
  const full = members.length >= (project?.max_members || 0);

  const load = useCallback(async () => {
    try {
      setError('');
      const [row, team] = await Promise.all([getProject(id), getProjectMembers(id)]);
      setProject(row);
      setMembers(team);

      // Discussion and tasks are only readable by members.
      if (userId && team.some((m) => m.user_id === userId)) {
        const [feed, board] = await Promise.all([getProjectPosts(id), getProjectTasks(id)]);
        setPosts(feed);
        setTasks(board);
      } else {
        setPosts([]);
        setTasks([]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => { load(); }, [load]);

  const run = async (action) => {
    try {
      setWorking(true);
      setError('');
      await action();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const join = () => {
    if (!userId) return router.push('/login');
    return run(() => joinProject(id, userId));
  };

  const confirmDelete = () =>
    Alert.alert('Delete project', 'This removes the project, its discussion and tasks for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => run(async () => {
          await deleteProject(id);
          router.replace('/projects');
        }),
      },
    ]);

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!project) {
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>{error || 'This project no longer exists.'}</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={styles.title}>{project.name}</Text>
      <Text style={styles.muted}>
        Led by {project.owner?.full_name || 'a NESBA member'} · {members.length}/{project.max_members} members
        {!project.is_open ? ' · closed to new members' : ''}
      </Text>

      {!!project.course?.title && (
        <Pressable style={styles.courseLink} onPress={() => router.push(`/course/${project.course.id}`)}>
          <Ionicons name="school-outline" size={15} color={colors.primary} />
          <Text style={styles.courseLinkText}>{project.course.title}</Text>
        </Pressable>
      )}

      {!!project.description && <Text style={styles.description}>{project.description}</Text>}

      {project.skills?.length > 0 && (
        <View style={styles.skills}>
          {project.skills.map((skill) => <Text key={skill} style={styles.skill}>{skill}</Text>)}
        </View>
      )}

      {project.status === 'completed' && (
        <View style={styles.showcase}>
          <Text style={styles.showcaseTitle}>🏆 Project completed{project.completed_at ? ` · ${new Date(project.completed_at).toLocaleDateString()}` : ''}</Text>
          {!!project.showcase_summary && <Text style={styles.description}>{project.showcase_summary}</Text>}
          {!!project.showcase_url && (
            <Pressable onPress={() => Linking.openURL(project.showcase_url)}>
              <Text style={styles.link} numberOfLines={1}>See the result: {project.showcase_url}</Text>
            </Pressable>
          )}
          {isMember && (
            <Pressable style={[styles.primaryButton, { alignSelf: 'flex-start' }]} onPress={() => router.push(`/projects/certificate/${id}?member=${userId}`)}>
              <Text style={styles.primaryText}>View my certificate</Text>
            </Pressable>
          )}
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {isOwner && project.status !== 'completed' && (
        finishing ? (
          <View style={styles.finishForm}>
            <Text style={styles.sectionTitle}>Finish the project</Text>
            <Text style={styles.muted}>It goes into the public showcase and every member gets a certificate.</Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              multiline
              maxLength={3000}
              placeholder="What did the team build and learn?"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
            />
            <TextInput
              value={showcaseUrl}
              onChangeText={setShowcaseUrl}
              autoCapitalize="none"
              placeholder="Link to the result (website, demo video, document), optional"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryButton, (working || summary.trim().length < 10) && styles.disabled]}
                disabled={working || summary.trim().length < 10}
                onPress={() => run(async () => { await completeProject(id, summary, showcaseUrl); setFinishing(false); })}
              >
                <Text style={styles.primaryText}>Complete project</Text>
              </Pressable>
              <Pressable style={styles.outlineButton} onPress={() => setFinishing(false)}>
                <Text style={styles.outlineText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.outlineButton, { alignSelf: 'flex-start', marginTop: spacing.md }]} onPress={() => setFinishing(true)}>
            <Text style={styles.outlineText}>🏁 Mark project as completed</Text>
          </Pressable>
        )
      )}

      <View style={styles.actions}>
        {!isMember && project.status !== 'completed' && (
          <Pressable
            style={[styles.primaryButton, (working || full || !project.is_open) && styles.disabled]}
            disabled={working || full || !project.is_open}
            onPress={join}
          >
            <Text style={styles.primaryText}>{full ? 'Team is full' : !project.is_open ? 'Not accepting members' : 'Join this project'}</Text>
          </Pressable>
        )}
        {isMember && !isOwner && (
          <Pressable style={styles.outlineButton} disabled={working} onPress={() => run(() => leaveProject(id, userId))}>
            <Text style={styles.outlineText}>Leave project</Text>
          </Pressable>
        )}
        {isOwner && (
          <>
            {project.status !== 'completed' && <Pressable style={styles.outlineButton} disabled={working} onPress={() => run(() => setProjectOpen(id, !project.is_open))}>
              <Text style={styles.outlineText}>{project.is_open ? 'Close to new members' : 'Open to new members'}</Text>
            </Pressable>}
            <Pressable style={[styles.outlineButton, styles.dangerOutline]} disabled={working} onPress={confirmDelete}>
              <Text style={[styles.outlineText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Team</Text>
      <View style={styles.team}>
        {members.map((m) => (
          <Pressable key={m.id} style={styles.member} onPress={() => router.push(`/user/${m.user_id}`)}>
            <Avatar profile={m.profile} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName} numberOfLines={1}>{m.profile?.full_name || 'NESBA member'}{m.user_id === userId ? ' (you)' : ''}</Text>
              <Text style={styles.muted}>{m.member_role === 'owner' ? 'Project lead' : 'Member'}</Text>
            </View>
            {isOwner && m.member_role !== 'owner' && (
              <Pressable hitSlop={8} disabled={working} onPress={() => run(() => leaveProject(id, m.user_id))}>
                <Ionicons name="person-remove-outline" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </Pressable>
        ))}
      </View>

      {!isMember ? (
        <View style={styles.locked}>
          <Ionicons name="lock-closed-outline" size={22} color={colors.textMuted} />
          <Text style={styles.muted}>Join the project to see the discussion and task board.</Text>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            {[['discussion', `Discussion (${posts.length})`], ['tasks', `Tasks (${tasks.length})`]].map(([key, label]) => (
              <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabSelected]}>
                <Text style={[styles.tabText, tab === key && styles.tabTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'discussion' ? (
            <View>
              <View style={styles.composer}>
                <TextInput
                  value={postText}
                  onChangeText={setPostText}
                  multiline
                  maxLength={4000}
                  placeholder="Share progress, ask a question or post an idea…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                />
                <TextInput
                  value={postLink}
                  onChangeText={setPostLink}
                  autoCapitalize="none"
                  placeholder="Link (Google Doc, Figma, GitHub…) optional"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <Pressable
                  style={[styles.primaryButton, (!postText.trim() || working) && styles.disabled]}
                  disabled={!postText.trim() || working}
                  onPress={() => run(async () => {
                    await addProjectPost(id, userId, postText, postLink);
                    setPostText('');
                    setPostLink('');
                  })}
                >
                  <Text style={styles.primaryText}>Post update</Text>
                </Pressable>
              </View>

              {posts.length === 0 && <Text style={styles.muted}>No updates yet. Say hello to your team!</Text>}

              {posts.map((post) => (
                <View key={post.id} style={styles.post}>
                  <View style={styles.postHeader}>
                    <Avatar profile={post.author} size={30} />
                    <Text style={styles.memberName}>{post.author?.full_name || 'NESBA member'}</Text>
                    <Text style={[styles.muted, { marginLeft: 'auto' }]}>{new Date(post.created_at).toLocaleDateString()}</Text>
                    {(post.author_id === userId || isOwner) && (
                      <Pressable hitSlop={8} onPress={() => run(() => deleteProjectPost(post.id))}>
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.postText}>{post.content}</Text>
                  {!!post.link_url && (
                    <Pressable onPress={() => Linking.openURL(post.link_url)}>
                      <Text style={styles.link} numberOfLines={1}>{post.link_url}</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View>
              <View style={styles.taskComposer}>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  maxLength={200}
                  placeholder="Add a task…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1 }]}
                  onSubmitEditing={() => taskTitle.trim() && run(async () => {
                    await addProjectTask(id, userId, taskTitle);
                    setTaskTitle('');
                  })}
                />
                <Pressable
                  style={[styles.addTask, (!taskTitle.trim() || working) && styles.disabled]}
                  disabled={!taskTitle.trim() || working}
                  onPress={() => run(async () => {
                    await addProjectTask(id, userId, taskTitle);
                    setTaskTitle('');
                  })}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              </View>

              {COLUMNS.map((column) => {
                const columnTasks = tasks.filter((t) => t.status === column.status);
                return (
                  <View key={column.status} style={styles.column}>
                    <Text style={styles.columnTitle}>{column.label} ({columnTasks.length})</Text>
                    {columnTasks.map((task) => (
                      <View key={task.id} style={styles.task}>
                        <Pressable
                          hitSlop={8}
                          disabled={working}
                          onPress={() => run(() => updateProjectTask(task.id, { status: column.next }))}
                        >
                          <Ionicons
                            name={task.status === 'done' ? 'checkmark-circle' : task.status === 'doing' ? 'ellipse-outline' : 'radio-button-off'}
                            size={22}
                            color={task.status === 'done' ? colors.success : task.status === 'doing' ? colors.warning : colors.textMuted}
                          />
                        </Pressable>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.taskTitle, task.status === 'done' && styles.taskDone]}>{task.title}</Text>
                          <Pressable
                            disabled={working}
                            onPress={() => run(() => updateProjectTask(task.id, { assignee_id: task.assignee_id === userId ? null : userId }))}
                          >
                            <Text style={styles.assignee}>
                              {task.assignee ? `Assigned to ${task.assignee_id === userId ? 'you' : task.assignee.full_name}` : 'Unassigned · tap to take it'}
                            </Text>
                          </Pressable>
                        </View>
                        {(task.created_by === userId || isOwner) && (
                          <Pressable hitSlop={8} disabled={working} onPress={() => run(() => deleteProjectTask(task.id))}>
                            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
              <Text style={styles.muted}>Tap a task&apos;s circle to move it to the next column.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  title: { ...typography.h1, fontSize: 24 },
  muted: { ...typography.caption },
  showcase: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  showcaseTitle: { ...typography.body, fontWeight: '800' },
  finishForm: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  courseLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  courseLinkText: { color: colors.primary, fontWeight: '700' },
  description: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 22 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  skill: { fontSize: 12, color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 18, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  outlineButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  outlineText: { color: colors.text, fontWeight: '700' },
  dangerOutline: { borderColor: colors.danger },
  disabled: { opacity: 0.5 },
  sectionTitle: { ...typography.h2, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  team: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberName: { ...typography.body, fontWeight: '700', fontSize: 14 },
  avatar: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  locked: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginTop: spacing.lg, marginBottom: spacing.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  tabSelected: { backgroundColor: colors.surface },
  tabText: { ...typography.caption, fontWeight: '700' },
  tabTextSelected: { color: colors.text },
  composer: { gap: spacing.sm, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.text, fontSize: 15 },
  post: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.sm, gap: 6 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  postText: { ...typography.body, lineHeight: 21 },
  link: { color: colors.primary, fontWeight: '600' },
  taskComposer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addTask: { backgroundColor: colors.primary, borderRadius: radius.md, width: 46, alignItems: 'center', justifyContent: 'center' },
  column: { marginBottom: spacing.md },
  columnTitle: { ...typography.body, fontWeight: '800', marginBottom: 6 },
  task: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: 6 },
  taskTitle: { ...typography.body, fontSize: 14 },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  assignee: { ...typography.caption, fontSize: 12, marginTop: 2 },
});
