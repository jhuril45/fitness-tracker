import {
  batch,
  type BatchOp,
  count,
  create,
  find,
  destroy,
  owned,
  pointer,
  type Pointer,
  userPointer,
} from './back4app';
import { weekdayOf } from './dates';
import { byWorkout, type Exercise, exercisePointer, findExercises, workoutPointer } from './exercises';
import type { WorkoutObject } from './workouts';

// Back4App classes:
//   ScheduleItem  owner, workout, dayOfWeek, position
//                 A workout planned on a weekday (0 = Sunday … 6 = Saturday).
//                 "Every day" is stored as seven rows. position orders the
//                 workouts within a day.
//   Completion    owner, scheduleItem, workout, exercise, date, weight
//                 One exercise of a planned workout checked off on a date, with
//                 the weight used. Removing the plan entry keeps the completion,
//                 so the session still counts in the exercise's history.

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
  /** The Completion rows behind `done`, so unchecking can delete them directly. */
  completionIds: string[];
};

export type PlannedWorkout = Omit<ScheduleItem, 'exercises'> & { exercises: PlannedExercise[] };

type ScheduleObject = {
  workout: Pointer & Partial<WorkoutObject>;
  dayOfWeek: number;
  position: number;
};

type CompletionObject = { scheduleItem?: Pointer; exercise: Pointer; date: string; weight?: number | null };

function schedulePointer(itemId: string): Pointer {
  return pointer('ScheduleItem', itemId);
}

/** The user's plan entries (optionally for one weekday), in order, with their exercises. */
async function loadItems(userId: string, dayOfWeek?: number): Promise<ScheduleItem[]> {
  const owner = userPointer(userId);
  const where: Record<string, unknown> = { owner };
  if (dayOfWeek !== undefined) where.dayOfWeek = dayOfWeek;
  const [rows, exercises] = await Promise.all([
    find<ScheduleObject>('ScheduleItem', where, { include: 'workout', order: 'dayOfWeek,position,createdAt' }),
    findExercises({ owner }),
  ]);
  const grouped = byWorkout(exercises);
  return (
    rows
      // Skip entries whose workout no longer exists.
      .filter((row) => row.workout.name !== undefined)
      .map((row) => ({
        id: row.objectId,
        workoutId: row.workout.objectId,
        workoutName: row.workout.name!,
        dayOfWeek: row.dayOfWeek,
        position: row.position,
        exercises: grouped.get(row.workout.objectId) ?? [],
      }))
  );
}

/** The whole weekly plan, grouped by weekday (index 0 = Sunday). */
export async function getWeeklySchedule(userId: string): Promise<ScheduleItem[][]> {
  const week: ScheduleItem[][] = [[], [], [], [], [], [], []];
  for (const item of await loadItems(userId)) week[item.dayOfWeek].push(item);
  return week;
}

/** Workouts planned for a date, in order, with which exercises were done that day. */
export async function getDayPlan(userId: string, date: string): Promise<PlannedWorkout[]> {
  const [items, completions] = await Promise.all([
    loadItems(userId, weekdayOf(date)),
    find<CompletionObject>('Completion', { owner: userPointer(userId), date }),
  ]);
  const done = new Map<string, (CompletionObject & { objectId: string })[]>();
  for (const c of completions) {
    if (!c.scheduleItem) continue;
    const key = `${c.scheduleItem.objectId}:${c.exercise.objectId}`;
    done.set(key, [...(done.get(key) ?? []), c]);
  }
  return items.map((item) => ({
    ...item,
    exercises: item.exercises.map((exercise) => {
      const rows = done.get(`${item.id}:${exercise.id}`) ?? [];
      return {
        ...exercise,
        done: rows.length > 0,
        doneWeight: rows[0]?.weight ?? null,
        completionIds: rows.map((r) => r.objectId),
      };
    }),
  }));
}

/**
 * Plan workouts on the given weekdays, after whatever each day already has, in
 * the order given. A workout already on a day is skipped for that day.
 */
export async function addToSchedule(userId: string, workoutIds: string[], days: number[]): Promise<void> {
  const existing = await find<ScheduleObject>(
    'ScheduleItem',
    { owner: userPointer(userId), dayOfWeek: { $in: days } },
    { keys: 'workout,dayOfWeek,position' },
  );
  const ops: BatchOp[] = [];
  for (const day of days) {
    const onDay = existing.filter((row) => row.dayOfWeek === day);
    const planned = new Set(onDay.map((row) => row.workout.objectId));
    let position = Math.max(-1, ...onDay.map((row) => row.position)) + 1;
    for (const workoutId of workoutIds) {
      if (planned.has(workoutId)) continue;
      ops.push({
        method: 'POST',
        path: '/classes/ScheduleItem',
        body: { workout: workoutPointer(workoutId), dayOfWeek: day, position: position++, ...owned(userId) },
      });
    }
  }
  await batch(ops);
}

/** For each weekday (index 0 = Sunday), the ids of the workouts planned on it. */
export async function getPlannedWorkoutIds(userId: string): Promise<Set<string>[]> {
  const rows = await find<ScheduleObject>('ScheduleItem', { owner: userPointer(userId) }, { keys: 'workout,dayOfWeek' });
  const week = Array.from({ length: 7 }, () => new Set<string>());
  for (const row of rows) week[row.dayOfWeek].add(row.workout.objectId);
  return week;
}

export async function removeFromSchedule(itemId: string): Promise<void> {
  await destroy('ScheduleItem', itemId);
}

/** Saves the order of a day's workouts, given every plan entry id in the new order. One request. */
export async function saveScheduleOrder(itemIds: string[]): Promise<void> {
  await batch(
    itemIds.map((id, position) => ({ method: 'PUT', path: `/classes/ScheduleItem/${id}`, body: { position } })),
  );
}

/**
 * Check an exercise of a planned workout off for a date, recording the weight
 * used. One request; returns the new Completion's id.
 */
export async function markDone(userId: string, itemId: string, exercise: Exercise, date: string): Promise<string> {
  return create('Completion', {
    scheduleItem: schedulePointer(itemId),
    exercise: exercisePointer(exercise.id),
    workout: workoutPointer(exercise.workoutId),
    date,
    weight: exercise.currentWeight,
    ...owned(userId),
  });
}

/** Uncheck an exercise by deleting the completions loaded with the day's plan. One request. */
export async function markNotDone(exercise: PlannedExercise): Promise<void> {
  await batch(exercise.completionIds.map((id) => ({ method: 'DELETE', path: `/classes/Completion/${id}` })));
}

/** How many exercises the user has checked off, ever. */
export async function countCompletions(userId: string): Promise<number> {
  return count('Completion', { owner: userPointer(userId) });
}
