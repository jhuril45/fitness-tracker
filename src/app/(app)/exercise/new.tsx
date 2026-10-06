import { useLocalSearchParams } from 'expo-router';

import { ExerciseForm } from '../../../components/ExerciseForm';
import { addExercises } from '../../../lib/exercises';
import { goBack } from '../../../lib/navigation';

/** Adds an exercise to the end of the workout given as `?workoutId=`. */
export default function NewExerciseScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  return (
    <ExerciseForm
      askStartingWeight
      submitLabel="Add exercise"
      onSubmit={async (exercise) => {
        await addExercises(workoutId, [exercise]);
        goBack({ pathname: '/workout/[id]', params: { id: workoutId } });
      }}
    />
  );
}
