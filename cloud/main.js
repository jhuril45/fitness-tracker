/**
 * Fitness Tracker — Back4App Cloud Code.
 *
 * Every read and write the app makes (apart from sign-up, sign-in and
 * sign-out) is one call to a function below, so each screen or action is a
 * single round trip. Deploy it from the Back4App dashboard: Cloud Code →
 * open cloud/main.js → paste this file → Deploy.
 *
 * Functions run as the signed-in user (their session token is passed to every
 * query), so the per-user ACLs on each object still apply: nobody can read or
 * change another account's data, and no Master Key is used.
 *
 * Classes (created automatically on first save):
 *   Workout       owner, name, notes
 *   Exercise      owner, workout, name, notes, usesWeight, unit, sets, reps, position
 *   WeightPeriod  owner, workout, exercise, weight, startDate, endDate (unset = current)
 *   ScheduleItem  owner, workout, dayOfWeek (0 = Sunday), position
 *   Completion    owner, scheduleItem, workout, exercise, date, weight
 * Dates are calendar days in "YYYY-MM-DD" form.
 */

const LIMIT = 1000;
const UNITS = ['kg', 'lb'];
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- helpers

function session(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'Please sign in again.');
  }
  return { user: request.user, opts: { sessionToken: request.user.getSessionToken() } };
}

function invalid(message) {
  return new Parse.Error(Parse.Error.VALIDATION_ERROR, message);
}

function orNull(value) {
  return value === undefined || value === null ? null : value;
}

/** A query for the user's own objects of a class. */
function ownQuery(className, user) {
  const query = new Parse.Query(className);
  query.equalTo('owner', user);
  query.limit(LIMIT);
  return query;
}

/** Fetches one of the user's objects, or null if it doesn't exist or isn't theirs. */
async function getOwn(className, id, opts) {
  if (typeof id !== 'string' || !id) return null;
  try {
    return await new Parse.Query(className).get(id, opts);
  } catch (e) {
    if (e.code === Parse.Error.OBJECT_NOT_FOUND) return null;
    throw e;
  }
}

async function mustGetOwn(className, id, opts, label) {
  const object = await getOwn(className, id, opts);
  if (!object) throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, `${label} not found. It may have been deleted.`);
  return object;
}

/** A new object owned by, and only visible to, the user. */
function newOwned(className, user, fields) {
  const object = new Parse.Object(className);
  object.set(fields);
  object.set('owner', user);
  object.setACL(new Parse.ACL(user));
  return object;
}

function pointerTo(className, id) {
  return Parse.Object.extend(className).createWithoutData(id);
}

async function destroyWhere(className, key, value, opts) {
  const query = new Parse.Query(className);
  query.equalTo(key, value);
  query.select('objectId');
  query.limit(LIMIT);
  const rows = await query.find(opts);
  if (rows.length) await Parse.Object.destroyAll(rows, opts);
}

// ---------------------------------------------------------------- validation

function cleanText(value, label, required) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw invalid(`Please enter a ${label}.`);
  if (text.length > 500) throw invalid(`The ${label} is too long.`);
  return text;
}

function cleanCount(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 10000) throw invalid('Sets and reps must be whole numbers above 0.');
  return n;
}

function cleanWeight(value, allowNull) {
  if (allowNull && (value === null || value === undefined)) return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0 || n > 100000) throw invalid('Weight must be a number above 0.');
  return n;
}

function cleanDay(value) {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) throw invalid('Invalid date.');
  return value;
}

function cleanWeekdays(days) {
  if (!Array.isArray(days) || days.length === 0) throw invalid('Pick at least one day.');
  const unique = [];
  for (const d of days) {
    if (!Number.isInteger(d) || d < 0 || d > 6) throw invalid('Invalid day of the week.');
    if (unique.indexOf(d) === -1) unique.push(d);
  }
  return unique;
}

function cleanIds(ids, label) {
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !id)) throw invalid(`Invalid ${label}.`);
  return ids;
}

function workoutFields(input) {
  input = input || {};
  return { name: cleanText(input.name, 'workout name', true), notes: cleanText(input.notes, 'note', false) };
}

function exerciseFields(input) {
  input = input || {};
  const unit = UNITS.indexOf(input.unit) === -1 ? 'kg' : input.unit;
  return {
    name: cleanText(input.name, 'exercise name', true),
    notes: cleanText(input.notes, 'note', false),
    usesWeight: input.usesWeight !== false,
    unit,
    sets: cleanCount(input.sets),
    reps: cleanCount(input.reps),
  };
}

