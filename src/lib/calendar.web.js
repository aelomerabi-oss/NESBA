// Calendar dates in UTC, e.g. 20261019T180000Z.
function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Commas, semicolons and backslashes must be escaped in calendar text.
function icsText(value) {
  return String(value || '').replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

/**
 * Download an .ics file. Opening it adds the event to Google Calendar,
 * Outlook or Apple Calendar.
 */
export async function addToCalendar({ title, startsAt, endsAt, notes, url }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NESBA//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@nesba`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(startsAt)}`,
    `DTEND:${icsDate(endsAt)}`,
    `SUMMARY:${icsText(title)}`,
    notes ? `DESCRIPTION:${icsText(notes)}` : null,
    url ? `URL:${url}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'nesba-event'}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
