import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { WorkoutForm } from '../../../components/WorkoutForm';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { createWorkout } from '../../../lib/workouts';

export default function NewWorkoutScreen() {
  const db = useSQLiteContext();
  const user = useCurrentUser();

  return (
    <WorkoutForm
      askStartingWeight
      submitLabel="Save workout"
      onSubmit={async ({ startingWeight, ...input }) => {
        const id = await createWorkout(db, user.id, input, startingWeight);
        router.replace({ pathname: '/workout/[id]', params: { id: String(id) } });
      }}
    />
  );
}
