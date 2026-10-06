# Fitness Tracker

A React Native app built with Expo (SDK 57), TypeScript and Expo Router for logging workouts,
tracking the weight you lift over time, and following a daily/weekly workout plan.

## Features

- **Register and sign in.** Accounts are stored on the device in SQLite. Passwords are salted and
  hashed (never stored in plain text) and the session is kept in the device's secure store.
- **Workouts.** Name, sets, reps, notes, and whether the exercise uses weights (kg or lb).
- **Weight history.** Changing a workout's weight closes the old weight with an end date and starts
  a new one, so every past weight stays visible with how many weeks (and days) you spent on it and
  how many sessions you completed at it.
- **Schedule.** Put a workout on every day or on chosen weekdays, and reorder each day's list.
- **Today.** Shows the day's plan with an "Up next" card. Mark a workout as done to move on to the
  next one; tap any item to check or uncheck it. Use the arrows to look at other days.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app (SDK 57) on your phone, or press `a` / `i` for an Android
emulator or iOS simulator. The app targets iOS and Android; web is not set up.

Checks: `npm run typecheck`.

## Project layout

```
src/app/                 Screens (Expo Router: every file is a route)
  _layout.tsx            Database + auth providers, sign-in guard
  sign-in.tsx, register.tsx
  (app)/(tabs)/          Today, Workouts, Schedule, Profile tabs
  (app)/workout/         New, detail (weight history), edit
  (app)/schedule/add.tsx Add a workout to days of the week
src/lib/
  db.ts                  SQLite schema and migrations
  auth/                  AuthService interface, on-device implementation, React context
  workouts.ts            Workouts and weight history queries
  schedule.ts            Weekly plan and completions queries
  weightHistory.ts       Weeks-at-weight calculation
src/components/          Shared UI
```

## Moving accounts to a backend

Screens only use the `AuthService` interface in `src/lib/auth/types.ts`. To sync accounts across
devices, implement that interface with a hosted service (for example Supabase Auth) and pass it to
`<AuthProvider service={...}>` in `src/app/_layout.tsx`. Workout data would then also need to move
to the backend, since it is currently stored only on the device.
