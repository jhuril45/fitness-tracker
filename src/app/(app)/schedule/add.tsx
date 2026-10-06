import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DraggableList } from '../../../components/DraggableList';
import { Button, Chip, EmptyState, ErrorBanner } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { DAY_NAMES, DAY_NAMES_LONG } from '../../../lib/dates';
import { countLabel } from '../../../lib/format';
import { goBack } from '../../../lib/navigation';
import { addToSchedule, getScheduleOptions } from '../../../lib/schedule';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import type { Workout } from '../../../lib/workouts';
import { colors, fonts, radius, spacing } from '../../../theme';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const ROW_HEIGHT = 64;

function daysLabel(days: number[]): string {
  if (days.length === 7) return 'every day';
  if (days.length === 1) return DAY_NAMES_LONG[days[0]];
  return days.map((d) => DAY_NAMES[d]).join(', ');
}

export default function AddToScheduleScreen() {
  const params = useLocalSearchParams<{ day?: string; workoutId?: string }>();
  const user = useCurrentUser();
  const { data } = useLoadOnFocus(getScheduleOptions, [user.id]);

  const [days, setDays] = useState<number[]>(params.day ? [Number(params.day)] : []);
  /** Picked workout ids, in the order they'll be done. */
  const [selected, setSelected] = useState<string[]>(params.workoutId ? [params.workoutId] : []);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const workouts = data?.workouts ?? [];
  // A workout that's already on every chosen day has nothing left to add.
  const isPlanned = (id: string, on: number[]) => on.length > 0 && on.every((d) => data?.planned[d].has(id));
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const picked = selected.filter((id) => byId.has(id) && !isPlanned(id, days)).map((id) => byId.get(id)!);
  const available = workouts.filter((w) => !selected.includes(w.id) && !isPlanned(w.id, days));
  const hiddenCount = workouts.filter((w) => isPlanned(w.id, days)).length;
  const everyDay = days.length === 7;

  function changeDays(next: number[]) {
    setDays(next);
    // Drop picks that are already on all of the newly chosen days.
    setSelected((prev) => prev.filter((id) => !isPlanned(id, next)));
  }

  function toggleDay(day: number) {
    changeDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b));
  }

  async function save() {
    if (days.length === 0) return setError('Pick at least one day.');
    if (picked.length === 0) return setError('Pick at least one workout.');
    setError(null);
    setSaving(true);
    try {
      await addToSchedule(
        picked.map((w) => w.id),
        days,
      );
      goBack('/schedule');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the schedule.');
      setSaving(false);
    }
  }

  if (data && workouts.length === 0) {
    return (
      <View style={styles.content}>
        <EmptyState title="No workouts yet" message="Create a workout first, then add it to your schedule." />
        <Link href="/workout/new" asChild>
          <Button title="New workout" />
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} scrollEnabled={!dragging}>
      <ErrorBanner message={error} />

      <Text style={styles.heading}>Days</Text>
      <View style={styles.chips}>
        <Chip label="Every day" selected={everyDay} onPress={() => changeDays(everyDay ? [] : ALL_DAYS)} />
      </View>
      <Text style={styles.sub}>Or pick days of the week</Text>
      <View style={styles.chips}>
        {ALL_DAYS.map((d) => (
          <Chip key={d} label={DAY_NAMES[d]} selected={days.includes(d)} onPress={() => toggleDay(d)} />
        ))}
      </View>

      {picked.length > 0 ? (
        <>
          <Text style={styles.heading}>Selected</Text>
          {picked.length > 1 ? <Text style={styles.sub}>Drag to set the order you'll do them in.</Text> : null}
          <DraggableList
            items={picked}
            keyOf={(w) => w.id}
            rowHeight={ROW_HEIGHT}
            gap={spacing.sm}
            onReorder={(next) => setSelected(next.map((w) => w.id))}
            onDraggingChange={setDragging}
            renderRow={(w, index, handle) => (
              <View style={[styles.row, styles.rowSelected]}>
                {picked.length > 1 ? handle : null}
                <Text style={styles.order}>{index + 1}</Text>
                <WorkoutLabel workout={w} selected />
                <Pressable
                  accessibilityLabel={`Remove ${w.name}`}
                  onPress={() => setSelected((prev) => prev.filter((id) => id !== w.id))}
                  hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={colors.muted} />
                </Pressable>
              </View>
            )}
          />
        </>
      ) : null}

      <Text style={styles.heading}>{picked.length > 0 ? 'Add more' : 'Workouts'}</Text>
      {available.map((w) => (
        <Pressable
          key={w.id}
          accessibilityRole="button"
          accessibilityLabel={`Add ${w.name}`}
          onPress={() => setSelected((prev) => [...prev, w.id])}
          style={styles.row}>
          <WorkoutLabel workout={w} />
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </Pressable>
      ))}
      {data && available.length === 0 ? (
        <Text style={styles.sub}>
          {picked.length > 0 ? 'All workouts are selected.' : `Every workout is already on ${daysLabel(days)}.`}
        </Text>
      ) : null}
      {hiddenCount > 0 && available.length > 0 ? (
        <Text style={styles.sub}>
          {countLabel(hiddenCount, 'workout')} already on {daysLabel(days)} {hiddenCount === 1 ? 'is' : 'are'}{' '}
          hidden.
        </Text>
      ) : null}

      <Button
        title={picked.length > 1 ? `Add ${picked.length} workouts to schedule` : 'Add to schedule'}
        onPress={save}
        loading={saving}
        style={styles.save}
      />
    </ScrollView>
  );
}

function WorkoutLabel({ workout, selected = false }: { workout: Workout; selected?: boolean }) {
  return (
    <View style={styles.flex}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>
        {workout.name}
      </Text>
      <Text style={styles.sub}>{countLabel(workout.exercises.length, 'exercise')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  heading: { fontSize: 16, fontFamily: fonts.heading, color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 14, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  order: { width: 16, fontWeight: '700', color: colors.primary },
  flex: { flex: 1 },
  optionText: { fontSize: 16, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  save: { marginTop: spacing.lg },
});
