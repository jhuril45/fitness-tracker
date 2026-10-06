import { router, useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '../../../components/ExerciseForm';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { addExercises } from '../../../lib/exercises';

/** Adds an exercise to the end of the workout given as `?workoutId=`. */
export default function NewExerciseScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const user = useCurrentUser();

  return (
    <ExerciseForm
      askStartingWeight
      submitLabel="Add exercise"
      onSubmit={async (exercise) => {
        await addExercises(user.id, workoutId, [exercise]);
        router.back();
      }}
    />
  );
}
