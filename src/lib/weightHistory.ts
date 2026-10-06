import { daysBetween } from './dates';

export type WeightPeriod = {
  id: string;
  exerciseId: string;
  weight: number;
  startDate: string;
  /** `null` while this is the weight currently in use. */
  endDate: string | null;
};

export type WeightPeriodSummary = WeightPeriod & {
  isCurrent: boolean;
  days: number;
  weeks: number;
  /** Human readable duration, e.g. "3 weeks, 2 days". */
  durationLabel: string;
};

export function summarizePeriod(period: WeightPeriod, today: string): WeightPeriodSummary {
  const end = period.endDate ?? today;
  const days = Math.max(0, daysBetween(period.startDate, end));
  return {
    ...period,
    isCurrent: period.endDate === null,
    days,
    weeks: Math.floor(days / 7),
    durationLabel: formatDuration(days),
  };
}

export function formatDuration(days: number): string {
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`);
  if (rest > 0 || weeks === 0) parts.push(`${rest} day${rest === 1 ? '' : 's'}`);
  return parts.join(', ');
}
