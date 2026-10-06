import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Logo } from '../../../components/Logo';
import { Button, Card } from '../../../components/ui';
import { useAuth, useCurrentUser } from '../../../lib/auth/AuthContext';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { getProfileStats } from '../../../lib/workouts';
import { colors, fonts, spacing } from '../../../theme';

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { data } = useLoadOnFocus(getProfileStats, [user.id]);

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
      <Card style={styles.identity}>
        <Logo size={48} />
        <View style={styles.flex}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Card>
      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{data?.workouts ?? '–'}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{data?.completions ?? '–'}</Text>
          <Text style={styles.statLabel}>Exercises done</Text>
        </Card>
      </View>
      <Button title="Sign out" variant="secondary" onPress={signOut} loading={signingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1 },
  name: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 30, fontFamily: fonts.headingHeavy, color: colors.primary },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
