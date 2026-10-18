export const courses = [
  {
    id: 'c1',
    title: 'Intro to Business Analytics',
    teacher: 'Dr. Amina Khalid',
    category: 'Business',
    lessons: 12,
    duration: '4h 30m',
    isPremium: false,
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
  },
  {
    id: 'c2',
    title: 'Advanced Financial Modeling',
    teacher: 'James Otieno',
    category: 'Finance',
    lessons: 20,
    duration: '8h 10m',
    isPremium: true,
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
  },
  {
    id: 'c3',
    title: 'Public Speaking Foundations',
    teacher: 'Sara Lindqvist',
    category: 'Soft Skills',
    lessons: 8,
    duration: '2h 45m',
    isPremium: false,
    thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400',
  },
  {
    id: 'c4',
    title: 'Data Structures & Algorithms',
    teacher: 'Wei Zhang',
    category: 'Computer Science',
    lessons: 30,
    duration: '15h 00m',
    isPremium: true,
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400',
  },
  {
    id: 'c5',
    title: 'UX Research Basics',
    teacher: 'Priya Nair',
    category: 'Design',
    lessons: 10,
    duration: '3h 20m',
    isPremium: false,
    thumbnail: 'https://images.unsplash.com/photo-1509966756634-9c23dd6e6815?w=400',
  },
];

export const liveRooms = [
  {
    id: 'r1',
    title: 'Weekly Career Q&A',
    host: 'Dr. Amina Khalid',
    listeners: 42,
    type: 'audio',
    isLive: true,
    isPremium: false,
  },
  {
    id: 'r2',
    title: 'Live Class: Financial Modeling Deep Dive',
    host: 'James Otieno',
    listeners: 18,
    type: 'video',
    isLive: true,
    isPremium: true,
  },
  {
    id: 'r3',
    title: 'Student Study Room: Algorithms',
    host: 'Wei Zhang',
    listeners: 9,
    type: 'audio',
    isLive: false,
    isPremium: false,
  },
];

export const courseDetails = {
  c1: {
    description:
      'Learn the fundamentals of business analytics, from reading dashboards to making data-driven decisions in real organizations.',
    modules: [
      { id: 'm1', title: 'What is Business Analytics?', duration: '18m', locked: false },
      { id: 'm2', title: 'Reading Your First Dashboard', duration: '22m', locked: false },
      { id: 'm3', title: 'Descriptive vs Predictive Analytics', duration: '25m', locked: false },
    ],
  },
  c2: {
    description:
      'A deep dive into building financial models used by analysts and investors, including forecasting, valuation, and scenario planning.',
    modules: [
      { id: 'm1', title: 'Model Structure Fundamentals', duration: '30m', locked: false },
      { id: 'm2', title: 'Building a 3-Statement Model', duration: '45m', locked: true },
      { id: 'm3', title: 'DCF Valuation in Practice', duration: '40m', locked: true },
    ],
  },
};
