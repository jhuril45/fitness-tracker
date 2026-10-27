import Ionicons from '@expo/vector-icons/Ionicons';
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
      <Card style={styles.streak}>
        <View style={styles.flame}>
          <Ionicons name="flame" size={28} color={colors.onLight} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.streakValue}>
            {data?.currentStreak ?? '–'}
            <Text style={styles.streakUnit}> {data?.currentStreak === 1 ? 'day' : 'days'}</Text>
          </Text>
          <Text style={[styles.statLabel, styles.streakLabel]}>Current streak</Text>
        </View>
        <View style={styles.best}>
          <Text style={styles.bestValue}>{data?.bestStreak ?? '–'}</Text>
          <Text style={styles.statLabel}>Best</Text>
        </View>
      </Card>
      <Text style={styles.hint}>
        Days with every scheduled workout finished. Rest days don&apos;t break your streak.
      </Text>
      <View style={styles.stats}>
        <Stat value={data?.workouts} label="Workouts" />
        <Stat value={data?.workoutsFinished} label="Workouts finished" />
        <Stat value={data?.completions} label="Exercises done" />
      </View>
      <Button title="Sign out" variant="secondary" onPress={signOut} loading={signingOut} />
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '–'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderColor: colors.primary },
  flame: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: { fontSize: 32, fontFamily: fonts.headingHeavy, color: colors.text },
  streakUnit: { fontSize: 16, fontFamily: fonts.medium, color: colors.muted },
  best: { alignItems: 'center', paddingLeft: spacing.lg, borderLeftWidth: 1, borderLeftColor: colors.border },
  streakLabel: { textAlign: 'left' },
  bestValue: { fontSize: 22, fontFamily: fonts.heading, color: colors.primary },
  hint: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: -spacing.xs, paddingHorizontal: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1 },
  name: { fontSize: 22, fontFamily: fonts.heading, color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  statValue: { fontSize: 26, fontFamily: fonts.headingHeavy, color: colors.primary },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
