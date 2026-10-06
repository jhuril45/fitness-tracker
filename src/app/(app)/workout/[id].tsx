import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorBanner } from '../../../components/ui';
import { confirmAction } from '../../../lib/confirm';
import { moveExercise } from '../../../lib/exercises';
import { countLabel, describeExercise } from '../../../lib/format';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { deleteWorkout, getWorkout } from '../../../lib/workouts';
import { colors, spacing } from '../../../theme';

export default function WorkoutDetailScreen() {
  const { id: workoutId } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const { data, error: loadError, reload } = useLoadOnFocus(
    async () => ({ workout: await getWorkout(workoutId) }),
    [workoutId],
  );

  if (loadError) return <EmptyState title="Something went wrong" message={loadError} />;
  if (!data) return <ActivityIndicator style={{ marginTop: 32 }} />;
  const { workout } = data;
  if (!workout) return <EmptyState title="Workout not found" message="It may have been deleted." />;
  const { exercises } = workout;

  async function move(exerciseId: string, direction: -1 | 1) {
    try {
      await moveExercise(workoutId, exerciseId, direction);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reorder the exercises.');
    }
  }

  async function confirmDelete() {
    const ok = await confirmAction(
      `Delete ${workout!.name}?`,
      'This also deletes its exercises and their weight history, and takes it off your schedule.',
      'Delete',
    );
    if (!ok) return;
    try {
      await deleteWorkout(workoutId);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the workout.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: workout.name,
          headerRight: () => (
            <Link href={{ pathname: '/workout/edit/[id]', params: { id: workoutId } }} style={styles.headerLink}>
              Edit
            </Link>
          ),
        }}
      />
      <ErrorBanner message={error} />
      {workout.notes ? <Text style={styles.notes}>{workout.notes}</Text> : null}

      <Text style={styles.heading}>{countLabel(exercises.length, 'exercise')}</Text>
      <Card style={styles.list}>
        {exercises.length === 0 ? (
          <Text style={styles.muted}>Add the exercises you do in this workout.</Text>
        ) : (
          exercises.map((exercise, index) => {
            const detail = describeExercise(exercise);
            return (
              <View key={exercise.id} style={[styles.item, index > 0 && styles.itemBorder]}>
                <Text style={styles.order}>{index + 1}</Text>
                <Link href={{ pathname: '/exercise/[id]', params: { id: exercise.id } }} asChild>
                  <Pressable style={styles.flex}>
                    <Text style={styles.itemName}>{exercise.name}</Text>
                    {detail ? <Text style={styles.muted}>{detail}</Text> : null}
                  </Pressable>
                </Link>
                <Pressable
                  accessibilityLabel="Move up"
                  disabled={index === 0}
                  onPress={() => move(exercise.id, -1)}
                  hitSlop={6}>
                  <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Move down"
                  disabled={index === exercises.length - 1}
                  onPress={() => move(exercise.id, 1)}
                  hitSlop={6}>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={index === exercises.length - 1 ? colors.border : colors.muted}
                  />
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      <Link href={{ pathname: '/exercise/new', params: { workoutId } }} asChild>
        <Button title="Add exercise" />
      </Link>
      <Link href={{ pathname: '/schedule/add', params: { workoutId } }} asChild>
        <Button title="Add to schedule" variant="secondary" />
      </Link>
      <Button title="Delete workout" variant="ghost" onPress={confirmDelete} style={styles.delete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  headerLink: { color: colors.primary, fontSize: 17 },
  notes: { fontSize: 15, color: colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  list: { paddingVertical: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  order: { width: 20, color: colors.muted, fontWeight: '600' },
  flex: { flex: 1 },
  itemName: { fontSize: 16, color: colors.text, fontWeight: '500' },
  muted: { fontSize: 14, color: colors.muted },
  delete: { marginTop: spacing.lg },
});
