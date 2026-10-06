import { batch, type BatchOp, create, destroy, find, get, owned, update, userPointer } from './back4app';
import { addExercises, byWorkout, type Exercise, findExercises, type NewExercise, workoutPointer } from './exercises';

// Back4App classes:
//   Workout  owner, name, notes
//            A named routine such as "Chest day". Its steps are Exercise rows
//            (see exercises.ts); ScheduleItem and Completion live in schedule.ts.

export type Workout = {
  id: string;
  name: string;
  notes: string;
  /** In the order they're done. */
  exercises: Exercise[];
};

export type WorkoutInput = { name: string; notes: string };

export type WorkoutObject = { name: string; notes?: string };

function workoutFields(input: WorkoutInput) {
  return { name: input.name.trim(), notes: input.notes.trim() };
}

export async function listWorkouts(userId: string): Promise<Workout[]> {
  const owner = userPointer(userId);
  const [rows, exercises] = await Promise.all([find<WorkoutObject>('Workout', { owner }), findExercises({ owner })]);
  const grouped = byWorkout(exercises);
  return rows
    .map((row) => ({
      id: row.objectId,
      name: row.name,
      notes: row.notes ?? '',
      exercises: grouped.get(row.objectId) ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function getWorkout(workoutId: string): Promise<Workout | null> {
  const [row, exercises] = await Promise.all([
    get<WorkoutObject>('Workout', workoutId),
    findExercises({ workout: workoutPointer(workoutId) }),
  ]);
  return row ? { id: row.objectId, name: row.name, notes: row.notes ?? '', exercises } : null;
}

export async function createWorkout(userId: string, input: WorkoutInput, exercises: NewExercise[]): Promise<string> {
  const id = await create('Workout', { ...workoutFields(input), ...owned(userId) });
  await addExercises(userId, id, exercises);
  return id;
}

export async function updateWorkout(workoutId: string, input: WorkoutInput): Promise<void> {
  await update('Workout', workoutId, workoutFields(input));
}

/** Deletes the workout with its exercises, weight history, schedule entries and check-offs. */
export async function deleteWorkout(workoutId: string): Promise<void> {
  const where = { workout: workoutPointer(workoutId) };
  const related = await Promise.all(
    ['Exercise', 'WeightPeriod', 'ScheduleItem', 'Completion'].map(async (className) =>
      (await find(className, where, { keys: 'objectId' })).map(
        (row): BatchOp => ({ method: 'DELETE', path: `/classes/${className}/${row.objectId}` }),
      ),
    ),
  );
  await batch(related.flat());
  await destroy('Workout', workoutId);
}
