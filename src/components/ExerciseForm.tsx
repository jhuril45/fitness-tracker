import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { parsePositiveNumber } from '../lib/format';
import type { ExerciseInput, NewExercise, WeightUnit } from '../lib/exercises';
import { colors, spacing } from '../theme';
import { Button, Chip, ErrorBanner, TextField } from './ui';

export function ExerciseForm({
  initial,
  askStartingWeight,
  submitLabel,
  onSubmit,
}: {
  initial?: ExerciseInput;
  /** Only new exercises ask for a weight; existing ones change it on the detail screen. */
  askStartingWeight: boolean;
  submitLabel: string;
  onSubmit: (values: NewExercise) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [usesWeight, setUsesWeight] = useState(initial?.usesWeight ?? true);
  const [unit, setUnit] = useState<WeightUnit>(initial?.unit ?? 'kg');
  const [sets, setSets] = useState(initial?.sets ? String(initial.sets) : '');
  const [reps, setReps] = useState(initial?.reps ? String(initial.reps) : '');
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return setError('Give the exercise a name.');
    const startingWeight = askStartingWeight && usesWeight ? parsePositiveNumber(weight) : null;
    if (askStartingWeight && usesWeight && weight.trim() && startingWeight === null) {
      return setError('Weight must be a number greater than 0.');
    }
    const toCount = (text: string) => {
      const n = parseInt(text, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        name,
        notes,
        usesWeight,
        unit,
        sets: toCount(sets),
        reps: toCount(reps),
        startingWeight,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the exercise.');
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Incline dumbbell bench press" />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Sets"
            value={sets}
            onChangeText={setSets}
            keyboardType="number-pad"
            placeholder="3"
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label="Reps"
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="12"
          />
        </View>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.switchLabel}>Uses weights</Text>
          <Text style={styles.hint}>Track the weight you lift and how long you stay at each one.</Text>
        </View>
        <Switch value={usesWeight} onValueChange={setUsesWeight} />
      </View>

      {usesWeight ? (
        <>
          <Text style={styles.switchLabel}>Unit</Text>
          <View style={styles.chips}>
            <Chip label="kg" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
            <Chip label="lb" selected={unit === 'lb'} onPress={() => setUnit('lb')} />
          </View>
          {askStartingWeight ? (
            <TextField
              label={`Starting weight (${unit})`}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="Optional"
            />
          ) : null}
        </>
      ) : null}

      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        multiline
        style={styles.notes}
      />
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  hint: { fontSize: 13, color: colors.muted },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  notes: { minHeight: 80, textAlignVertical: 'top' },
});
