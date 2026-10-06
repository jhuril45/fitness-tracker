import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ExerciseForm } from '../../../../components/ExerciseForm';
import { EmptyState } from '../../../../components/ui';
import { getExercise, updateExercise } from '../../../../lib/exercises';
import { useLoadOnFocus } from '../../../../lib/useLoadOnFocus';

export default function EditExerciseScreen() {
  const { id: exerciseId } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useLoadOnFocus(async () => ({ exercise: await getExercise(exerciseId) }), [exerciseId]);

  if (error) return <EmptyState title="Something went wrong" message={error} />;
  if (data === null) return <ActivityIndicator style={{ marginTop: 32 }} />;
  if (!data.exercise) return <EmptyState title="Exercise not found" message="It may have been deleted." />;

  return (
    <ExerciseForm
      initial={data.exercise}
      askStartingWeight={false}
      submitLabel="Save changes"
      onSubmit={async ({ startingWeight: _ignored, ...input }) => {
        await updateExercise(exerciseId, input);
        router.back();
      }}
    />
  );
}
