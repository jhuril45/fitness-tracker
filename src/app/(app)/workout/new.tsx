import { WorkoutForm } from '../../../components/WorkoutForm';
import { goBack } from '../../../lib/navigation';
import { createWorkout } from '../../../lib/workouts';

export default function NewWorkoutScreen() {
  return (
    <WorkoutForm
      withExercises
      submitLabel="Save workout"
      onSubmit={async (input, exercises) => {
        await createWorkout(input, exercises);
        goBack('/workouts');
      }}
    />
  );
}
