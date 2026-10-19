import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { LEGAL } from '../constants/legal';

// Answers describe how the platform works today; keep them in step with the Terms.
const GROUPS = [
  {
    title: 'Getting started',
    items: [
      ['What is NESBA?', "NESBA is a learning platform for entrepreneurs, starters and zzp'ers. You learn from people who have built a business: practical courses with quizzes and assignments, live classes in a 3D lecture hall, workshops, 1-to-1 mentoring and team projects that end in a certificate."],
      ['Is NESBA free?', 'Creating an account is free, and many courses, live classes and project groups are free. Some courses, workshops and 1-to-1 sessions are paid; the price is always shown before you buy.'],
      ['Can I use NESBA on my phone?', 'Yes. NESBA works in any browser on your phone, tablet or computer, and has an app for iPhone and Android.'],
      ['Do I get a certificate?', 'Yes. You get a certificate when you complete a course, and when your project team finishes a practical project. Certificates show what you did on NESBA; they are not a formal diploma unless the course says so.'],
    ],
  },
  {
    title: 'Payments and refunds',
    items: [
      ['How do I pay?', 'Payments go through Stripe, a secure payment provider. You can pay by card and, where available, with iDEAL and other local methods. NESBA never sees or stores your card details.'],
      ['Why do I pay on the website and not in the app?', 'Purchases are made on the NESBA website. In the app, the Buy button opens the website. This keeps prices lower, because app stores charge up to 30% on purchases.'],
      ['Can I get a refund?', `If something is wrong with a purchase, contact us at ${LEGAL.contactEmail} and we will look at a refund. Under EU law you can cancel an online purchase within 14 days, but that right ends once you start a paid course or your session or workshop has taken place.`],
      ['What if a workshop or session is cancelled?', 'If the host cancels, you get your money back. Contact us if you have not received it within a few days.'],
      ['Do you have discount codes?', 'Teachers can create discount codes for their courses. Enter the code on the course page before you pay.'],
    ],
  },
  {
    title: 'Live classes and workshops',
    items: [
      ['How do I join a live class?', 'Register or buy a ticket on the event page. When the host starts, you get a notification. Open Live and tap Join. You can add the session to your calendar.'],
      ['Can I speak during a live class?', 'Everyone joins as a listener. Tap Raise hand to ask to speak. When the host lets you talk, you can also turn on your camera.'],
      ['Are live classes recorded?', 'Hosts can record a session. You find recordings under Recordings. Recordings of paid workshops are only for people with a ticket.'],
    ],
  },
  {
    title: "For teachers and zzp'ers",
    items: [
      ['How do I become a teacher?', 'Sign up as a teacher or mentor and tell us about your experience. NESBA reviews every request before you can publish courses or host paid events.'],
      ['What can I sell?', 'Courses, 1-to-1 sessions and single workshops or masterclasses. You do not need a full course: one paid masterclass is a good way to start.'],
      ['How much do I earn?', 'You keep 80% of every sale. NESBA keeps 20%, which covers the platform, payments, the live hall, recordings and support.'],
      ['How do I get paid?', 'Connect your bank account through Stripe in Creator Studio > Payouts. Stripe pays your share straight to your bank account.'],
      ['How do I fill my workshop?', 'After you schedule it, you get a link to share on Instagram, LinkedIn or WhatsApp. People open it, create a free account, pay and get their seat.'],
    ],
  },
  {
    title: 'Account and privacy',
    items: [
      ['Who can see my profile?', 'Your name, photo and public posts are visible to other members. Messages are private between you and the other person.'],
      ['Does NESBA use tracking cookies?', 'No. NESBA only stores what is needed to keep you logged in. We do not use advertising or tracking cookies.'],
      ['How do I delete my account?', `Contact us at ${LEGAL.contactEmail} and we will delete your account and data.`],
    ],
  },
];

function Question({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.item}>
      <Pressable
        style={styles.question}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.questionText}>{question}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open && <Text style={styles.answer}>{answer}</Text>}
    </View>
  );
}

export default function FaqScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.inner}>
        <Text style={styles.title} accessibilityRole="header">Frequently asked questions</Text>
        <Text style={styles.intro}>How NESBA works for learners, teachers and zzp'ers.</Text>

        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle} accessibilityRole="header">{group.title}</Text>
            {group.items.map(([question, answer]) => (
              <Question key={question} question={question} answer={answer} />
            ))}
          </View>
        ))}

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Still have a question?</Text>
          <Text style={styles.answer}>Email us at {LEGAL.contactEmail} or send feedback from your profile.</Text>
          <View style={styles.links}>
            <Pressable onPress={() => router.push('/terms')} accessibilityRole="link"><Text style={styles.link}>Terms of Use</Text></Pressable>
            <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link"><Text style={styles.link}>Privacy Policy</Text></Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { ...typography.h1 },
  intro: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  group: { marginTop: spacing.lg },
  groupTitle: { ...typography.h2, fontSize: 18, marginBottom: spacing.sm },
  item: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden' },
  question: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  questionText: { ...typography.body, fontWeight: '700', flex: 1 },
  answer: { ...typography.body, color: colors.textSecondary, lineHeight: 22, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  contact: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, gap: spacing.xs },
  contactTitle: { ...typography.body, fontWeight: '800', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  links: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  link: { color: colors.primary, fontWeight: '800' },
});
