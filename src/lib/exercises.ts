import { batch, type BatchOp, create, destroy, find, get, owned, pointer, type Pointer, UNSET, update } from './back4app';
import { toDayString } from './dates';
import type { WeightPeriod } from './weightHistory';

// Back4App classes:
//   Exercise      owner, workout, name, notes, usesWeight, unit, sets, reps, position
//                 One step of a workout, e.g. "Incline dumbbell press 3 × 12".
//                 position orders the exercises within the workout.
//   WeightPeriod  owner, workout, exercise, weight, startDate, endDate
//                 One row per weight an exercise has been done with. The current
//                 weight has no endDate; changing the weight closes it and opens
//                 a new row, so the full history (and the weeks spent at each
//                 weight) is kept.

export type WeightUnit = 'kg' | 'lb';

export type Exercise = {
  id: string;
  workoutId: string;
  name: string;
  notes: string;
  usesWeight: boolean;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
  position: number;
  /** Weight currently in use, or null for bodyweight/cardio exercises. */
  currentWeight: number | null;
  currentWeightSince: string | null;
};

export type ExerciseInput = {
  name: string;
  notes: string;
  usesWeight: boolean;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
};

export type NewExercise = ExerciseInput & { startingWeight: number | null };

export type WeightPeriodWithSessions = WeightPeriod & { sessions: number };

type ExerciseObject = {
  workout: Pointer;
  name: string;
  notes?: string;
  usesWeight: boolean;
  unit: WeightUnit;
  sets?: number | null;
  reps?: number | null;
  position: number;
};

type PeriodObject = { exercise: Pointer; weight: number; startDate: string; endDate?: string };

export function workoutPointer(workoutId: string): Pointer {
  return pointer('Workout', workoutId);
}

export function exercisePointer(exerciseId: string): Pointer {
  return pointer('Exercise', exerciseId);
}

function toExercise(row: ExerciseObject & { objectId: string }, current: PeriodObject | undefined): Exercise {
  return {
    id: row.objectId,
    workoutId: row.workout.objectId,
    name: row.name,
    notes: row.notes ?? '',
    usesWeight: row.usesWeight,
    unit: row.unit,
    sets: row.sets ?? null,
    reps: row.reps ?? null,
    position: row.position,
    currentWeight: row.usesWeight ? (current?.weight ?? null) : null,
    currentWeightSince: row.usesWeight ? (current?.startDate ?? null) : null,
  };
}

/**
 * Exercises matching `where`, in workout order, with their current weights.
 * `where` must only use fields that Exercise and WeightPeriod share (owner, workout).
 */
export async function findExercises(where: { owner?: Pointer; workout?: Pointer }): Promise<Exercise[]> {
  const [rows, open] = await Promise.all([
    find<ExerciseObject>('Exercise', where, { order: 'position,createdAt' }),
    find<PeriodObject>('WeightPeriod', { ...where, endDate: { $exists: false } }),
  ]);
  const current = new Map(open.map((p) => [p.exercise.objectId, p]));
  return rows.map((row) => toExercise(row, current.get(row.objectId)));
}

/** Groups exercises by the workout they belong to. */
export function byWorkout(exercises: Exercise[]): Map<string, Exercise[]> {
  const groups = new Map<string, Exercise[]>();
  for (const e of exercises) groups.set(e.workoutId, [...(groups.get(e.workoutId) ?? []), e]);
  return groups;
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  const [row, open] = await Promise.all([
    get<ExerciseObject>('Exercise', exerciseId),
    find<PeriodObject>('WeightPeriod', { exercise: exercisePointer(exerciseId), endDate: { $exists: false } }),
  ]);
  return row ? toExercise(row, open[0]) : null;
}

function exerciseFields(input: ExerciseInput) {
  return {
    name: input.name.trim(),
    notes: input.notes.trim(),
    usesWeight: input.usesWeight,
    unit: input.unit,
    sets: input.sets,
    reps: input.reps,
  };
}

