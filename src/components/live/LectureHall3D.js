import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

/*
 * Native stand-in for the 3D lecture hall (LectureHall3D.web.js).
 * Live audio currently runs on web; this keeps phone builds from bundling
 * three.js and shows who is on stage and in the audience.
 */
export default function LectureHall3D({ participants = [], speakingIds, title }) {
  const stage = participants.filter((p) => p.role !== 'listener');
  const audience = participants.filter((p) => p.role === 'listener');

  const Person = ({ person }) => (
    <View style={[styles.person, speakingIds?.has(person.user_id) && styles.speaking]}>
      <Text style={styles.initial}>{(person.name || '?').slice(0, 1).toUpperCase()}</Text>
      <Text style={styles.name} numberOfLines={1}>{(person.name || 'Member').split(' ')[0]}</Text>
    </View>
  );

  return (
    <View style={styles.hall}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.row}>{stage.map((p) => <Person key={p.user_id} person={p} />)}</View>
      <View style={[styles.row, styles.audience]}>{audience.map((p) => <Person key={p.user_id} person={p} />)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hall: { flex: 1, backgroundColor: '#14182b', borderRadius: radius.lg, padding: spacing.md },
  title: { ...typography.h2, fontSize: 16, textAlign: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  audience: { marginTop: spacing.lg },
  person: { alignItems: 'center', width: 64 },
  speaking: { opacity: 1 },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, color: '#fff', textAlign: 'center', lineHeight: 44, fontWeight: '700' },
  name: { ...typography.caption, marginTop: 4 },
});
