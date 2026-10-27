import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BMI_COLORS } from '../../../components/BmiCard';
import { Button, Card, EmptyState, ErrorBanner } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  bmi,
  BMI_LABELS,
  bmiCategory,
  deficitPlans,
  getHealthProfile,
  type HealthProfile,
  kgToLb,
  maintenanceCalories,
  MIN_CALORIES,
  proteinTarget,
  saveHealthProfile,
} from '../../../lib/health';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { colors, fonts, radius, spacing } from '../../../theme';

const kcal = (n: number) => `${Math.round(n).toLocaleString()} kcal`;

function weeklyLoss(kg: number, unit: HealthProfile['weightUnit']): string {
  return unit === 'kg' ? `${kg.toFixed(2)} kg` : `${kgToLb(kg).toFixed(1)} lb`;
}

/**
 * How many calories and how much protein to eat to lose weight, from the
 * details saved on the Health tab and the chosen activity level.
 */
export default function CalorieGuideScreen() {
  const user = useCurrentUser();
  // Wrapped so "no details saved yet" (null) isn't mistaken for "still loading".
  const { data, error: loadError, mutate } = useLoadOnFocus(
    async () => ({ profile: await getHealthProfile() }),
    [user.id],
  );
  const [error, setError] = useState<string | null>(null);

  if (loadError) return <EmptyState title="Something went wrong" message={loadError} />;
  if (!data) return <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />;
  if (!data.profile) {
    return (
      <View style={styles.content}>
        <EmptyState title="Add your details first" message="Enter your sex, age, weight and height on the Health tab." />
        <Button title="Back to Health" onPress={() => router.back()} />
      </View>
    );
  }
  const profile = data.profile;

  async function changeActivity(activity: ActivityLevel) {
    if (activity === profile.activity) return;
    setError(null);
    mutate((d) => (d.profile ? { profile: { ...d.profile, activity } } : d));
    try {
      await saveHealthProfile({ ...profile, activity });
    } catch (e) {
      mutate((d) => (d.profile ? { profile: { ...d.profile, activity: profile.activity } } : d));
      setError(e instanceof Error ? e.message : 'Could not save your activity level.');
    }
  }

  const value = bmi(profile.weightKg, profile.heightCm);
  const category = bmiCategory(value);
  const maintenance = maintenanceCalories(profile);
  const plans = deficitPlans(profile);
  const protein = proteinTarget(profile);
  const underweight = category === 'underweight';
  const minor = profile.age < 18;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          BMI <Text style={styles.summaryValue}>{value.toFixed(1)}</Text>
        </Text>
        <View style={[styles.badge, { backgroundColor: BMI_COLORS[category] }]}>
          <Text style={styles.badgeText}>{BMI_LABELS[category]}</Text>
        </View>
      </View>

      {underweight ? (
        <Note icon="alert-circle" tone="warning">
          Your BMI is under 18.5, so losing weight isn&apos;t recommended. Aim to eat around your maintenance
          calories or a little more, and talk to a doctor or dietitian.
        </Note>
      ) : null}
      {minor ? (
        <Note icon="alert-circle" tone="warning">
          You&apos;re under 18. Calorie targets for teens depend on growth, so check with a doctor before cutting
          calories.
        </Note>
      ) : null}

      <Card style={styles.activityCard}>
        <Text style={styles.caption}>How active are you?</Text>
        <View style={styles.levels} accessibilityRole="radiogroup">
          {ACTIVITY_LEVELS.map((a) => {
            const selected = a.id === profile.activity;
            return (
              <Pressable
                key={a.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityHint={a.detail}
                onPress={() => changeActivity(a.id)}
                style={[styles.level, selected && styles.levelSelected]}>
                <Text style={[styles.levelText, selected && styles.levelTextSelected]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.muted}>{ACTIVITY_LEVELS.find((a) => a.id === profile.activity)?.detail}</Text>
        <View style={styles.divider} />
        <View style={styles.maintenanceRow}>
          <View style={styles.flex}>
            <Text style={styles.caption}>Maintenance</Text>
            <Text style={styles.muted}>Keeps your weight about the same</Text>
          </View>
          <Text style={styles.maintenanceValue}>{kcal(maintenance)}</Text>
        </View>
      </Card>

      {!underweight ? (
        <>
          <Text style={styles.heading}>Daily calories to lose weight</Text>
          {plans.map((plan) => (
            <Card key={plan.id} style={[styles.plan, plan.id === 'steady' && styles.planRecommended]}>
              <View style={styles.planTop}>
                <Text style={styles.planLabel}>{plan.label}</Text>
                {plan.id === 'steady' ? <Text style={styles.tag}>Recommended</Text> : null}
              </View>
              <Text style={styles.big}>{kcal(plan.calories)}</Text>
              <Text style={styles.muted}>
                {plan.atMinimum
                  ? `Held at the ${kcal(MIN_CALORIES[profile.sex])} minimum`
                  : `${Math.round(plan.percent * 100)}% less than maintenance (−${kcal(plan.deficit)})`}{' '}
                · about {weeklyLoss(plan.kgPerWeek, profile.weightUnit)} a week
              </Text>
              {plan.tooFast ? (
                <Text style={styles.tooFast}>Faster than 1% of your body weight a week, which is hard to sustain.</Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      <Card style={styles.protein}>
        <View style={styles.proteinIcon}>
          <Ionicons name="nutrition" size={22} color={colors.onLight} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.caption}>Protein</Text>
          <Text style={styles.big}>
            {protein.min}–{protein.max} g
          </Text>
          <Text style={styles.muted}>
            a day ({protein.perKg.min.toFixed(1)}–{protein.perKg.max.toFixed(1)} g per kg of{' '}
            {protein.usesAdjustedWeight ? 'your weight capped at BMI 30' : 'body weight'} for your activity level), about{' '}
            {Math.round(protein.min / 4)}–{Math.round(protein.max / 4)} g over 4 meals. Enough protein while
            eating less helps you keep muscle and stay full.
          </Text>
        </View>
      </Card>

      <Text style={styles.footnote}>
        Calories use the Mifflin-St Jeor equation with standard activity multipliers; plans cut 10–25% of
        maintenance, and weekly loss assumes about 7,700 kcal per kg of fat. Protein follows the International
        Society of Sports Nutrition ranges. Real needs can differ by a few hundred calories, so weigh yourself
        weekly and adjust. Don&apos;t go below {kcal(MIN_CALORIES[profile.sex])} a day without
        medical advice. This is general guidance, not medical advice.
      </Text>
    </ScrollView>
  );
}

function Note({ icon, tone, children }: { icon: 'alert-circle'; tone: 'warning'; children: React.ReactNode }) {
  return (
    <View style={[styles.note, tone === 'warning' && styles.noteWarning]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  flex: { flex: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryText: { fontSize: 16, color: colors.muted, fontFamily: fonts.medium },
  summaryValue: { fontSize: 22, color: colors.text, fontFamily: fonts.heading },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 13, fontFamily: fonts.heading, color: colors.onLight },
  heading: { fontSize: 18, fontFamily: fonts.heading, color: colors.text, marginTop: spacing.sm },
  activityCard: { gap: spacing.sm },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  level: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.raised,
  },
  levelSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelText: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  levelTextSelected: { color: colors.onLight },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  maintenanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  maintenanceValue: { fontSize: 24, fontFamily: fonts.headingHeavy, color: colors.text },
  muted: { fontSize: 13, lineHeight: 18, color: colors.muted },
  caption: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted, textTransform: 'uppercase' },
  big: { fontSize: 28, fontFamily: fonts.headingHeavy, color: colors.text, marginVertical: 2 },
  plan: { gap: 2 },
  planRecommended: { borderColor: colors.primary },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planLabel: { fontSize: 15, fontFamily: fonts.heading, color: colors.primary },
  tag: {
    fontSize: 12,
    fontFamily: fonts.heading,
    color: colors.onLight,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  protein: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  proteinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  noteWarning: { backgroundColor: colors.primarySoft },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  tooFast: { fontSize: 12, color: colors.danger, marginTop: 2 },
  footnote: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: spacing.sm },
});
