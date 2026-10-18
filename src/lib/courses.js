import { supabase } from './supabase';

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((course) => ({
    ...course,

    thumbnail: course.thumbnail_url,
    teacher: course.teacher_name,

    lessons: course.lesson_count || 0,

    duration: course.duration_minutes
      ? `${Math.floor(course.duration_minutes / 60)}h ${
          course.duration_minutes % 60
        }m`
      : '',
  }));
}

export async function getCourseById(id) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_sections (
        id,
        title,
        description,
        sort_order,
        course_modules (
          id,
          title,
          duration_minutes,
          sort_order,
          is_locked,
          video_url
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Course not found.');
  }

  const sections = (data.course_sections || [])
    .sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0)
    )
    .map((section) => ({
      ...section,

      lessons: (section.course_modules || [])
        .sort(
          (a, b) =>
            (a.sort_order || 0) - (b.sort_order || 0)
        )
        .map((lesson) => ({
          ...lesson,
          duration: lesson.duration_minutes
            ? `${lesson.duration_minutes}m`
            : '',
          locked: !!lesson.is_locked,
        })),
    }));

  return {
    ...data,

    thumbnail: data.thumbnail_url,
    teacher: data.teacher_name,

    lessons: data.lesson_count || 0,

    duration: data.duration_minutes
      ? `${Math.floor(data.duration_minutes / 60)}h ${
          data.duration_minutes % 60
        }m`
      : '',

    sections,

    // Keep compatibility with the existing course detail screen.
    modules: sections.flatMap(
      (section) => section.lessons
    ),
  };
}