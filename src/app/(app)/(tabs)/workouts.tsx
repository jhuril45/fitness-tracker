import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { formatDay } from '../../../lib/dates';
import { formatSetsReps, formatWeight } from '../../../lib/format';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { listWorkouts } from '../../../lib/workouts';
import { colors, radius, spacing } from '../../../theme';

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const { data, error } = useLoadOnFocus(() => listWorkouts(db, user.id), [db, user.id]);

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(w) => String(w.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Link href="/workout/new" asChild>
          <Button title="Add workout" style={styles.add} />
        </Link>
      }
      ListEmptyComponent={
        data ? (
          <EmptyState
            title="No workouts yet"
            message="Add the exercises you do, like squats or a 5k run. Then put them on your schedule."
          />
        ) : error ? (
          <EmptyState title="Something went wrong" message={error} />
        ) : null
      }
      renderItem={({ item }) => {
        const detail = [
          formatSetsReps(item.sets, item.reps),
          item.currentWeight !== null ? formatWeight(item.currentWeight, item.unit) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Link href={{ pathname: '/workout/[id]', params: { id: String(item.id) } }} asChild>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.name}</Text>
                {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                {item.currentWeightSince ? (
                  <Text style={styles.since}>At this weight since {formatDay(item.currentWeightSince)}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm },
  add: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  detail: { fontSize: 15, color: colors.text, marginTop: 2 },
  since: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
