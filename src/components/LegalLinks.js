import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

// "By continuing you agree to..." line with links to the legal pages.
export default function LegalLinks({ action = 'continuing' }) {
  return (
    <Text style={styles.text}>
      By {action}, you agree to the{' '}
      <Link href="/terms" style={styles.link}>
        Terms of Use
      </Link>{' '}
      and{' '}
      <Link href="/privacy" style={styles.link}>
        Privacy Policy
      </Link>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.md,
  },
  link: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
});
