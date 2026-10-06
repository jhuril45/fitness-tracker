import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'fitness-tracker.db';

// Each entry upgrades the schema by one version. Never edit a migration that has
// shipped; append a new one instead.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    uses_weight INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    sets INTEGER,
    reps INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One row per weight a workout has been done with. The current weight has
  -- end_date NULL; changing the weight closes it and opens a new row, so the
  -- full history (and the weeks spent at each weight) is kept.
  CREATE TABLE weight_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    weight REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT
  );
  CREATE INDEX weight_history_workout ON weight_history(workout_id, start_date);

  -- A workout planned on a weekday (0 = Sunday … 6 = Saturday). "Every day"
  -- is stored as seven rows. position orders the day's workouts.
  CREATE TABLE schedule_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, workout_id, day_of_week)
  );

  -- A scheduled workout checked off on a given date, with the weight used.
  CREATE TABLE completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- SET NULL keeps the session in the history if the plan entry is removed.
    schedule_item_id INTEGER REFERENCES schedule_items(id) ON DELETE SET NULL,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    weight REAL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (schedule_item_id, date)
  );
  CREATE INDEX completions_workout ON completions(workout_id, date);
  `,
];

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
