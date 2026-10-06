import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useConfirm } from '../../../components/ConfirmDialog';
import { Button, Card, EmptyState, ErrorBanner, TextField } from '../../../components/ui';
import { formatDay, toDayString } from '../../../lib/dates';
import { changeWeight, deleteExercise, getExerciseDetail } from '../../../lib/exercises';
import { formatSetsReps, formatWeight, parsePositiveNumber } from '../../../lib/format';
import { goBack } from '../../../lib/navigation';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { summarizePeriod } from '../../../lib/weightHistory';
import { colors, radius, spacing } from '../../../theme';

export default function ExerciseDetailScreen() {
  const { id: exerciseId } = useLocalSearchParams<{ id: string }>();
  const confirm = useConfirm();
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    error: loadError,
    reload,
  } = useLoadOnFocus(() => getExerciseDetail(exerciseId), [exerciseId]);

  if (loadError) return <EmptyState title="Something went wrong" message={loadError} />;
  if (!data) return <ActivityIndicator style={{ marginTop: 32 }} />;
  const { exercise, history } = data;
  if (!exercise) return <EmptyState title="Exercise not found" message="It may have been deleted." />;

  const today = toDayString();
  const periods = history.map((p) => ({ ...summarizePeriod(p, today), sessions: p.sessions }));
  const current = periods.find((p) => p.isCurrent);
  const setsReps = formatSetsReps(exercise.sets, exercise.reps);

  async function saveWeight() {
    const value = parsePositiveNumber(newWeight);
    if (value === null) return setError('Enter a weight greater than 0.');
    setError(null);
    setSaving(true);
    try {
      await changeWeight(exerciseId, value);
      setNewWeight('');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the weight.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const deleted = await confirm({
      title: `Delete ${exercise!.name}?`,
      message: 'This also removes its weight history and check-offs.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteExercise(exerciseId),
    });
    if (deleted) goBack('/workouts');
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: exercise.name,
          headerRight: () => (
            <Link
              href={{ pathname: '/exercise/edit/[id]', params: { id: exerciseId } }}
              style={styles.headerLink}>
              Edit
            </Link>
          ),
        }}
      />

      {setsReps || exercise.notes ? (
        <Card style={styles.section}>
          {setsReps ? <Text style={styles.big}>{setsReps}</Text> : null}
          {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}
        </Card>
      ) : null}

      {exercise.usesWeight ? (
        <>
          <Card style={styles.section}>
            <Text style={styles.caption}>Current weight</Text>
            {current ? (
              <>
                <Text style={styles.weight}>{formatWeight(current.weight, exercise.unit)}</Text>
                <Text style={styles.muted}>
                  Since {formatDay(current.startDate)} · {current.durationLabel} · {current.sessions}{' '}
                  {current.sessions === 1 ? 'session' : 'sessions'}
                </Text>
              </>
            ) : (
              <Text style={styles.muted}>No weight set yet.</Text>
            )}

            <View style={styles.changeRow}>
              <View style={styles.flex}>
                <TextField
                  label={current ? `New weight (${exercise.unit})` : `Weight (${exercise.unit})`}
                  value={newWeight}
                  onChangeText={setNewWeight}
                  keyboardType="decimal-pad"
                  placeholder={current ? String(current.weight) : '20'}
                  onSubmitEditing={saveWeight}
                />
              </View>
              <Button
                title={current ? 'Change' : 'Set'}
                onPress={saveWeight}
                loading={saving}
                disabled={!newWeight.trim()}
                style={styles.changeButton}
              />
            </View>
            <ErrorBanner message={error} />
            {current ? (
              <Text style={styles.hint}>
                Your previous weights stay in the history below, with how long you used each one.
              </Text>
            ) : null}
          </Card>

          <Text style={styles.heading}>Weight history</Text>
          {periods.length === 0 ? (
            <Text style={styles.muted}>Weights you set will show up here.</Text>
          ) : (
            <View style={styles.timeline}>
              {periods.map((p) => (
                <View key={p.id} style={[styles.period, p.isCurrent && styles.periodCurrent]}>
                  <View style={styles.periodTop}>
                    <Text style={styles.periodWeight}>{formatWeight(p.weight, exercise.unit)}</Text>
                    <Text style={[styles.badge, p.isCurrent && styles.badgeCurrent]}>
                      {p.weeks} {p.weeks === 1 ? 'week' : 'weeks'}
                    </Text>
                  </View>
                  <Text style={styles.muted}>
                    {formatDay(p.startDate)} – {p.endDate ? formatDay(p.endDate) : 'now'} ({p.durationLabel})
                  </Text>
                  <Text style={styles.muted}>
                    {p.sessions} {p.sessions === 1 ? 'session' : 'sessions'} completed
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}

      <Button title="Delete exercise" variant="dangerSoft" onPress={confirmDelete} style={styles.delete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  headerLink: { color: colors.primary, fontSize: 17 },
  section: { marginBottom: spacing.lg },
  big: { fontSize: 22, fontWeight: '700', color: colors.text },
  notes: { fontSize: 15, color: colors.text, marginTop: spacing.xs },
  caption: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' },
  weight: { fontSize: 36, fontWeight: '800', color: colors.text, marginVertical: spacing.xs },
  muted: { fontSize: 14, color: colors.muted },
  hint: { fontSize: 13, color: colors.muted },
  changeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  changeButton: { marginBottom: spacing.md },
  flex: { flex: 1 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  timeline: { gap: spacing.sm },
  period: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  periodCurrent: { borderColor: colors.primary },
  periodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodWeight: { fontSize: 18, fontWeight: '700', color: colors.text },
  badge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeCurrent: { color: colors.primary, backgroundColor: colors.primarySoft },
  delete: { marginTop: spacing.xl },
});
