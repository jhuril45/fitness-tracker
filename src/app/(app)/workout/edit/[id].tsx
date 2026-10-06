import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { WorkoutForm } from '../../../../components/WorkoutForm';
import { EmptyState } from '../../../../components/ui';
import { goBack } from '../../../../lib/navigation';
import { useLoadOnFocus } from '../../../../lib/useLoadOnFocus';
import { getWorkout, updateWorkout } from '../../../../lib/workouts';

export default function EditWorkoutScreen() {
  const { id: workoutId } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useLoadOnFocus(async () => ({ workout: await getWorkout(workoutId) }), [workoutId]);

  if (error) return <EmptyState title="Something went wrong" message={error} />;
  if (data === null) return <ActivityIndicator style={{ marginTop: 32 }} />;
  if (!data.workout) return <EmptyState title="Workout not found" message="It may have been deleted." />;

  return (
    <WorkoutForm
      initial={data.workout}
      withExercises={false}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        await updateWorkout(workoutId, input);
        goBack({ pathname: '/workout/[id]', params: { id: workoutId } });
      }}
    />
  );
}
