import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NewExercise, WeightUnit } from '../lib/exercises';
import { parsePositiveNumber } from '../lib/format';
import type { WorkoutInput } from '../lib/workouts';
import { colors, radius, spacing } from '../theme';
import { Button, Chip, ErrorBanner, TextField } from './ui';

type ExerciseRow = { key: number; name: string; sets: string; reps: string; weight: string };

let nextKey = 0;
const emptyRow = (): ExerciseRow => ({ key: nextKey++, name: '', sets: '', reps: '', weight: '' });

function toCount(text: string): number | null {
  const n = parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Name and notes of a workout. New workouts also list their exercises here;
 * existing ones manage exercises on the workout screen.
 */
export function WorkoutForm({
  initial,
  withExercises,
  submitLabel,
  onSubmit,
}: {
  initial?: WorkoutInput;
  withExercises: boolean;
  submitLabel: string;
  onSubmit: (values: WorkoutInput, exercises: NewExercise[]) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [rows, setRows] = useState<ExerciseRow[]>(() => [emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function editRow(key: number, change: Partial<ExerciseRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  async function submit() {
    if (!name.trim()) return setError('Give the workout a name, e.g. Chest day.');
    const filled = withExercises ? rows.filter((r) => r.name.trim()) : [];
    if (filled.some((r) => r.weight.trim() && parsePositiveNumber(r.weight) === null)) {
      return setError('Weights must be numbers greater than 0.');
    }
    const exercises: NewExercise[] = filled.map((r) => ({
      name: r.name,
      notes: '',
      usesWeight: true,
      unit,
      sets: toCount(r.sets),
      reps: toCount(r.reps),
      startingWeight: parsePositiveNumber(r.weight),
    }));
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ name, notes }, exercises);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the workout.');
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <TextField label="Workout name" value={name} onChangeText={setName} placeholder="e.g. Chest day" />
      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        multiline
        style={styles.notes}
      />

      {withExercises ? (
        <>
          <View style={styles.exercisesHeader}>
            <Text style={styles.heading}>Exercises</Text>
            <View style={styles.chips}>
              <Chip label="kg" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
              <Chip label="lb" selected={unit === 'lb'} onPress={() => setUnit('lb')} />
            </View>
          </View>
          <Text style={styles.hint}>You can add more, reorder them and change weights later.</Text>

          {rows.map((row, index) => (
            <View key={row.key} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowNumber}>{index + 1}</Text>
                <View style={styles.flex}>
                  <TextField
                    label="Exercise"
                    value={row.name}
                    onChangeText={(text) => editRow(row.key, { name: text })}
                    placeholder="e.g. Incline dumbbell bench press"
                  />
                </View>
                {rows.length > 1 ? (
                  <Pressable
                    accessibilityLabel={`Remove exercise ${index + 1}`}
                    onPress={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    hitSlop={8}
                    style={styles.remove}>
                    <Ionicons name="close" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.numbers}>
                <View style={styles.flex}>
                  <TextField
                    label="Sets"
                    value={row.sets}
                    onChangeText={(text) => editRow(row.key, { sets: text })}
                    keyboardType="number-pad"
                    placeholder="3"
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label="Reps"
                    value={row.reps}
                    onChangeText={(text) => editRow(row.key, { reps: text })}
                    keyboardType="number-pad"
                    placeholder="12"
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    label={`Weight (${unit})`}
                    value={row.weight}
                    onChangeText={(text) => editRow(row.key, { weight: text })}
                    keyboardType="decimal-pad"
                    placeholder="Optional"
                  />
                </View>
              </View>
            </View>
          ))}

          <Button
            title="Add another exercise"
            variant="secondary"
            onPress={() => setRows((prev) => [...prev, emptyRow()])}
            style={styles.addRow}
          />
        </>
      ) : null}

      <Button title={submitLabel} onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  notes: { minHeight: 60, textAlignVertical: 'top' },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', gap: spacing.sm },
  hint: { fontSize: 13, color: colors.muted, marginBottom: spacing.md, marginTop: spacing.xs },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: 0,
    marginBottom: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowNumber: { width: 18, fontWeight: '700', color: colors.muted },
  remove: { paddingTop: spacing.md },
  numbers: { flexDirection: 'row', gap: spacing.sm, marginLeft: 18 + spacing.sm },
  flex: { flex: 1 },
  addRow: { marginBottom: spacing.lg },
});
