import type { SQLiteDatabase } from 'expo-sqlite';

import { toDayString } from './dates';
import type { WeightPeriod } from './weightHistory';

export type WeightUnit = 'kg' | 'lb';

export type Workout = {
  id: number;
  name: string;
  notes: string;
  usesWeight: boolean;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
  /** Weight currently in use, or null for bodyweight/cardio workouts. */
  currentWeight: number | null;
  currentWeightSince: string | null;
};

export type WorkoutInput = {
  name: string;
  notes: string;
  usesWeight: boolean;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
};

export type WeightPeriodWithSessions = WeightPeriod & { sessions: number };

type WorkoutRow = {
  id: number;
  name: string;
  notes: string;
  uses_weight: number;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
  current_weight: number | null;
  current_since: string | null;
};

const WORKOUT_SELECT = `
  SELECT w.id, w.name, w.notes, w.uses_weight, w.unit, w.sets, w.reps,
         h.weight AS current_weight, h.start_date AS current_since
  FROM workouts w
  LEFT JOIN weight_history h ON h.workout_id = w.id AND h.end_date IS NULL
`;

function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    usesWeight: row.uses_weight === 1,
    unit: row.unit,
    sets: row.sets,
    reps: row.reps,
    currentWeight: row.uses_weight === 1 ? row.current_weight : null,
    currentWeightSince: row.uses_weight === 1 ? row.current_since : null,
  };
}

export async function listWorkouts(db: SQLiteDatabase, userId: number): Promise<Workout[]> {
  const rows = await db.getAllAsync<WorkoutRow>(
    `${WORKOUT_SELECT} WHERE w.user_id = ? ORDER BY w.name COLLATE NOCASE`,
    userId,
  );
  return rows.map(toWorkout);
}

export async function getWorkout(
  db: SQLiteDatabase,
  userId: number,
  workoutId: number,
): Promise<Workout | null> {
  const row = await db.getFirstAsync<WorkoutRow>(
    `${WORKOUT_SELECT} WHERE w.user_id = ? AND w.id = ?`,
    userId,
    workoutId,
  );
  return row ? toWorkout(row) : null;
}

export async function createWorkout(
  db: SQLiteDatabase,
  userId: number,
  input: WorkoutInput,
  startingWeight: number | null,
): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO workouts (user_id, name, notes, uses_weight, unit, sets, reps)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      input.name.trim(),
      input.notes.trim(),
      input.usesWeight ? 1 : 0,
      input.unit,
      input.sets,
      input.reps,
    );
    id = result.lastInsertRowId;
    if (input.usesWeight && startingWeight !== null) {
      await db.runAsync(
        'INSERT INTO weight_history (workout_id, weight, start_date) VALUES (?, ?, ?)',
        id,
        startingWeight,
        toDayString(),
      );
    }
  });
  return id;
}

export async function updateWorkout(
  db: SQLiteDatabase,
  userId: number,
  workoutId: number,
  input: WorkoutInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE workouts SET name = ?, notes = ?, uses_weight = ?, unit = ?, sets = ?, reps = ?
     WHERE id = ? AND user_id = ?`,
    input.name.trim(),
    input.notes.trim(),
    input.usesWeight ? 1 : 0,
    input.unit,
    input.sets,
    input.reps,
    workoutId,
    userId,
  );
}

export async function deleteWorkout(db: SQLiteDatabase, userId: number, workoutId: number): Promise<void> {
  await db.runAsync('DELETE FROM workouts WHERE id = ? AND user_id = ?', workoutId, userId);
}

/** Every weight this workout has used, newest first, with sessions done at each. */
export async function getWeightHistory(
  db: SQLiteDatabase,
  workoutId: number,
): Promise<WeightPeriodWithSessions[]> {
  return db.getAllAsync<WeightPeriodWithSessions>(
    `SELECT h.id, h.workout_id AS workoutId, h.weight,
            h.start_date AS startDate, h.end_date AS endDate,
            (SELECT COUNT(*) FROM completions c
              WHERE c.workout_id = h.workout_id
                AND c.date >= h.start_date
                AND (h.end_date IS NULL OR c.date < h.end_date)) AS sessions
     FROM weight_history h
     WHERE h.workout_id = ?
     ORDER BY h.start_date DESC, h.id DESC`,
    workoutId,
  );
}

/**
 * Switch a workout to a new weight. The current weight is closed off (its end
 * date set to `date`) and a new period starts, so the old weight and how long it
 * was used stay in the history. Changing it again on the same day corrects the
 * period that started today rather than creating a zero-length one.
 */
export async function changeWeight(
  db: SQLiteDatabase,
  workoutId: number,
  weight: number,
  date: string = toDayString(),
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const current = await db.getFirstAsync<{ id: number; weight: number; start_date: string }>(
      'SELECT id, weight, start_date FROM weight_history WHERE workout_id = ? AND end_date IS NULL',
      workoutId,
    );
    if (current?.weight === weight) return;

    if (current && current.start_date >= date) {
      await db.runAsync('UPDATE weight_history SET weight = ? WHERE id = ?', weight, current.id);
      // If the correction lands back on the previous weight, merge the periods.
      const previous = await db.getFirstAsync<{ id: number; weight: number }>(
        `SELECT id, weight FROM weight_history
         WHERE workout_id = ? AND end_date = ? ORDER BY id DESC LIMIT 1`,
        workoutId,
        current.start_date,
      );
      if (previous?.weight === weight) {
        await db.runAsync('DELETE FROM weight_history WHERE id = ?', current.id);
        await db.runAsync('UPDATE weight_history SET end_date = NULL WHERE id = ?', previous.id);
      }
      return;
    }

    if (current) {
      await db.runAsync('UPDATE weight_history SET end_date = ? WHERE id = ?', date, current.id);
    }
    await db.runAsync(
      'INSERT INTO weight_history (workout_id, weight, start_date) VALUES (?, ?, ?)',
      workoutId,
      weight,
      date,
    );
  });
}
