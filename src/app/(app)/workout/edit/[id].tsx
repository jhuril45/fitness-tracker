import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator } from 'react-native';

import { WorkoutForm } from '../../../../components/WorkoutForm';
import { EmptyState } from '../../../../components/ui';
import { useCurrentUser } from '../../../../lib/auth/AuthContext';
import { useLoadOnFocus } from '../../../../lib/useLoadOnFocus';
import { getWorkout, updateWorkout } from '../../../../lib/workouts';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const db = useSQLiteContext();
  const user = useCurrentUser();
  const { data, error } = useLoadOnFocus(
    async () => ({ workout: await getWorkout(db, user.id, workoutId) }),
    [db, user.id, workoutId],
  );

  if (error) return <EmptyState title="Something went wrong" message={error} />;
  if (data === null) return <ActivityIndicator style={{ marginTop: 32 }} />;
  if (!data.workout) return <EmptyState title="Workout not found" message="It may have been deleted." />;

  return (
    <WorkoutForm
      initial={data.workout}
      askStartingWeight={false}
      submitLabel="Save changes"
      onSubmit={async ({ startingWeight: _ignored, ...input }) => {
        await updateWorkout(db, user.id, workoutId, input);
        router.back();
      }}
    />
  );
}
