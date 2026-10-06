import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { Button, EmptyState } from '../../../components/ui';
import { WorkoutAccordion } from '../../../components/WorkoutAccordion';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { listWorkouts } from '../../../lib/workouts';
import { spacing } from '../../../theme';

export default function WorkoutsScreen() {
  const user = useCurrentUser();
  const { data, error } = useLoadOnFocus(() => listWorkouts(user.id), [user.id]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(w) => w.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Link href="/workout/new" asChild>
          <Button title="New workout" style={styles.add} />
        </Link>
      }
      ListEmptyComponent={
        data ? (
          <EmptyState
            title="No workouts yet"
            message="Create a workout like Chest day, add its exercises, then put it on your schedule."
          />
        ) : error ? (
          <EmptyState title="Something went wrong" message={error} />
        ) : null
      }
      renderItem={({ item }) => (
        <WorkoutAccordion workout={item} expanded={expanded.has(item.id)} onToggle={() => toggle(item.id)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm },
  add: { marginBottom: spacing.sm },
});