/** Weekday of a "YYYY-MM-DD" day, 0 = Sunday, independent of the server's time zone. */
function weekdayOf(day) {
  const parts = day.split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
}

// ---------------------------------------------------------------- serializers

function exerciseJson(exercise, current) {
  const usesWeight = !!exercise.get('usesWeight');
  return {
    id: exercise.id,
    workoutId: exercise.get('workout').id,
    name: exercise.get('name'),
    notes: exercise.get('notes') || '',
    usesWeight,
    unit: exercise.get('unit') || 'kg',
    sets: orNull(exercise.get('sets')),
    reps: orNull(exercise.get('reps')),
    position: exercise.get('position') || 0,
    currentWeight: usesWeight && current ? current.get('weight') : null,
    currentWeightSince: usesWeight && current ? current.get('startDate') : null,
  };
}

function workoutJson(workout, exercises) {
  return { id: workout.id, name: workout.get('name'), notes: workout.get('notes') || '', exercises };
}

/** The user's exercises (optionally of one workout) in order, with current weights. */
async function loadExercises(user, opts, workout) {
  const exercises = ownQuery('Exercise', user);
  const open = ownQuery('WeightPeriod', user);
  open.doesNotExist('endDate');
  if (workout) {
    exercises.equalTo('workout', workout);
    open.equalTo('workout', workout);
  }
  exercises.ascending('position');
  exercises.addAscending('createdAt');
  const results = await Promise.all([exercises.find(opts), open.find(opts)]);
  const current = {};
  for (const period of results[1]) current[period.get('exercise').id] = period;
  return results[0].map((e) => exerciseJson(e, current[e.id]));
}

function groupByWorkout(exercises) {
  const groups = {};
  for (const e of exercises) (groups[e.workoutId] = groups[e.workoutId] || []).push(e);
  return groups;
}

