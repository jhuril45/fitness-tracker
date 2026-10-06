# Fitness Tracker

A React Native app built with Expo (SDK 57), TypeScript and Expo Router for logging workouts,
tracking the weight you lift over time, and following a daily/weekly workout plan.

## Features

- **Register and sign in.** Accounts and all workout data are stored on [Back4App](https://www.back4app.com)
  (Parse), so they sync between devices and the web. The session token is kept in the device's
  secure store (localStorage on web).
- **Workouts and exercises.** A workout such as "Chest day" holds an ordered list of exercises
  (e.g. Incline dumbbell bench press 3 × 12, Flat dumbbell bench press 3 × 12, Pec deck 3 × 12). The
  Workouts tab shows each workout as an expandable row with its exercises and an "Add exercise"
  button.
- **Weight history.** Each exercise tracks its own weight. Changing it closes the old weight with an
  end date and starts a new one, so every past weight stays visible with how many weeks (and days)
  you spent on it and how many sessions you completed at it.
- **Schedule.** Put a workout on every day or on chosen weekdays. A day can have one workout or
  several, and you can reorder them.
- **Today.** Shows each of the day's workouts with its exercises and an "Up next" card. Check
  exercises off as you go; the weight you used is recorded. Use the arrows to look at other days.

## Running it

1. Create an app on Back4App and copy its **Application ID** and **JavaScript key** from
   *App Settings > Security & Keys*.
2. Copy `.env.example` to `.env.local` and fill in those two keys. Never use the Master Key in the app.
3. Deploy the Cloud Code: in the Back4App dashboard open **Cloud Code**, open `cloud/main.js`, replace
   its contents with this repo's [`cloud/main.js`](cloud/main.js) and click **Deploy**. Redeploy it
   whenever that file changes.
4. Start the app:

```bash
npm install
npx expo start
```

Sign-up, sign-in and sign-out use Parse's standard endpoints. Every other read and write is a single
call to a Cloud Code function, so each screen or action is one round trip. The functions run as the
signed-in user, so access rules still apply and no Master Key is needed.

The classes (`Workout`, `Exercise`, `WeightPeriod`, `ScheduleItem`, `Completion`) are created the
first time something is saved to them. Every object stores an `owner` pointer and an ACL that only
lets that user read and write it.

Scan the QR code with the Expo Go app (SDK 57) on your phone, or press `a` / `i` for an Android
emulator or iOS simulator, or `w` for the web.

Checks: `npm run typecheck`.

## Project layout

```
cloud/main.js            Back4App Cloud Code: every data read and write
src/app/                 Screens (Expo Router: every file is a route)
  _layout.tsx            Auth provider, sign-in guard
  sign-in.tsx, register.tsx
  (app)/(tabs)/          Today, Workouts, Schedule, Profile tabs
  (app)/workout/         New (with exercises), manage, edit
  (app)/exercise/        Add, detail (weight history), edit
  (app)/schedule/add.tsx Add a workout to days of the week
src/lib/
  back4app.ts            Back4App client: auth requests and Cloud Code calls
  auth/                  AuthService interface, Back4App implementation, React context
  workouts.ts            Workouts
  exercises.ts           Exercises and weight history
  schedule.ts            Weekly plan and completions
  weightHistory.ts       Weeks-at-weight calculation
src/components/          Shared UI
```
