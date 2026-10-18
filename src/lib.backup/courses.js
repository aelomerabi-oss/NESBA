import { supabase } from './supabase';

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, teacher_name, thumbnail_url, lesson_count, duration_minutes, is_premium, organization_id')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapCourse);
}

export async function getCourseById(id) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, course_modules(id, title, duration_minutes, sort_order, is_locked)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return {
    ...mapCourse(data),
    description: data.description,
    modules: (data.course_modules || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, title: m.title, duration: `${m.duration_minutes}m`, locked: m.is_locked, videoUrl: m.video_url })),
  };
}

function mapCourse(c) {
  const hours = Math.floor(c.duration_minutes / 60);
  const mins = c.duration_minutes % 60;
  return {
    id: c.id,
    title: c.title,
    teacher: c.teacher_name,
    lessons: c.lesson_count,
    duration: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    isPremium: c.is_premium,
    organization_id: c.organization_id,
    thumbnail: c.thumbnail_url,
  };
}
