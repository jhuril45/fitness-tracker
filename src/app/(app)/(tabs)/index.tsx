import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Accordion, AccordionAction, AccordionActions } from '../../../components/Accordion';
import { Skeleton } from '../../../components/Skeleton';
import { Button, Card, EmptyState, ErrorBanner } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { parseDayString, toDayString } from '../../../lib/dates';
import { describeExercise } from '../../../lib/format';
import { getDayPlan, markDone, markNotDone, type PlannedExercise } from '../../../lib/schedule';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { colors, spacing } from '../../../theme';

function shiftDay(day: string, by: number): string {
  const d = parseDayString(day);
  d.setDate(d.getDate() + by);
  return toDayString(d);
}

function dayTitle(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  if (day === shiftDay(today, 1)) return 'Tomorrow';
  return parseDayString(day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Shows the weight it was done with once checked off. */
function describe(exercise: PlannedExercise): string {
  return describeExercise(exercise, exercise.done ? exercise.doneWeight : exercise.currentWeight);
}

export default function TodayScreen() {
  const user = useCurrentUser();
  const today = toDayString();
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  /** The exercise whose check-off is being saved. */
  const [saving, setSaving] = useState<string | null>(null);
  const { data: plan, error: loadError, reload, mutate } = useLoadOnFocus(() => getDayPlan(date), [user.id, date]);

  const isFuture = date > today;
  // Every exercise of the day in order, across all of the day's workouts.
  const all =
    plan?.flatMap((w) => w.exercises.map((exercise) => ({ itemId: w.id, workoutName: w.workoutName, exercise }))) ??
    [];
  const doneCount = all.filter((e) => e.exercise.done).length;
  const next = all.find((e) => !e.exercise.done);

  // Workouts the user opened or closed by hand; the rest follow the default,
  // which is to show only the workout holding the next exercise.
  const [manual, setManual] = useState<Map<string, boolean>>(new Map());
  const isExpanded = (itemId: string) => manual.get(itemId) ?? itemId === next?.itemId;
  const toggleExpanded = (itemId: string) => setManual((prev) => new Map(prev).set(itemId, !isExpanded(itemId)));

  function changeDate(day: string) {
    setDate(day);
    setManual(new Map());
  }

  async function toggle(itemId: string, exercise: PlannedExercise) {
    if (isFuture || saving) return;
    setError(null);
    setSaving(`${itemId}:${exercise.id}`);
    try {
      let change: Partial<PlannedExercise>;
      if (exercise.done) {
        await markNotDone(exercise);
        change = { done: false, doneWeight: null, completionIds: [] };
      } else {
        const { completionId, weight } = await markDone(itemId, exercise.id, date);
        change = { done: true, doneWeight: weight, completionIds: [completionId] };
      }
      // Show the change as soon as it's saved, then sync with the server quietly.
      mutate((days) =>
        days.map((w) =>
          w.id !== itemId
            ? w
            : { ...w, exercises: w.exercises.map((e) => (e.id === exercise.id ? { ...e, ...change } : e)) },
        ),
      );
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the exercise.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hi {user.name.split(' ')[0]}</Text>

      <View style={styles.dayNav}>
        <Pressable accessibilityLabel="Previous day" onPress={() => changeDate(shiftDay(date, -1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => changeDate(today)} disabled={date === today}>
          <Text style={styles.dayTitle}>{dayTitle(date, today)}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Next day" onPress={() => changeDate(shiftDay(date, 1))} hitSlop={10}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <ErrorBanner message={error ?? loadError} />

      {!plan && !loadError ? <DayPlanSkeleton /> : null}

      {plan && plan.length === 0 ? (
        <>
          <EmptyState title="Rest day" message="Nothing is scheduled for this day." />
          <Link
            href={{ pathname: '/schedule/add', params: { day: String(parseDayString(date).getDay()) } }}
            asChild>
            <Button title="Schedule a workout" variant="secondary" />
          </Link>
        </>
      ) : null}

      {plan && plan.length > 0 ? (
        <>
          {all.length > 0 ? (
            <>
              <Text style={styles.progressText}>
                {doneCount} of {all.length} exercises done
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(doneCount / all.length) * 100}%` }]} />
              </View>
            </>
          ) : null}

          {next ? (
            <Card style={styles.nextCard}>
              <Text style={styles.nextCaption}>
                {doneCount === 0 ? 'Start with' : 'Up next'} · {next.workoutName}
              </Text>
              <Text style={styles.nextName}>{next.exercise.name}</Text>
              {describe(next.exercise) ? <Text style={styles.nextDetail}>{describe(next.exercise)}</Text> : null}
              {isFuture ? (
                <Text style={styles.muted}>You can check this off on the day.</Text>
              ) : (
                <Button
                  title="Mark as done"
                  onPress={() => toggle(next.itemId, next.exercise)}
                  loading={saving === `${next.itemId}:${next.exercise.id}`}
                  disabled={saving !== null}
                  style={styles.nextButton}
                />
              )}
            </Card>
          ) : all.length > 0 ? (
            <Card style={[styles.nextCard, styles.allDone]}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
              <Text style={styles.nextName}>All done</Text>
              <Text style={styles.muted}>Every exercise for this day is checked off.</Text>
            </Card>
          ) : null}

          {plan.map((workout) => {
            const done = workout.exercises.filter((e) => e.done).length;
            const total = workout.exercises.length;
            return (
              <Accordion
                key={workout.id}
                icon={total > 0 && done === total ? 'checkmark-circle-outline' : 'barbell-outline'}
                title={workout.workoutName}
                subtitle={total === 0 ? 'No exercises yet' : `${done} of ${total} done`}
                expanded={isExpanded(workout.id)}
                onToggle={() => toggleExpanded(workout.id)}>
                {total === 0 ? <Text style={styles.empty}>Add exercises to this workout first.</Text> : null}
                {workout.exercises.map((exercise, index) => {
                  const isSaving = saving === `${workout.id}:${exercise.id}`;
                  return (
                    <Pressable
                      key={exercise.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: exercise.done, disabled: isFuture, busy: isSaving }}
                      onPress={() => toggle(workout.id, exercise)}
                      disabled={isFuture || saving !== null}
                      style={[styles.item, index > 0 && styles.itemBorder]}>
                      <View style={styles.check}>
                        {isSaving ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          <Ionicons
                            name={exercise.done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={26}
                            color={
                              exercise.done ? colors.success : exercise === next?.exercise ? colors.primary : colors.muted
                            }
                          />
                        )}
                      </View>
                      <View style={styles.flex}>
                        <Text
                          style={[
                            styles.itemName,
                            exercise === next?.exercise && styles.itemNext,
                            exercise.done && styles.itemDone,
                          ]}>
                          {index + 1}. {exercise.name}
                        </Text>
                        {describe(exercise) ? <Text style={styles.muted}>{describe(exercise)}</Text> : null}
                      </View>
                      <Link href={{ pathname: '/exercise/[id]', params: { id: exercise.id } }} asChild>
                        <Pressable accessibilityLabel={`Open ${exercise.name}`} hitSlop={8}>
                          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                        </Pressable>
                      </Link>
                    </Pressable>
                  );
                })}
                <AccordionActions>
                  <AccordionAction
                    href={{ pathname: '/workout/[id]', params: { id: workout.workoutId } }}
                    icon="information-circle-outline"
                    label="Workout details"
                  />
                </AccordionActions>
              </Accordion>
            );
          })}
        </>
      ) : null}
    </ScrollView>
  );
}

/** Stands in for the progress bar, Up next card and workouts while a day loads. */
function DayPlanSkeleton() {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={styles.skeleton}>
      <Skeleton width={140} height={14} />
      <Skeleton height={8} />
      <Card style={styles.skeletonCard}>
        <Skeleton width={120} height={12} />
        <Skeleton width="70%" height={24} />
        <Skeleton width={90} height={14} />
        <Skeleton height={48} style={styles.skeletonButton} />
      </Card>
      {[0, 1].map((i) => (
        <Card key={i} style={styles.skeletonRow}>
          <Skeleton width={22} height={22} />
          <View style={styles.skeletonText}>
            <Skeleton width="45%" height={16} />
            <Skeleton width="25%" height={12} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: spacing.md },
  skeletonCard: { gap: spacing.sm },
  skeletonButton: { marginTop: spacing.md },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skeletonText: { flex: 1, gap: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  greeting: { fontSize: 15, color: colors.muted },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  progressText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success },
  nextCard: { gap: spacing.xs, borderColor: colors.primary, borderWidth: 2 },
  allDone: { alignItems: 'center', borderColor: colors.success },
  nextCaption: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  nextName: { fontSize: 24, fontWeight: '800', color: colors.text },
  nextDetail: { fontSize: 16, color: colors.text },
  nextButton: { marginTop: spacing.md },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  check: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  itemNext: { color: colors.primary },
  flex: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemDone: { color: colors.muted, textDecorationLine: 'line-through' },
  muted: { fontSize: 14, color: colors.muted },
});
