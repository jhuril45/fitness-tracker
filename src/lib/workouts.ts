import { callFunction } from './back4app';
import { toDayString } from './dates';
import type { Exercise, NewExercise } from './exercises';

// A workout is a named routine such as "Chest day" made of ordered exercises.
// Read and written through the Cloud Code functions in `cloud/main.js`.

export type Workout = {
  id: string;
  name: string;
  notes: string;
  /** In the order they're done. */
  exercises: Exercise[];
};

export type WorkoutInput = { name: string; notes: string };

/** The user's workouts, sorted by name, each with its exercises. */
export function listWorkouts(): Promise<Workout[]> {
  return callFunction('listWorkouts');
}

export function getWorkout(workoutId: string): Promise<Workout | null> {
  return callFunction('getWorkout', { workoutId });
}

export async function createWorkout(workout: WorkoutInput, exercises: NewExercise[]): Promise<string> {
  const { id } = await callFunction<{ id: string }>('createWorkout', { workout, exercises, today: toDayString() });
  return id;
}

export async function updateWorkout(workoutId: string, workout: WorkoutInput): Promise<void> {
  await callFunction('updateWorkout', { workoutId, workout });
}

/** Deletes the workout with its exercises, weight history, schedule entries and check-offs. */
export async function deleteWorkout(workoutId: string): Promise<void> {
  await callFunction('deleteWorkout', { workoutId });
}

/** The numbers shown on the Profile tab. */
export function getProfileStats(): Promise<{ workouts: number; completions: number }> {
  return callFunction('getProfileStats');
}
