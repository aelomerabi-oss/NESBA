import * as Calendar from 'expo-calendar';

/**
 * Open the phone's own "new event" screen, filled in. The user saves it to
 * whichever calendar they like, so no calendar permission is needed.
 */
export async function addToCalendar({ title, startsAt, endsAt, notes, url }) {
  await Calendar.createEventInCalendarAsync({
    title,
    startDate: new Date(startsAt),
    endDate: new Date(endsAt),
    notes: [notes, url].filter(Boolean).join('\n\n'),
    url,
  });
}
