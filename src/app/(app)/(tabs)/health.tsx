import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Link } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BmiCard } from '../../../components/BmiCard';
import { Button, Card, EmptyState } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import { cmToFeetInches, formatWeightIn, getHealthProfile, type HealthProfile } from '../../../lib/health';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { colors, fonts, spacing } from '../../../theme';

/** Ionicons has no scale or measuring tape, so those two come from Material Community Icons. */
type TileIcon =
  | { set: 'ion'; name: React.ComponentProps<typeof Ionicons>['name'] }
  | { set: 'mci'; name: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };

/** The saved body details as four tiles, in the user's chosen units. */
function DetailsCard({ profile: p }: { profile: HealthProfile }) {
  const { feet, inches } = cmToFeetInches(p.heightCm);
  const items: { icon: TileIcon; label: string; value: string }[] = [
    {
      icon: { set: 'ion', name: p.sex === 'male' ? 'male' : 'female' },
      label: 'Sex',
      value: p.sex === 'male' ? 'Male' : 'Female',
    },
    { icon: { set: 'ion', name: 'calendar-outline' }, label: 'Age', value: `${p.age} yrs` },
    { icon: { set: 'mci', name: 'scale-bathroom' }, label: 'Weight', value: formatWeightIn(p.weightKg, p.weightUnit) },
    {
      icon: { set: 'mci', name: 'tape-measure' },
      label: 'Height',
      value: p.heightUnit === 'cm' ? `${Math.round(p.heightCm)} cm` : `${feet}′ ${inches}″`,
    },
  ];
  return (
    <Card style={styles.detailsCard}>
      <Text style={styles.caption}>Body details</Text>
      <View style={styles.detailsRow}>
        {items.map((item) => (
          <View key={item.label} style={styles.detail} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
            <View style={styles.detailIcon}>
              {item.icon.set === 'ion' ? (
                <Ionicons name={item.icon.name} size={18} color={colors.primary} />
              ) : (
                <MaterialCommunityIcons name={item.icon.name} size={19} color={colors.primary} />
              )}
            </View>
            <Text style={styles.detailValue}>{item.value}</Text>
            <Text style={styles.detailLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function HealthScreen() {
  const user = useCurrentUser();
  // Wrapped so "no details saved yet" (null) isn't mistaken for "still loading".
  const { data, error } = useLoadOnFocus(async () => ({ profile: await getHealthProfile() }), [user.id]);

  if (error && !data) return <EmptyState title="Something went wrong" message={error} />;
  if (!data) return <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />;
  const { profile } = data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {profile ? (
        <>
          <BmiCard weightKg={profile.weightKg} heightCm={profile.heightCm} weightUnit={profile.weightUnit} />
          <DetailsCard profile={profile} />
        </>
      ) : (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="body-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Set your body details</Text>
          <Text style={styles.emptyText}>
            Add your sex, age, weight and height to see your BMI and get your calorie and protein guide.
          </Text>
        </Card>
      )}

      <Link href="/health/details" asChild>
        <Button
          title={profile ? 'Edit Body Details' : 'Set Body Details'}
          variant={profile ? 'secondary' : 'primary'}
        />
      </Link>
      {profile ? (
        <Link href="/health/guide" asChild>
          <Button title="Calorie Deficit Guide" />
        </Link>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  detailsCard: { gap: spacing.md },
  caption: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted, textTransform: 'uppercase' },
  detailsRow: { flexDirection: 'row', gap: spacing.sm },
  detail: { flex: 1, alignItems: 'center', gap: 4 },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  detailValue: { fontSize: 17, fontFamily: fonts.heading, color: colors.text },
  detailLabel: { fontSize: 12, color: colors.muted },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.text },
  emptyText: { fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});
