import { supabase } from './supabase';

/*
 * Lesson quizzes and assignments (src/sql/033_engagement.sql).
 * Learners never receive the correct answers until submit_quiz grades them.
 */

function check(error) {
  if (error) throw new Error(error.message);
}

export async function getQuiz(lessonId) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id,question,options,sort_order')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true });

  check(error);
  return data || [];
}

// Teachers see the answer keys of their own lessons.
export async function getAnswerKeys(questionIds) {
  if (!questionIds.length) return {};

  const { data, error } = await supabase
    .from('quiz_answer_keys')
    .select('question_id,correct_index')
    .in('question_id', questionIds);

  check(error);
  return Object.fromEntries((data || []).map((row) => [row.question_id, row.correct_index]));
}

export async function addQuizQuestion(lessonId, question, options, correctIndex) {
  const { error } = await supabase.rpc('add_quiz_question', {
    p_lesson_id: lessonId,
    p_question: question,
    p_options: options,
    p_correct_index: correctIndex,
  });

  check(error);
}

export async function deleteQuizQuestion(questionId) {
  const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
  check(error);
}

// answers: { [questionId]: optionIndex } -> { score, total, results }
export async function submitQuiz(lessonId, answers) {
  const { data, error } = await supabase.rpc('submit_quiz', {
    p_lesson_id: lessonId,
    p_answers: answers,
  });

  check(error);
  return data;
}

export async function getBestAttempt(lessonId, userId) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('score,total,created_at')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();

  check(error);
  return data;
}

export async function getAssignment(lessonId) {
  const { data, error } = await supabase
    .from('lesson_assignments')
    .select('*')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  check(error);
  return data;
}

export async function saveAssignment(lessonId, instructions) {
  const { error } = await supabase
    .from('lesson_assignments')
    .upsert({ lesson_id: lessonId, instructions: instructions.trim(), updated_at: new Date().toISOString() });

  check(error);
}

export async function deleteAssignment(lessonId) {
  const { error } = await supabase.from('lesson_assignments').delete().eq('lesson_id', lessonId);
  check(error);
}

// The learner's own submission, or all submissions for the teacher.
export async function getSubmissions(lessonId) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select('*, student:profiles(id,full_name,avatar_url)')
    .eq('lesson_id', lessonId)
    .order('submitted_at', { ascending: false });

  check(error);
  return data || [];
}

export async function submitAssignment(lessonId, content, linkUrl) {
  const { error } = await supabase.rpc('submit_assignment', {
    p_lesson_id: lessonId,
    p_content: content,
    p_link_url: linkUrl,
  });

  check(error);
}

export async function reviewAssignment(submissionId, feedback, grade) {
  const { error } = await supabase.rpc('review_assignment', {
    p_submission_id: submissionId,
    p_feedback: feedback,
    p_grade: grade,
  });

  check(error);
}
