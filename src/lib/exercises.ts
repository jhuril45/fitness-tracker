import { callFunction } from './back4app';
import { toDayString } from './dates';
import type { WeightPeriod } from './weightHistory';

// Exercises are the steps of a workout, e.g. "Incline dumbbell press 3 × 12".
// Each one keeps its own weight history. The data lives on Back4App and is
// read and written through the Cloud Code functions in `cloud/main.js`.

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

/** Adds exercises to the end of a workout, with their starting weights. */
export async function addExercises(workoutId: string, exercises: NewExercise[]): Promise<string[]> {
  const { ids } = await callFunction<{ ids: string[] }>('addExercises', { workoutId, exercises, today: toDayString() });
  return ids;
}

/** The exercise, or null if it was deleted, with every weight it has used, newest first. */
export function getExerciseDetail(
  exerciseId: string,
): Promise<{ exercise: Exercise | null; history: WeightPeriodWithSessions[] }> {
  return callFunction('getExerciseDetail', { exerciseId });
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  return (await getExerciseDetail(exerciseId)).exercise;
}

export async function updateExercise(exerciseId: string, exercise: ExerciseInput): Promise<void> {
  await callFunction('updateExercise', { exerciseId, exercise });
}

/** Deletes the exercise with its weight history and check-offs. */
export async function deleteExercise(exerciseId: string): Promise<void> {
  await callFunction('deleteExercise', { exerciseId });
}

/** Saves a workout's exercise order, given every exercise id in the new order. */
export async function saveExerciseOrder(ids: string[]): Promise<void> {
  await callFunction('saveExerciseOrder', { ids });
}

/**
 * Switches an exercise to a new weight. The old weight stays in the history
 * with the dates it was used; changing it twice on one day corrects that day's.
 */
export async function changeWeight(exerciseId: string, weight: number, date: string = toDayString()): Promise<void> {
  await callFunction('changeWeight', { exerciseId, weight, date });
}