async function listWorkouts(user, opts) {
  const results = await Promise.all([ownQuery('Workout', user).find(opts), loadExercises(user, opts)]);
  const groups = groupByWorkout(results[1]);
  return results[0]
    .map((w) => workoutJson(w, groups[w.id] || []))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** The user's plan entries (optionally for one weekday), in order, with their exercises. */
async function loadScheduleItems(user, opts, dayOfWeek) {
  const items = ownQuery('ScheduleItem', user);
  if (dayOfWeek !== undefined) items.equalTo('dayOfWeek', dayOfWeek);
  items.include('workout');
  items.ascending('dayOfWeek');
  items.addAscending('position');
  items.addAscending('createdAt');
  const results = await Promise.all([items.find(opts), loadExercises(user, opts)]);
  const groups = groupByWorkout(results[1]);
  return (
    results[0]
      // Skip entries whose workout no longer exists.
      .filter((item) => item.get('workout') && item.get('workout').get('name') !== undefined)
      .map((item) => {
        const workout = item.get('workout');
        return {
          id: item.id,
          workoutId: workout.id,
          workoutName: workout.get('name'),
          dayOfWeek: item.get('dayOfWeek'),
          position: item.get('position') || 0,
          exercises: groups[workout.id] || [],
        };
      })
  );
}

/** Validates new exercises. Done before anything is saved, so bad input never leaves half a change. */
function prepareExercises(inputs) {
  if (inputs === undefined || inputs === null) return [];
  if (!Array.isArray(inputs)) throw invalid('Invalid exercises.');
  if (inputs.length > 100) throw invalid('Too many exercises at once.');
  return inputs.map((input) => ({
    fields: exerciseFields(input),
    startingWeight: cleanWeight(input && input.startingWeight, true),
  }));
}

/** Saves prepared exercises at the end of a workout, with starting weights recorded from `today`. */
async function addExercisesTo(user, opts, workout, prepared, today) {
  if (prepared.length === 0) return [];
  const last = ownQuery('Exercise', user);
  last.equalTo('workout', workout);
  last.descending('position');
  const top = await last.first(opts);
  let position = top ? (top.get('position') || 0) + 1 : 0;

  const exercises = prepared.map((p) => newOwned('Exercise', user, Object.assign({}, p.fields, { workout, position: position++ })));
  await Parse.Object.saveAll(exercises, opts);

  const periods = [];
  prepared.forEach((p, i) => {
    if (p.fields.usesWeight && p.startingWeight !== null) {
      periods.push(
        newOwned('WeightPeriod', user, { workout, exercise: exercises[i], weight: p.startingWeight, startDate: today }),
      );
    }
  });
  if (periods.length) await Parse.Object.saveAll(periods, opts);
  return exercises.map((e) => e.id);
}

/** Saves `ids` (all of the user's objects of one class) in the given order. */
async function saveOrder(className, user, opts, ids) {
  const query = ownQuery(className, user);
  query.containedIn('objectId', ids);
  const rows = await query.find(opts);
  if (rows.length !== ids.length) throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Some items no longer exist. Refresh and try again.');
  const byId = {};
  for (const row of rows) byId[row.id] = row;
  ids.forEach((id, position) => byId[id].set('position', position));
  await Parse.Object.saveAll(rows, opts);
}

// ---------------------------------------------------------------- workouts

Parse.Cloud.define('listWorkouts', async (request) => {
  const s = session(request);
  return listWorkouts(s.user, s.opts);
});

Parse.Cloud.define('getWorkout', async (request) => {
  const s = session(request);
  const workout = await getOwn('Workout', request.params.workoutId, s.opts);
  if (!workout) return null;
  return workoutJson(workout, await loadExercises(s.user, s.opts, workout));
});

Parse.Cloud.define('createWorkout', async (request) => {
  const s = session(request);
  const fields = workoutFields(request.params.workout);
  const exercises = prepareExercises(request.params.exercises);
  const today = cleanDay(request.params.today);
  const workout = newOwned('Workout', s.user, fields);
  await workout.save(null, s.opts);
  await addExercisesTo(s.user, s.opts, workout, exercises, today);
  return { id: workout.id };
});

Parse.Cloud.define('updateWorkout', async (request) => {
  const s = session(request);
  const workout = await mustGetOwn('Workout', request.params.workoutId, s.opts, 'Workout');
  workout.set(workoutFields(request.params.workout));
  await workout.save(null, s.opts);
  return { ok: true };
});

Parse.Cloud.define('deleteWorkout', async (request) => {
  const s = session(request);
  const workout = await mustGetOwn('Workout', request.params.workoutId, s.opts, 'Workout');
  await Promise.all(
    ['Exercise', 'WeightPeriod', 'ScheduleItem', 'Completion'].map((c) => destroyWhere(c, 'workout', workout, s.opts)),
  );
  await workout.destroy(s.opts);
  return { ok: true };
});

// ---------------------------------------------------------------- exercises

Parse.Cloud.define('addExercises', async (request) => {
  const s = session(request);
  const exercises = prepareExercises(request.params.exercises);
  const today = cleanDay(request.params.today);
  const workout = await mustGetOwn('Workout', request.params.workoutId, s.opts, 'Workout');
  return { ids: await addExercisesTo(s.user, s.opts, workout, exercises, today) };
});

/** The exercise with its full weight history, newest first, and sessions done at each weight. */
Parse.Cloud.define('getExerciseDetail', async (request) => {
  const s = session(request);
  const exercise = await getOwn('Exercise', request.params.exerciseId, s.opts);
  if (!exercise) return { exercise: null, history: [] };
  const periods = ownQuery('WeightPeriod', s.user);
  periods.equalTo('exercise', exercise);
  periods.descending('startDate');
  periods.addDescending('createdAt');
  const completions = ownQuery('Completion', s.user);
  completions.equalTo('exercise', exercise);
  completions.select('date');
  const results = await Promise.all([periods.find(s.opts), completions.find(s.opts)]);
  const dates = results[1].map((c) => c.get('date'));
  const current = results[0].find((p) => !p.get('endDate'));
  return {
    exercise: exerciseJson(exercise, current),
    history: results[0].map((p) => {
      const start = p.get('startDate');
      const end = orNull(p.get('endDate'));
      return {
        id: p.id,
        exerciseId: exercise.id,
        weight: p.get('weight'),
        startDate: start,
        endDate: end,
        sessions: dates.filter((d) => d >= start && (!end || d < end)).length,
      };
    }),
  };
});

Parse.Cloud.define('updateExercise', async (request) => {
  const s = session(request);
  const exercise = await mustGetOwn('Exercise', request.params.exerciseId, s.opts, 'Exercise');
  exercise.set(exerciseFields(request.params.exercise));
  await exercise.save(null, s.opts);
  return { ok: true };
});

Parse.Cloud.define('deleteExercise', async (request) => {
  const s = session(request);
  const exercise = await mustGetOwn('Exercise', request.params.exerciseId, s.opts, 'Exercise');
  await Promise.all([
    destroyWhere('WeightPeriod', 'exercise', exercise, s.opts),
    destroyWhere('Completion', 'exercise', exercise, s.opts),
  ]);
  await exercise.destroy(s.opts);
  return { ok: true };
});

Parse.Cloud.define('saveExerciseOrder', async (request) => {
  const s = session(request);
  await saveOrder('Exercise', s.user, s.opts, cleanIds(request.params.ids, 'exercise order'));
  return { ok: true };
});

/**
 * Switch an exercise to a new weight. The current weight is closed off (its
 * end date set to `date`) and a new period starts, so the old weight and how
 * long it was used stay in the history. Changing it again on the same day
 * corrects the period that started that day instead of adding a zero-length one.
 */
Parse.Cloud.define('changeWeight', async (request) => {
  const s = session(request);
  const exercise = await mustGetOwn('Exercise', request.params.exerciseId, s.opts, 'Exercise');
  const weight = cleanWeight(request.params.weight, false);
  const date = cleanDay(request.params.date);

  const openQuery = ownQuery('WeightPeriod', s.user);
  openQuery.equalTo('exercise', exercise);
  openQuery.doesNotExist('endDate');
  const current = await openQuery.first(s.opts);
  if (current && current.get('weight') === weight) return { ok: true };

  if (current && current.get('startDate') >= date) {
    // If the correction lands back on the previous weight, merge the periods.
    const previousQuery = ownQuery('WeightPeriod', s.user);
    previousQuery.equalTo('exercise', exercise);
    previousQuery.equalTo('endDate', current.get('startDate'));
    previousQuery.descending('createdAt');
    const previous = await previousQuery.first(s.opts);
    if (previous && previous.get('weight') === weight) {
      await current.destroy(s.opts);
      previous.unset('endDate');
      await previous.save(null, s.opts);
    } else {
      current.set('weight', weight);
      await current.save(null, s.opts);
    }
    return { ok: true };
  }

  const changes = [
    newOwned('WeightPeriod', s.user, { workout: exercise.get('workout'), exercise, weight, startDate: date }),
  ];
  if (current) {
    current.set('endDate', date);
    changes.push(current);
  }
  await Parse.Object.saveAll(changes, s.opts);
  return { ok: true };
});

// ---------------------------------------------------------------- schedule

/** The whole weekly plan, grouped by weekday (index 0 = Sunday). */
Parse.Cloud.define('getWeeklySchedule', async (request) => {
  const s = session(request);
  const week = [[], [], [], [], [], [], []];
  for (const item of await loadScheduleItems(s.user, s.opts)) week[item.dayOfWeek].push(item);
  return week;
});

/** Workouts planned for a day, in order, with which exercises were done that day. */
Parse.Cloud.define('getDayPlan', async (request) => {
  const s = session(request);
  const date = cleanDay(request.params.date);
  const completionQuery = ownQuery('Completion', s.user);
  completionQuery.equalTo('date', date);
  const results = await Promise.all([loadScheduleItems(s.user, s.opts, weekdayOf(date)), completionQuery.find(s.opts)]);
  const done = {};
  for (const c of results[1]) {
    if (!c.get('scheduleItem')) continue;
    const key = c.get('scheduleItem').id + ':' + c.get('exercise').id;
    (done[key] = done[key] || []).push(c);
  }
  return results[0].map((item) =>
    Object.assign({}, item, {
      exercises: item.exercises.map((exercise) => {
        const rows = done[item.id + ':' + exercise.id] || [];
        return Object.assign({}, exercise, {
          done: rows.length > 0,
          doneWeight: rows.length ? orNull(rows[0].get('weight')) : null,
          completionIds: rows.map((r) => r.id),
        });
      }),
    }),
  );
});

/** Everything the "Add to schedule" screen needs: workouts, and which are already on each weekday. */
Parse.Cloud.define('getScheduleOptions', async (request) => {
  const s = session(request);
  const items = ownQuery('ScheduleItem', s.user);
  items.select('workout', 'dayOfWeek');
  const results = await Promise.all([listWorkouts(s.user, s.opts), items.find(s.opts)]);
  const planned = [[], [], [], [], [], [], []];
  for (const item of results[1]) planned[item.get('dayOfWeek')].push(item.get('workout').id);
  return { workouts: results[0], planned };
});

/**
 * Plans workouts on weekdays, after whatever each day already has, in the
 * order given. A workout already on a day is skipped for that day.
 */
Parse.Cloud.define('addToSchedule', async (request) => {
  const s = session(request);
  const workoutIds = cleanIds(request.params.workoutIds, 'workouts');
  if (workoutIds.length === 0) throw invalid('Pick at least one workout.');
  const days = cleanWeekdays(request.params.days);

  const workoutQuery = ownQuery('Workout', s.user);
  workoutQuery.containedIn('objectId', workoutIds);
  workoutQuery.select('objectId');
  const existingQuery = ownQuery('ScheduleItem', s.user);
  existingQuery.containedIn('dayOfWeek', days);
  existingQuery.select('workout', 'dayOfWeek', 'position');
  const results = await Promise.all([workoutQuery.find(s.opts), existingQuery.find(s.opts)]);
  if (results[0].length !== new Set(workoutIds).size) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'A workout no longer exists. Refresh and try again.');
  }

  const toSave = [];
  for (const day of days) {
    const onDay = results[1].filter((row) => row.get('dayOfWeek') === day);
    const planned = onDay.map((row) => row.get('workout').id);
    let position = onDay.reduce((max, row) => Math.max(max, row.get('position') || 0), -1) + 1;
    for (const workoutId of workoutIds) {
      if (planned.indexOf(workoutId) !== -1) continue;
      planned.push(workoutId);
      toSave.push(
        newOwned('ScheduleItem', s.user, { workout: pointerTo('Workout', workoutId), dayOfWeek: day, position: position++ }),
      );
    }
  }
  if (toSave.length) await Parse.Object.saveAll(toSave, s.opts);
  return { ok: true };
});