/** Adds exercises to the end of a workout, with their starting weights. */
export async function addExercises(userId: string, workoutId: string, exercises: NewExercise[]): Promise<string[]> {
  const workout = workoutPointer(workoutId);
  const existing = await find<ExerciseObject>('Exercise', { workout }, { keys: 'position' });
  let position = Math.max(-1, ...existing.map((e) => e.position)) + 1;
  const ids: string[] = [];
  const periods: BatchOp[] = [];
  for (const input of exercises) {
    const id = await create('Exercise', { ...exerciseFields(input), workout, position: position++, ...owned(userId) });
    ids.push(id);
    if (input.usesWeight && input.startingWeight !== null) {
      periods.push({
        method: 'POST',
        path: '/classes/WeightPeriod',
        body: {
          workout,
          exercise: exercisePointer(id),
          weight: input.startingWeight,
          startDate: toDayString(),
          ...owned(userId),
        },
      });
    }
  }
  await batch(periods);
  return ids;
}

export async function updateExercise(exerciseId: string, input: ExerciseInput): Promise<void> {
  await update('Exercise', exerciseId, exerciseFields(input));
}

/** Deletes the exercise with its weight history and check-offs. */
export async function deleteExercise(exerciseId: string): Promise<void> {
  const where = { exercise: exercisePointer(exerciseId) };
  const related = await Promise.all(
    ['WeightPeriod', 'Completion'].map(async (className) =>
      (await find(className, where, { keys: 'objectId' })).map(
        (row): BatchOp => ({ method: 'DELETE', path: `/classes/${className}/${row.objectId}` }),
      ),
    ),
  );
  await batch(related.flat());
  await destroy('Exercise', exerciseId);
}

/** Saves a workout's exercise order, given every exercise id in the new order. One request. */
export async function saveExerciseOrder(ids: string[]): Promise<void> {
  await batch(ids.map((id, position) => ({ method: 'PUT', path: `/classes/Exercise/${id}`, body: { position } })));
}

/** Every weight this exercise has used, newest first, with sessions done at each. */
export async function getWeightHistory(exerciseId: string): Promise<WeightPeriodWithSessions[]> {
  const where = { exercise: exercisePointer(exerciseId) };
  const [periods, completions] = await Promise.all([
    find<PeriodObject>('WeightPeriod', where, { order: '-startDate,-createdAt' }),
    find<{ date: string }>('Completion', where, { keys: 'date' }),
  ]);
  return periods.map((p) => ({
    id: p.objectId,
    exerciseId,
    weight: p.weight,
    startDate: p.startDate,
    endDate: p.endDate ?? null,
    sessions: completions.filter((c) => c.date >= p.startDate && (!p.endDate || c.date < p.endDate)).length,
  }));
}

/**
 * Switch an exercise to a new weight. The current weight is closed off (its end
 * date set to `date`) and a new period starts, so the old weight and how long it
 * was used stay in the history. Changing it again on the same day corrects the
 * period that started today rather than creating a zero-length one.
 */
export async function changeWeight(
  userId: string,
  exercise: Pick<Exercise, 'id' | 'workoutId'>,
  weight: number,
  date: string = toDayString(),
): Promise<void> {
  const ref = exercisePointer(exercise.id);
  const [current] = await find<PeriodObject>('WeightPeriod', { exercise: ref, endDate: { $exists: false } });
  if (current?.weight === weight) return;

  if (current && current.startDate >= date) {
    // If the correction lands back on the previous weight, merge the periods.
    const [previous] = await find<PeriodObject>(
      'WeightPeriod',
      { exercise: ref, endDate: current.startDate },
      { order: '-createdAt', limit: 1 },
    );
    if (previous?.weight === weight) {
      await destroy('WeightPeriod', current.objectId);
      await update('WeightPeriod', previous.objectId, { endDate: UNSET });
    } else {
      await update('WeightPeriod', current.objectId, { weight });
    }
    return;
  }

  if (current) await update('WeightPeriod', current.objectId, { endDate: date });
  await create('WeightPeriod', {
    workout: workoutPointer(exercise.workoutId),
    exercise: ref,
    weight,
    startDate: date,
    ...owned(userId),
  });
}
