import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { LEGAL } from '../constants/legal';

/*
 * Renders a legal document given as sections of { heading, body }, where
 * body is a paragraph string or a list of paragraphs.
 */
export default function LegalPage({ title, intro, sections }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Last updated: {LEGAL.lastUpdated}</Text>

        {!!intro && <Text style={styles.paragraph}>{intro}</Text>}

        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>

            {[].concat(section.body).map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { ...typography.h1 },
  updated: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.md },
  section: { marginTop: spacing.lg },
  heading: { ...typography.h2, fontSize: 18, marginBottom: spacing.sm },
  paragraph: { ...typography.body, lineHeight: 23, color: colors.textMuted, marginBottom: spacing.sm },
});
