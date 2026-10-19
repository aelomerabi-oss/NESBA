import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';
import {
  addQuizQuestion,
  deleteQuizQuestion,
  getAnswerKeys,
  getBestAttempt,
  getQuiz,
  submitQuiz,
} from '../lib/lesson-activities';

const EMPTY_OPTIONS = ['', '', '', ''];

/*
 * Multiple-choice quiz under a lesson. Learners answer and get graded by the
 * database; the course teacher adds and removes questions here too.
 */
export default function LessonQuiz({ lessonId, userId, isTeacher }) {
  const [questions, setQuestions] = useState([]);
  const [keys, setKeys] = useState({});
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  // Teacher's new-question form.
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [correct, setCorrect] = useState(0);

  const load = useCallback(async () => {
    try {
      const rows = await getQuiz(lessonId);
      setQuestions(rows);
      if (isTeacher) setKeys(await getAnswerKeys(rows.map((q) => q.id)));
      else if (userId) setBest(await getBestAttempt(lessonId, userId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lessonId, userId, isTeacher]);

  useEffect(() => { load(); }, [load]);

  const run = async (action) => {
    try {
      setWorking(true);
      setError('');
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const addQuestion = () => run(async () => {
    const filled = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3) throw new Error('Write the question.');
    if (filled.length < 2) throw new Error('Add at least two answers.');
    if (!options[correct]?.trim()) throw new Error('Mark which answer is correct.');

    // Indexes shift when empty options are dropped.
    const correctIndex = filled.indexOf(options[correct].trim());
    await addQuizQuestion(lessonId, question, filled, correctIndex);

    setQuestion('');
    setOptions(EMPTY_OPTIONS);
    setCorrect(0);
    setEditing(false);
    await load();
  });

  const submit = () => run(async () => {
    const graded = await submitQuiz(lessonId, answers);
    setResult(graded);
    setBest((current) => (!current || graded.score > current.score ? graded : current));
  });

  if (loading) return null;
  if (!isTeacher && questions.length === 0) return null;

  const resultsById = Object.fromEntries((result?.results || []).map((r) => [r.question_id, r]));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.title}>Quiz</Text>
        {!!best && !isTeacher && (
          <Text style={styles.best}>Best: {best.score}/{best.total}</Text>
        )}
      </View>

      {isTeacher && questions.length === 0 && !editing && (
        <Text style={styles.muted}>Add questions to check what learners understood.</Text>
      )}

      {questions.map((q, qi) => {
        const graded = resultsById[q.id];
        return (
          <View key={q.id} style={styles.question}>
            <View style={styles.questionRow}>
              <Text style={styles.questionText}>{qi + 1}. {q.question}</Text>
              {isTeacher && (
                <Pressable hitSlop={8} disabled={working} onPress={() => run(async () => { await deleteQuizQuestion(q.id); await load(); })}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {q.options.map((option, oi) => {
              const chosen = answers[q.id] === oi;
              const isRight = isTeacher ? keys[q.id] === oi : graded?.correct_index === oi;
              const isWrongChoice = graded && graded.chosen === oi && !isRight;

              return (
                <Pressable
                  key={oi}
                  disabled={isTeacher || !!result}
                  onPress={() => setAnswers((current) => ({ ...current, [q.id]: oi }))}
                  style={[
                    styles.option,
                    chosen && !result && styles.optionChosen,
                    (isTeacher || result) && isRight && styles.optionRight,
                    isWrongChoice && styles.optionWrong,
                  ]}
                >
                  <Ionicons
                    name={chosen || ((isTeacher || result) && isRight) ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isWrongChoice ? colors.danger : (isTeacher || result) && isRight ? colors.success : colors.primary}
                  />
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      {!isTeacher && questions.length > 0 && (
        result ? (
          <View style={styles.resultRow}>
            <Text style={styles.score}>
              {result.score === result.total ? '🎉 ' : ''}You scored {result.score}/{result.total}
            </Text>
            <Pressable onPress={() => { setResult(null); setAnswers({}); }}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.button, (working || Object.keys(answers).length < questions.length) && styles.disabled]}
            disabled={working || Object.keys(answers).length < questions.length}
            onPress={submit}
          >
            {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check my answers</Text>}
          </Pressable>
        )
      )}

      {isTeacher && (editing ? (
        <View style={styles.form}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Question"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {options.map((option, i) => (
            <View key={i} style={styles.optionEdit}>
              <Pressable onPress={() => setCorrect(i)} hitSlop={6}>
                <Ionicons name={correct === i ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={correct === i ? colors.success : colors.textMuted} />
              </Pressable>
              <TextInput
                value={option}
                onChangeText={(text) => setOptions((current) => current.map((o, j) => (j === i ? text : o)))}
                placeholder={`Answer ${i + 1}${i > 1 ? ' (optional)' : ''}`}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { flex: 1 }]}
              />
            </View>
          ))}
          <Text style={styles.muted}>Tap the circle next to the correct answer.</Text>
          <View style={styles.formActions}>
            <Pressable style={[styles.button, working && styles.disabled]} disabled={working} onPress={addQuestion}>
              <Text style={styles.buttonText}>Add question</Text>
            </Pressable>
            <Pressable onPress={() => setEditing(false)}>
              <Text style={styles.muted}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.link}>+ Add a question</Text>
        </Pressable>
      ))}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.h2, fontSize: 17, flex: 1 },
  best: { ...typography.caption, color: colors.success, fontWeight: '800' },
  muted: { ...typography.caption },
  question: { gap: 6, marginTop: 4 },
  questionRow: { flexDirection: 'row', gap: 8 },
  questionText: { ...typography.body, fontWeight: '700', flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10 },
  optionChosen: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionRight: { borderColor: colors.success },
  optionWrong: { borderColor: colors.danger },
  optionText: { ...typography.body, fontSize: 14, flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { ...typography.body, fontWeight: '800' },
  link: { color: colors.primary, fontWeight: '700' },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  form: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, color: colors.text },
  optionEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  error: { ...typography.caption, color: colors.danger },
});
