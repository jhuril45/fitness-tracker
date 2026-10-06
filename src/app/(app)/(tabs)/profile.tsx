import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '../../../components/ui';
import { useAuth, useCurrentUser } from '../../../lib/auth/AuthContext';
import { countCompletions } from '../../../lib/schedule';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { listWorkouts } from '../../../lib/workouts';
import { colors, spacing } from '../../../theme';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { data } = useLoadOnFocus(
    async () => ({
      workouts: (await listWorkouts(user.id)).length,
      sessions: await countCompletions(user.id),
    }),
    [user.id],
  );

  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // Signed out locally anyway; the screen unmounts on success.
      setSigningOut(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </Card>
      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{data?.workouts ?? '–'}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{data?.sessions ?? '–'}</Text>
          <Text style={styles.statLabel}>Exercises done</Text>
        </Card>
      </View>
      <Button title="Sign out" variant="secondary" onPress={signOut} loading={signingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  email: { fontSize: 15, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
});
