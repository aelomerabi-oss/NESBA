import { supabase } from './supabase';

/*
 * Practical projects: student groups that build something together.
 * Tables and rules are in src/sql/031_projects.sql.
 */

const PROFILE = 'id,full_name,avatar_url';

function check(error, fallback) {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('project_groups')
    .select(`*, owner:profiles!project_groups_owner_id_fkey(${PROFILE}), course:courses(id,title), project_group_members(count)`)
    .order('created_at', { ascending: false })
    .limit(100);

  check(error, 'Could not load projects.');

  return (data || []).map((p) => ({
    ...p,
    memberCount: p.project_group_members?.[0]?.count || 0,
  }));
}

export async function getMyProjectIds(userId) {
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from('project_group_members')
    .select('group_id')
    .eq('user_id', userId);

  check(error, 'Could not load your projects.');

  return new Set((data || []).map((row) => row.group_id));
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('project_groups')
    .select(`*, owner:profiles!project_groups_owner_id_fkey(${PROFILE}), course:courses(id,title)`)
    .eq('id', id)
    .maybeSingle();

  check(error, 'Could not load this project.');
  return data;
}

export async function getProjectMembers(groupId) {
  const { data, error } = await supabase
    .from('project_group_members')
    .select(`*, profile:profiles(${PROFILE})`)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  check(error, 'Could not load the team.');
  return data || [];
}

export async function createProject({ ownerId, name, description, courseId, skills, maxMembers }) {
  const { data, error } = await supabase
    .from('project_groups')
    .insert({
      owner_id: ownerId,
      name: name.trim(),
      description: description.trim() || null,
      course_id: courseId || null,
      skills,
      max_members: maxMembers,
    })
    .select('id')
    .single();

  check(error, 'Could not create the project.');
  return data;
}

export async function joinProject(groupId, userId) {
  const { error } = await supabase
    .from('project_group_members')
    .insert({ group_id: groupId, user_id: userId, member_role: 'member' });

  check(error, 'Could not join the project.');
}

export async function leaveProject(groupId, userId) {
  const { error } = await supabase
    .from('project_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  check(error, 'Could not leave the project.');
}

export async function setProjectOpen(groupId, isOpen) {
  const { error } = await supabase
    .from('project_groups')
    .update({ is_open: isOpen, updated_at: new Date().toISOString() })
    .eq('id', groupId);

  check(error, 'Could not update the project.');
}

// Mark a project finished; it then appears in the public showcase and every
// member can open a certificate.
export async function completeProject(groupId, summary, url) {
  const { error } = await supabase
    .from('project_groups')
    .update({
      status: 'completed',
      is_open: false,
      showcase_summary: summary.trim() || null,
      showcase_url: url.trim() || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId);

  check(error, 'Could not complete the project.');
}

export async function getShowcase() {
  const { data, error } = await supabase
    .from('project_groups')
    .select(`*, course:courses(id,title), project_group_members(member_role, profile:profiles(${PROFILE}))`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100);

  check(error, 'Could not load the showcase.');
  return data || [];
}

export async function deleteProject(groupId) {
  const { error } = await supabase.from('project_groups').delete().eq('id', groupId);
  check(error, 'Could not delete the project.');
}

export async function getProjectPosts(groupId) {
  const { data, error } = await supabase
    .from('project_group_posts')
    .select(`*, author:profiles(${PROFILE})`)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100);

  check(error, 'Could not load the discussion.');
  return data || [];
}

export async function addProjectPost(groupId, authorId, content, linkUrl) {
  const { error } = await supabase.from('project_group_posts').insert({
    group_id: groupId,
    author_id: authorId,
    content: content.trim(),
    link_url: linkUrl?.trim() || null,
  });

  check(error, 'Could not post the update.');
}

export async function deleteProjectPost(postId) {
  const { error } = await supabase.from('project_group_posts').delete().eq('id', postId);
  check(error, 'Could not delete the update.');
}

export async function getProjectTasks(groupId) {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`*, assignee:profiles!project_tasks_assignee_id_fkey(${PROFILE})`)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  check(error, 'Could not load the tasks.');
  return data || [];
}

export async function addProjectTask(groupId, createdBy, title) {
  const { error } = await supabase.from('project_tasks').insert({
    group_id: groupId,
    created_by: createdBy,
    title: title.trim(),
  });

  check(error, 'Could not add the task.');
}

export async function updateProjectTask(taskId, changes) {
  const { error } = await supabase
    .from('project_tasks')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  check(error, 'Could not update the task.');
}

export async function deleteProjectTask(taskId) {
  const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
  check(error, 'Could not delete the task.');
}
