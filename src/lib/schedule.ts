import { callFunction } from './back4app';
import type { Exercise } from './exercises';
import type { Workout } from './workouts';

// The weekly plan: workouts placed on weekdays (0 = Sunday … 6 = Saturday),
// and the exercises checked off each day. Read and written through the Cloud
// Code functions in `cloud/main.js`.

export type ScheduleItem = {
  id: string;
  workoutId: string;
  workoutName: string;
  dayOfWeek: number;
  position: number;
  exercises: Exercise[];
};

export type PlannedExercise = Exercise & {
  done: boolean;
  /** Weight recorded when it was checked off. */
  doneWeight: number | null;
  /** The check-off records behind `done`, so unchecking can delete them directly. */
  completionIds: string[];
};

export type PlannedWorkout = Omit<ScheduleItem, 'exercises'> & { exercises: PlannedExercise[] };

/** The whole weekly plan, grouped by weekday (index 0 = Sunday). */
export function getWeeklySchedule(): Promise<ScheduleItem[][]> {
  return callFunction('getWeeklySchedule');
}

/** Workouts planned for a date (YYYY-MM-DD), in order, with which exercises were done that day. */
export function getDayPlan(date: string): Promise<PlannedWorkout[]> {
  return callFunction('getDayPlan', { date });
}

/** The workouts to pick from, and for each weekday the ids of the workouts already on it. */
export async function getScheduleOptions(): Promise<{ workouts: Workout[]; planned: Set<string>[] }> {
  const { workouts, planned } = await callFunction<{ workouts: Workout[]; planned: string[][] }>('getScheduleOptions');
  return { workouts, planned: planned.map((ids) => new Set(ids)) };
}

/**
 * Plans workouts on the given weekdays, after whatever each day already has,
 * in the order given. A workout already on a day is skipped for that day.
 */
export async function addToSchedule(workoutIds: string[], days: number[]): Promise<void> {
  await callFunction('addToSchedule', { workoutIds, days });
}

export async function removeFromSchedule(itemId: string): Promise<void> {
  await callFunction('removeFromSchedule', { itemId });
}

/** Saves the order of a day's workouts, given every plan entry id in the new order. */
export async function saveScheduleOrder(itemIds: string[]): Promise<void> {
  await callFunction('saveScheduleOrder', { itemIds });
}

/** Checks an exercise of a planned workout off for a date; returns the record and the weight used. */
export function markDone(
  itemId: string,
  exerciseId: string,
  date: string,
): Promise<{ completionId: string; weight: number | null }> {
  return callFunction('markDone', { itemId, exerciseId, date });
}

/**
 * Unchecks an exercise for a date. Sends the known check-off ids and the
 * entry/exercise/date, so the server also finds check-offs saved while offline.
 */
export async function markNotDone(
  itemId: string,
  exerciseId: string,
  date: string,
  completionIds: string[] = [],
): Promise<void> {
  await callFunction('markNotDone', { completionIds, itemId, exerciseId, date });
}
