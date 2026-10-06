import { WorkoutForm } from '../../../components/WorkoutForm';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { goBack } from '../../../lib/navigation';
import { createWorkout } from '../../../lib/workouts';

export default function NewWorkoutScreen() {
  const user = useCurrentUser();

  return (
    <WorkoutForm
      withExercises
      submitLabel="Save workout"
      onSubmit={async (input, exercises) => {
        await createWorkout(user.id, input, exercises);
        goBack('/workouts');
      }}
    />
  );
}