Parse.Cloud.define('removeFromSchedule', async (request) => {
  const s = session(request);
  const item = await mustGetOwn('ScheduleItem', request.params.itemId, s.opts, 'Schedule entry');
  await item.destroy(s.opts);
  return { ok: true };
});

Parse.Cloud.define('saveScheduleOrder', async (request) => {
  const s = session(request);
  await saveOrder('ScheduleItem', s.user, s.opts, cleanIds(request.params.itemIds, 'schedule order'));
  return { ok: true };
});

/** Checks an exercise of a planned workout off for a day, recording the weight it's currently at. */
Parse.Cloud.define('markDone', async (request) => {
  const s = session(request);
  const date = cleanDay(request.params.date);
  const results = await Promise.all([
    mustGetOwn('ScheduleItem', request.params.itemId, s.opts, 'Schedule entry'),
    mustGetOwn('Exercise', request.params.exerciseId, s.opts, 'Exercise'),
  ]);
  const item = results[0];
  const exercise = results[1];

  const existingQuery = ownQuery('Completion', s.user);
  existingQuery.equalTo('scheduleItem', item);
  existingQuery.equalTo('exercise', exercise);
  existingQuery.equalTo('date', date);
  const openQuery = ownQuery('WeightPeriod', s.user);
  openQuery.equalTo('exercise', exercise);
  openQuery.doesNotExist('endDate');
  const found = await Promise.all([existingQuery.first(s.opts), openQuery.first(s.opts)]);
  const weight = exercise.get('usesWeight') && found[1] ? found[1].get('weight') : null;
  if (found[0]) return { completionId: found[0].id, weight: orNull(found[0].get('weight')) };

  const completion = newOwned('Completion', s.user, {
    scheduleItem: item,
    exercise,
    workout: exercise.get('workout'),
    date,
    weight,
  });
  await completion.save(null, s.opts);
  return { completionId: completion.id, weight };
});

