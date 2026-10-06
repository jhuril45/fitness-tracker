import type { SQLiteDatabase } from 'expo-sqlite';

import { weekdayOf } from './dates';
import type { WeightUnit } from './workouts';

export type ScheduleItem = {
  id: number;
  workoutId: number;
  workoutName: string;
  dayOfWeek: number;
  position: number;
  usesWeight: boolean;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
  currentWeight: number | null;
};

export type PlannedWorkout = ScheduleItem & {
  done: boolean;
  /** Weight recorded when it was checked off. */
  doneWeight: number | null;
};

type ScheduleRow = {
  id: number;
  workout_id: number;
  workout_name: string;
  day_of_week: number;
  position: number;
  uses_weight: number;
  unit: WeightUnit;
  sets: number | null;
  reps: number | null;
  current_weight: number | null;
};

const SCHEDULE_SELECT = `
  SELECT s.id, s.workout_id, w.name AS workout_name, s.day_of_week, s.position,
         w.uses_weight, w.unit, w.sets, w.reps, h.weight AS current_weight
  FROM schedule_items s
  JOIN workouts w ON w.id = s.workout_id
  LEFT JOIN weight_history h ON h.workout_id = w.id AND h.end_date IS NULL
`;

function toItem(row: ScheduleRow): ScheduleItem {
  return {
    id: row.id,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    dayOfWeek: row.day_of_week,
    position: row.position,
    usesWeight: row.uses_weight === 1,
    unit: row.unit,
    sets: row.sets,
    reps: row.reps,
    currentWeight: row.uses_weight === 1 ? row.current_weight : null,
  };
}

/** The whole weekly plan, grouped by weekday (index 0 = Sunday). */
export async function getWeeklySchedule(db: SQLiteDatabase, userId: number): Promise<ScheduleItem[][]> {
  const rows = await db.getAllAsync<ScheduleRow>(
    `${SCHEDULE_SELECT} WHERE s.user_id = ? ORDER BY s.day_of_week, s.position, s.id`,
    userId,
  );
  const week: ScheduleItem[][] = [[], [], [], [], [], [], []];
  for (const row of rows) week[row.day_of_week].push(toItem(row));
  return week;
}

/** Workouts planned for a date, in order, with whether each was done that day. */
export async function getDayPlan(
  db: SQLiteDatabase,
  userId: number,
  date: string,
): Promise<PlannedWorkout[]> {
  const rows = await db.getAllAsync<ScheduleRow & { done_id: number | null; done_weight: number | null }>(
    `SELECT q.*, c.id AS done_id, c.weight AS done_weight
     FROM (${SCHEDULE_SELECT} WHERE s.user_id = ? AND s.day_of_week = ?) q
     LEFT JOIN completions c ON c.schedule_item_id = q.id AND c.date = ?
     ORDER BY q.position, q.id`,
    userId,
    weekdayOf(date),
    date,
  );
  return rows.map((row) => ({
    ...toItem(row),
    done: row.done_id !== null,
    doneWeight: row.done_weight,
  }));
}

/** Plan a workout on the given weekdays. Days it is already on are skipped. */
export async function addToSchedule(
  db: SQLiteDatabase,
  userId: number,
  workoutId: number,
  days: number[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const day of days) {
      await db.runAsync(
        `INSERT OR IGNORE INTO schedule_items (user_id, workout_id, day_of_week, position)
         VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM schedule_items
                           WHERE user_id = ? AND day_of_week = ?))`,
        userId,
        workoutId,
        day,
        userId,
        day,
      );
    }
  });
}

export async function removeFromSchedule(db: SQLiteDatabase, userId: number, itemId: number): Promise<void> {
  await db.runAsync('DELETE FROM schedule_items WHERE id = ? AND user_id = ?', itemId, userId);
}

/** Move an item one place earlier (-1) or later (+1) within its day. */
export async function moveScheduleItem(
  db: SQLiteDatabase,
  userId: number,
  itemId: number,
  direction: -1 | 1,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const item = await db.getFirstAsync<{ day_of_week: number }>(
      'SELECT day_of_week FROM schedule_items WHERE id = ? AND user_id = ?',
      itemId,
      userId,
    );
    if (!item) return;
    const ids = (
      await db.getAllAsync<{ id: number }>(
        `SELECT id FROM schedule_items WHERE user_id = ? AND day_of_week = ?
         ORDER BY position, id`,
        userId,
        item.day_of_week,
      )
    ).map((r) => r.id);
    const from = ids.indexOf(itemId);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync('UPDATE schedule_items SET position = ? WHERE id = ?', i, ids[i]);
    }
  });
}

/** Check a planned workout off for a date, recording the weight used. */
export async function markDone(db: SQLiteDatabase, item: ScheduleItem, date: string): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO completions (schedule_item_id, workout_id, date, weight)
     VALUES (?, ?, ?, ?)`,
    item.id,
    item.workoutId,
    date,
    item.currentWeight,
  );
}

export async function markNotDone(db: SQLiteDatabase, item: ScheduleItem, date: string): Promise<void> {
  await db.runAsync('DELETE FROM completions WHERE schedule_item_id = ? AND date = ?', item.id, date);
}

export async function countCompletions(db: SQLiteDatabase, userId: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM completions c
     JOIN workouts w ON w.id = c.workout_id WHERE w.user_id = ?`,
    userId,
  );
  return row?.n ?? 0;
}
