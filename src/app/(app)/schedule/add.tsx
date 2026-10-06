import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, EmptyState, ErrorBanner } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { DAY_NAMES } from '../../../lib/dates';
import { addToSchedule } from '../../../lib/schedule';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { listWorkouts } from '../../../lib/workouts';
import { colors, radius, spacing } from '../../../theme';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function AddToScheduleScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const { data: workouts } = useLoadOnFocus(() => listWorkouts(db, user.id), [db, user.id]);

  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [days, setDays] = useState<number[]>(params.day ? [Number(params.day)] : []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const everyDay = days.length === 7;

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  async function save() {
    if (workoutId === null) return setError('Pick a workout.');
    if (days.length === 0) return setError('Pick at least one day.');
    setSaving(true);
    try {
      await addToSchedule(db, user.id, workoutId, days);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the schedule.');
      setSaving(false);
    }
  }

  if (workouts && workouts.length === 0) {
    return (
      <View style={styles.content}>
        <EmptyState title="No workouts yet" message="Create a workout first, then add it to your schedule." />
        <Link href="/workout/new" asChild>
          <Button title="Add workout" />
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />
      <Text style={styles.heading}>Workout</Text>
      <View style={styles.options}>
        {(workouts ?? []).map((w) => (
          <Pressable
            key={w.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: workoutId === w.id }}
            onPress={() => setWorkoutId(w.id)}
            style={[styles.option, workoutId === w.id && styles.optionSelected]}>
            <Text style={[styles.optionText, workoutId === w.id && styles.optionTextSelected]}>{w.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.heading}>How often</Text>
      <View style={styles.chips}>
        <Chip label="Every day" selected={everyDay} onPress={() => setDays(everyDay ? [] : ALL_DAYS)} />
      </View>
      <Text style={styles.sub}>Or pick days of the week</Text>
      <View style={styles.chips}>
        {ALL_DAYS.map((d) => (
          <Chip key={d} label={DAY_NAMES[d]} selected={days.includes(d)} onPress={() => toggleDay(d)} />
        ))}
      </View>

      <Button title="Add to schedule" onPress={save} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  sub: { fontSize: 14, color: colors.muted },
  options: { gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { fontSize: 16, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  save: { marginTop: spacing.lg },
});
