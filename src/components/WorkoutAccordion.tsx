import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { countLabel, describeExercise } from '../lib/format';
import type { Workout } from '../lib/workouts';
import { colors, spacing } from '../theme';
import { Accordion, AccordionAction, AccordionActions } from './Accordion';

/** A workout that expands to show its exercises, with a shortcut to add one. */
export function WorkoutAccordion({
  workout,
  expanded,
  onToggle,
}: {
  workout: Workout;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Accordion
      icon="barbell-outline"
      title={workout.name}
      subtitle={countLabel(workout.exercises.length, 'exercise')}
      expanded={expanded}
      onToggle={onToggle}>
      {workout.notes ? <Text style={styles.notes}>{workout.notes}</Text> : null}

      {workout.exercises.length === 0 ? (
        <Text style={styles.empty}>No exercises yet.</Text>
      ) : (
        workout.exercises.map((exercise, index) => {
          const detail = describeExercise(exercise);
          // Link asChild drops a Pressable's function style on web, so this one is static.
          return (
            <Link key={exercise.id} href={{ pathname: '/exercise/[id]', params: { id: exercise.id } }} asChild>
              <Pressable style={styles.exercise}>
                <Text style={styles.order}>{index + 1}</Text>
                <View style={styles.flex}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            </Link>
          );
        })
      )}

      <AccordionActions>
        <AccordionAction
          href={{ pathname: '/exercise/new', params: { workoutId: workout.id } }}
          icon="add-circle-outline"
          label="Add exercise"
        />
        <AccordionAction href={{ pathname: '/workout/[id]', params: { id: workout.id } }} icon="create-outline" label="Manage" />
      </AccordionActions>
    </Accordion>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notes: { fontSize: 14, color: colors.muted, paddingVertical: spacing.sm },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: spacing.md },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  order: { width: 20, color: colors.muted, fontWeight: '600' },
  exerciseName: { fontSize: 16, color: colors.text, fontWeight: '500' },
  detail: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
