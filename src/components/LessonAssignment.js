import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';
import { openExternalLink } from '../lib/safe-link';
import {
  deleteAssignment,
  getAssignment,
  getSubmissions,
  reviewAssignment,
  saveAssignment,
  submitAssignment,
} from '../lib/lesson-activities';

function Review({ submission, onSaved }) {
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [grade, setGrade] = useState(submission.grade || '');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    try {
      setWorking(true);
      setError('');
      await reviewAssignment(submission.id, feedback, grade);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={styles.submission}>
      <Text style={styles.student}>
        {submission.student?.full_name || 'Learner'} · {submission.status === 'reviewed' ? 'Reviewed' : 'Waiting for review'}
      </Text>
      {!!submission.content && <Text style={styles.body}>{submission.content}</Text>}
      {!!submission.link_url && (
        <Pressable onPress={() => openExternalLink(submission.link_url)}>
          <Text style={styles.link} numberOfLines={1}>{submission.link_url}</Text>
        </Pressable>
      )}
      <TextInput value={feedback} onChangeText={setFeedback} multiline placeholder="Feedback for the learner" placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} />
      <View style={styles.row}>
        <TextInput value={grade} onChangeText={setGrade} maxLength={40} placeholder="Grade (e.g. 8/10, Pass)" placeholderTextColor={colors.textMuted} style={[styles.input, { flex: 1 }]} />
        <Pressable style={[styles.button, working && styles.disabled]} disabled={working} onPress={save}>
          <Text style={styles.buttonText}>Send review</Text>
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/*
 * Practical assignment under a lesson: the teacher sets instructions and
 * reviews work; learners hand in text and/or a link and see the feedback.
 */
export default function LessonAssignment({ lessonId, isTeacher }) {
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');

  const load = useCallback(async () => {
    try {
      const row = await getAssignment(lessonId);
      setAssignment(row);
      setInstructions(row?.instructions || '');
      if (row) {
        const subs = await getSubmissions(lessonId);
        setSubmissions(subs);
        if (!isTeacher && subs[0]) {
          setContent(subs[0].content || '');
          setLink(subs[0].link_url || '');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lessonId, isTeacher]);

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

  if (loading) return null;
  if (!isTeacher && !assignment) return null;

  const mine = !isTeacher ? submissions[0] : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="clipboard-outline" size={22} color={colors.primary} />
        <Text style={styles.title}>Assignment</Text>
        {isTeacher && !!assignment && !editing && (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.link}>Edit</Text>
          </Pressable>
        )}
      </View>

      {isTeacher && (editing || !assignment) ? (
        editing ? (
          <View style={styles.form}>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              multiline
              placeholder="What should learners do? e.g. Write a one-page business plan for a local café using this lesson's template."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.multiline]}
            />
            <View style={styles.row}>
              <Pressable style={[styles.button, working && styles.disabled]} disabled={working} onPress={() => run(async () => { await saveAssignment(lessonId, instructions); setEditing(false); })}>
                <Text style={styles.buttonText}>Save assignment</Text>
              </Pressable>
              {!!assignment && (
                <Pressable disabled={working} onPress={() => run(async () => { await deleteAssignment(lessonId); setEditing(false); })}>
                  <Text style={[styles.muted, { color: colors.danger }]}>Remove</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setEditing(false)}>
                <Text style={styles.muted}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.link}>+ Add a practical assignment</Text>
          </Pressable>
        )
      ) : (
        <Text style={styles.body}>{assignment.instructions}</Text>
      )}

      {isTeacher && !!assignment && !editing && (
        <>
          <Text style={styles.subtitle}>Submissions ({submissions.length})</Text>
          {submissions.length === 0 && <Text style={styles.muted}>No work handed in yet.</Text>}
          {submissions.map((s) => <Review key={s.id} submission={s} onSaved={load} />)}
        </>
      )}

      {!isTeacher && (
        <>
          {mine?.status === 'reviewed' && (
            <View style={styles.feedback}>
              <Text style={styles.feedbackTitle}>Teacher feedback{mine.grade ? ` · ${mine.grade}` : ''}</Text>
              {!!mine.feedback && <Text style={styles.body}>{mine.feedback}</Text>}
            </View>
          )}
          {mine?.status === 'submitted' && <Text style={styles.waiting}>Handed in. Waiting for your teacher&apos;s review.</Text>}

          <TextInput value={content} onChangeText={setContent} multiline placeholder="Your answer" placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} />
          <TextInput value={link} onChangeText={setLink} autoCapitalize="none" placeholder="Link to your work (Google Doc, Drive, GitHub…), optional" placeholderTextColor={colors.textMuted} style={styles.input} />
          <Pressable style={[styles.button, working && styles.disabled]} disabled={working} onPress={() => run(() => submitAssignment(lessonId, content, link))}>
            {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mine ? 'Hand in again' : 'Hand in'}</Text>}
          </Pressable>
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.h2, fontSize: 17, flex: 1 },
  subtitle: { ...typography.body, fontWeight: '800', marginTop: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  muted: { ...typography.caption },
  link: { color: colors.primary, fontWeight: '700' },
  form: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.text },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  submission: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 6 },
  student: { ...typography.body, fontWeight: '700', fontSize: 14 },
  feedback: { backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm, gap: 4 },
  feedbackTitle: { ...typography.body, fontWeight: '800' },
  waiting: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  error: { ...typography.caption, color: colors.danger },
});
