import { supabase } from './supabase';


export async function getModuleById(
  moduleId
) {
  const {
    data,
    error,
  } = await supabase
    .from('course_modules')
    .select(
      '*, courses(title, is_premium)'
    )
    .eq(
      'id',
      moduleId
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function markLessonComplete(
  userId,
  moduleId,
  courseId
) {
  const {
    error,
  } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        module_id: moduleId,
        course_id: courseId,
        completed: true,
      },
      {
        onConflict:
          'user_id,module_id',
      }
    );

  if (error) {
    throw error;
  }
}


export async function getLessonProgress(
  userId,
  courseId
) {
  const {
    data,
    error,
  } = await supabase
    .from('lesson_progress')
    .select(
      'module_id'
    )
    .eq(
      'user_id',
      userId
    )
    .eq(
      'course_id',
      courseId
    );

  if (error) {
    throw error;
  }

  return new Set(
    data.map(
      (d) => d.module_id
    )
  );
}


export async function getMyCertificates(
  userId
) {
  const {
    data,
    error,
  } = await supabase
    .from('certificates')
    .select(
      'id,user_id,certificate_id,issued_at,course_id,courses(title,teacher_name)'
    )
    .eq(
      'user_id',
      userId
    )
    .order(
      'issued_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/*
 * ============================================
 * GET CERTIFICATE BY ID
 *
 * Publicly viewable certificate.
 *
 * IMPORTANT:
 * user_id is explicitly selected so the
 * certificate screen can determine whether
 * the logged-in user owns this certificate.
 * ============================================
 */

export async function getCertificateById(
  id
) {
  if (!id) {
    throw new Error(
      'Certificate ID is required.'
    );
  }

  const column =
    id.startsWith(
      'NESBA-CERT-'
    )
      ? 'certificate_id'
      : 'id';

  const {
    data,
    error,
  } = await supabase
    .from('certificates')
    .select(
      'id,user_id,certificate_id,issued_at,course_id,courses(title,teacher_name),profiles(full_name)'
    )
    .eq(
      column,
      id
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function getMyBadges(
  userId
) {
  const {
    data,
    error,
  } = await supabase
    .from('user_badges')
    .select(
      'awarded_at,badges(name,description,icon_url)'
    )
    .eq(
      'user_id',
      userId
    )
    .order(
      'awarded_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}