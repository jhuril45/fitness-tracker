// Date helpers. Dates are stored as local calendar days in `YYYY-MM-DD` form so
// a workout checked off at 11pm still counts for that day.

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDayString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayString(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from `start` to `end` (both `YYYY-MM-DD`). */
export function daysBetween(start: string, end: string): number {
  // Use UTC so daylight-saving shifts don't produce fractional days.
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / MS_PER_DAY);
}

export function formatDay(day: string): string {
  return parseDayString(day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** 0 = Sunday … 6 = Saturday, matching `Date.getDay()`. */
export function weekdayOf(day: string): number {
  return parseDayString(day).getDay();
}
