import { StyleSheet, Text, View } from 'react-native';

import {
  bmi,
  BMI_LABELS,
  bmiCategory,
  type BmiCategory,
  formatWeightIn,
  healthyWeightRange,
  type WeightUnit,
} from '../lib/health';
import { colors, fonts, spacing } from '../theme';
import { Card } from './ui';

export const BMI_COLORS: Record<BmiCategory, string> = {
  underweight: '#8FB8FF',
  normal: colors.success,
  overweight: colors.primary,
  obese: colors.danger,
};

// The scale runs from BMI 15 to 40; each zone's width matches its range.
const SCALE_MIN = 15;
const SCALE_MAX = 40;
const ZONES: { category: BmiCategory; from: number; to: number }[] = [
  { category: 'underweight', from: 15, to: 18.5 },
  { category: 'normal', from: 18.5, to: 25 },
  { category: 'overweight', from: 25, to: 30 },
  { category: 'obese', from: 30, to: 40 },
];

/** BMI with its category, where it sits on the scale, and the healthy weight range. */
export function BmiCard({ weightKg, heightCm, weightUnit }: { weightKg: number; heightCm: number; weightUnit: WeightUnit }) {
  const value = bmi(weightKg, heightCm);
  const category = bmiCategory(value);
  const range = healthyWeightRange(heightCm);
  const position = (Math.min(Math.max(value, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);

  return (
    <Card style={styles.card}>
      <Text style={styles.caption}>Your BMI</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value.toFixed(1)}</Text>
        <View style={[styles.badge, { backgroundColor: BMI_COLORS[category] }]}>
          <Text style={styles.badgeText}>{BMI_LABELS[category]}</Text>
        </View>
      </View>

      <View style={styles.scale} accessibilityLabel={`BMI ${value.toFixed(1)}, ${BMI_LABELS[category]}`}>
        <View style={styles.zones}>
          {ZONES.map((z) => (
            <View
              key={z.category}
              style={[
                styles.zone,
                { flex: z.to - z.from, backgroundColor: BMI_COLORS[z.category] },
                z.category !== category && styles.zoneDim,
              ]}
            />
          ))}
        </View>
        <View style={[styles.marker, { left: `${position * 100}%` }]} />
      </View>
      <View style={styles.ticks}>
        {['18.5', '25', '30'].map((t) => (
          <Text key={t} style={[styles.tick, { left: `${((Number(t) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%` }]}>
            {t}
          </Text>
        ))}
      </View>

      <Text style={styles.range}>
        Healthy weight for your height:{' '}
        <Text style={styles.rangeValue}>
          {formatWeightIn(range.min, weightUnit)} – {formatWeightIn(range.max, weightUnit)}
        </Text>
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  caption: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  value: { fontSize: 40, fontFamily: fonts.headingHeavy, color: colors.text },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 13, fontFamily: fonts.heading, color: colors.onLight },
  scale: { height: 18, justifyContent: 'center', marginTop: spacing.sm },
  zones: { flexDirection: 'row', height: 8, borderRadius: 999, overflow: 'hidden', gap: 2 },
  zone: { height: '100%' },
  zoneDim: { opacity: 0.35 },
  marker: {
    position: 'absolute',
    width: 4,
    height: 18,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  ticks: { height: 16 },
  tick: { position: 'absolute', width: 32, marginLeft: -16, textAlign: 'center', fontSize: 11, color: colors.muted },
  range: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
  rangeValue: { color: colors.text, fontFamily: fonts.medium },
});