/**
 * Unchecks an exercise. Pass the check-off ids, and/or the plan entry,
 * exercise and date: the app sends both, so an uncheck queued while offline
 * still finds a check-off whose id it never saw. Safe to repeat.
 */
Parse.Cloud.define('markNotDone', async (request) => {
  const s = session(request);
  const p = request.params;
  const queries = [];
  const ids = p.completionIds === undefined ? [] : cleanIds(p.completionIds, 'check-offs');
  if (ids.length) {
    const byId = ownQuery('Completion', s.user);
    byId.containedIn('objectId', ids);
    queries.push(byId);
  }
  if (p.itemId !== undefined || p.exerciseId !== undefined || p.date !== undefined) {
    const byKey = ownQuery('Completion', s.user);
    byKey.equalTo('scheduleItem', pointerTo('ScheduleItem', cleanIds([p.itemId], 'schedule entry')[0]));
    byKey.equalTo('exercise', pointerTo('Exercise', cleanIds([p.exerciseId], 'exercise')[0]));
    byKey.equalTo('date', cleanDay(p.date));
    queries.push(byKey);
  }
  if (queries.length === 0) return { ok: true };
  const rows = await Parse.Query.or.apply(Parse.Query, queries).find(s.opts);
  if (rows.length) await Parse.Object.destroyAll(rows, s.opts);
  return { ok: true };
});

// ---------------------------------------------------------------- profile

Parse.Cloud.define('getProfileStats', async (request) => {
  const s = session(request);
  const counts = await Promise.all([ownQuery('Workout', s.user).count(s.opts), ownQuery('Completion', s.user).count(s.opts)]);
  return { workouts: counts[0], completions: counts[1] };
});
