import LegalPage from '../components/LegalPage';
import { LEGAL } from '../constants/legal';

const sections = [
  {
    heading: 'Who we are',
    body: `${LEGAL.operator} runs this platform. If you have any question about your data, contact us at ${LEGAL.contactEmail}.`,
  },
  {
    heading: 'What we collect',
    body: [
      'Account details: your name, email address and password (stored only in encrypted form), and your role (student, teacher or organization). If you sign in with Google or Apple, we receive your name and email address from them.',
      'Profile details you choose to add: photo, bio, goals, expertise and experience. Organization applications also include the organization name, type, website, location, contact email and description.',
      'Content you create: posts, comments, stories, likes, follows, course reviews, feedback, and the courses, lessons and files teachers upload.',
      'Messages: direct messages and their attachments, and chat messages in live sessions.',
      'Learning activity: enrollments, lesson progress, certificates and badges.',
      'Live sessions: when you speak or share your screen, your audio and screen are streamed live to the other participants. We record who joined a session and their role in it.',
    ],
  },
  {
    heading: 'How we use it',
    body: [
      'To run your account and the features you use: showing courses and your progress, issuing certificates, delivering messages and notifications, and hosting live sessions.',
      'To review requests to become a teacher or organization, keep the platform safe, and respond to feedback.',
      'We do not sell your personal data and we do not show advertising.',
    ],
  },
  {
    heading: 'What other people can see',
    body: [
      'Your name, photo, bio and role are visible to other users, as are your posts, comments, stories and public course reviews.',
      'Direct messages are visible only to you and the person you are talking to. Live session chat is visible to everyone in that session.',
      'Certificates can be verified by anyone who has the certificate ID.',
    ],
  },
  {
    heading: 'Who processes your data for us',
    body: [
      'Supabase stores our database, files and sign-in information.',
      'LiveKit carries live session audio, video and screen sharing.',
      'Stripe processes payments for premium courses and private sessions, and pays out teachers and organizations. Your card or bank details go directly to Stripe; NESBA never sees or stores them.',
      'Google and Apple handle sign-in if you choose those options.',
      'These providers process data only to provide their service to us.',
    ],
  },
  {
    heading: 'Storage in your browser',
    body: 'We keep your sign-in session in your browser’s local storage so you stay logged in. We do not use advertising or tracking cookies.',
  },
  {
    heading: 'How long we keep it',
    body: 'We keep your data while your account exists. When you ask us to delete your account, we delete your profile and content, except where we must keep something to meet a legal obligation.',
  },
  {
    heading: 'Your rights',
    body: `You can see and edit most of your information in your profile. To get a copy of your data, correct it, or delete your account, email ${LEGAL.contactEmail}. Depending on where you live, you may also have the right to object to how we use your data and to complain to your data protection authority.`,
  },
  {
    heading: 'Children',
    body: `NESBA is not intended for children under ${LEGAL.minimumAge}. If you believe a child under ${LEGAL.minimumAge} has created an account, contact us and we will delete it.`,
  },
  {
    heading: 'Changes',
    body: 'If we change this policy we will update the date at the top of this page, and tell you in the app if the change is significant.',
  },
];

export default function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what personal data NESBA collects, why, and the choices you have."
      sections={sections}
    />
  );
}
