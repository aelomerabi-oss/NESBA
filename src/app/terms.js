import LegalPage from '../components/LegalPage';
import { LEGAL } from '../constants/legal';

const sections = [
  {
    heading: 'Using NESBA',
    body: [
      `These terms are an agreement between you and ${LEGAL.operator}. By creating an account or using NESBA you accept them.`,
      `You must be at least ${LEGAL.minimumAge} years old to use NESBA. Keep your password safe; you are responsible for activity on your account.`,
    ],
  },
  {
    heading: 'Your content',
    body: [
      'You own what you post, upload or teach. You give NESBA permission to store, display and share it on the platform so the features work, for example showing your post to other users or a course to its learners.',
      'Only post content you have the right to share.',
    ],
  },
  {
    heading: 'Rules',
    body: [
      'Do not harass, threaten or impersonate anyone, or post hateful, sexual, violent or illegal content.',
      'Do not spam, scam, or try to access accounts or data that are not yours, or interfere with how the platform works.',
      'Hosts of live sessions are responsible for keeping their session respectful and may mute or remove participants.',
    ],
  },
  {
    heading: 'Teachers and organizations',
    body: 'Teacher and organization accounts require approval by NESBA. Course creators are responsible for the accuracy of their courses. NESBA may decline or remove a creator role.',
  },
  {
    heading: 'Certificates',
    body: 'Certificates show that you completed a course on NESBA. They are not a formal academic qualification unless the course says otherwise.',
  },
  {
    heading: 'Enforcement',
    body: 'We may remove content or suspend accounts that break these terms. You can stop using NESBA and ask us to delete your account at any time.',
  },
  {
    heading: 'No warranty',
    body: 'NESBA is provided as it is, without guarantees that it will always be available or error-free. Course content is for education and is not professional legal, financial or business advice. To the extent the law allows, NESBA is not liable for indirect losses from using the platform.',
  },
  {
    heading: 'Changes and contact',
    body: [
      'If we change these terms we will update the date at the top of this page. Continuing to use NESBA after a change means you accept it.',
      `These terms are governed by the laws of ${LEGAL.governingCountry}. Questions: ${LEGAL.contactEmail}.`,
    ],
  },
];

export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="Please read these terms before using NESBA."
      sections={sections}
    />
  );
}
