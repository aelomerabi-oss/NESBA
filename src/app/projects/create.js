import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { createProject } from '../../lib/projects';

const TEAM_SIZES = [2, 3, 4, 5, 6, 8, 10];

export default function CreateProjectScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);
  const [courseId, setCourseId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Offer the courses this learner is enrolled in as the project's topic.
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('enrollments')
      .select('course:courses(id,title)')
      .eq('user_id', userId)
      .then(({ data }) => setCourses((data || []).map((row) => row.course).filter(Boolean)));
  }, [userId]);

  if (!userId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.label}>Log in to start a project.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  const save = async () => {
    if (name.trim().length < 3) {
      setError('Give your project a name of at least 3 characters.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const skills = [...new Set(skillsText.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 10);
      const project = await createProject({ ownerId: userId, name, description, courseId, skills, maxMembers });
      router.replace(`/projects/${project.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <Text style={styles.label}>Project name *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder="e.g. Budget tracker app for small shops"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>What will you build?</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        placeholder="The goal, what you have learned that you will use, and who you are looking for."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.textArea]}
      />

      <Text style={styles.label}>Skills needed</Text>
      <TextInput
        value={skillsText}
        onChangeText={setSkillsText}
        placeholder="Separate with commas: Excel, Marketing, Design"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      {courses.length > 0 && (
        <>
          <Text style={styles.label}>Based on a course (optional)</Text>
          <View style={styles.options}>
            {courses.map((course) => (
              <Pressable
                key={course.id}
                onPress={() => setCourseId(courseId === course.id ? null : course.id)}
                style={[styles.option, courseId === course.id && styles.optionSelected]}
              >
                <Text style={[styles.optionText, courseId === course.id && styles.optionTextSelected]}>{course.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Team size</Text>
      <View style={styles.options}>
        {TEAM_SIZES.map((size) => (
          <Pressable key={size} onPress={() => setMaxMembers(size)} style={[styles.option, maxMembers === size && styles.optionSelected]}>
            <Text style={[styles.optionText, maxMembers === size && styles.optionTextSelected]}>{size}</Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create project</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  label: { ...typography.body, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.text, fontSize: 15 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.caption, fontWeight: '700' },
  optionTextSelected: { color: '#fff' },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
