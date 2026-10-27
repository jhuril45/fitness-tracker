import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, ErrorBanner, TextField } from '../../../components/ui';
import { useCurrentUser } from '../../../lib/auth/AuthContext';
import {
  cmToFeetInches,
  feetInchesToCm,
  getHealthProfile,
  type HealthProfile,
  type HeightUnit,
  kgToLb,
  lbToKg,
  LIMITS,
  saveHealthProfile,
  type Sex,
  type WeightUnit,
} from '../../../lib/health';
import { parsePositiveNumber } from '../../../lib/format';
import { goBack } from '../../../lib/navigation';
import { useLoadOnFocus } from '../../../lib/useLoadOnFocus';
import { colors, fonts, spacing } from '../../../theme';

/** What's typed in the form; numbers stay as text until they're valid. */
type Form = {
  sex: Sex | null;
  age: string;
  weight: string;
  weightUnit: WeightUnit;
  /** Exact kg behind `weight` after a unit switch, so switching back and forth doesn't drift. */
  exactKg: number | null;
  cm: string;
  feet: string;
  inches: string;
  heightUnit: HeightUnit;
};

const EMPTY: Form = {
  sex: null,
  age: '',
  weight: '',
  weightUnit: 'kg',
  exactKg: null,
  cm: '',
  feet: '',
  inches: '',
  heightUnit: 'cm',
};

const trim1 = (n: number) => String(Math.round(n * 10) / 10);

function toForm(p: HealthProfile): Form {
  const { feet, inches } = cmToFeetInches(p.heightCm);
  return {
    sex: p.sex,
    age: String(p.age),
    weight: trim1(p.weightUnit === 'kg' ? p.weightKg : kgToLb(p.weightKg)),
    weightUnit: p.weightUnit,
    exactKg: p.weightKg,
    cm: trim1(p.heightCm),
    feet: String(feet),
    inches: String(inches),
    heightUnit: p.heightUnit,
  };
}

/** The form as metric numbers, or null while something is missing or out of range. */
function measurements(f: Form) {
  const age = parsePositiveNumber(f.age);
  const weight = parsePositiveNumber(f.weight);
  // A converted value is rounded for display; keep the exact one while the text still matches it.
  const shownExact = f.exactKg !== null && trim1(f.weightUnit === 'kg' ? f.exactKg : kgToLb(f.exactKg)) === f.weight.trim();
  const weightKg =
    weight === null ? null : shownExact ? f.exactKg : f.weightUnit === 'kg' ? weight : lbToKg(weight);
  const feet = Number(f.feet.trim() || 'NaN');
  const inches = Number(f.inches.trim() || '0');
  const cm = parsePositiveNumber(f.cm);
  const fromCm = cm === null ? null : cmToFeetInches(cm);
  const cmMatchesFeet = fromCm !== null && fromCm.feet === feet && fromCm.inches === inches;
  const heightCm =
    f.heightUnit === 'cm'
      ? cm
      : cmMatchesFeet
        ? cm
        : Number.isFinite(feet) && Number.isFinite(inches) && feet > 0
          ? feetInchesToCm(feet, inches)
          : null;
  const inRange = (v: number | null, l: { min: number; max: number }) => v !== null && v >= l.min && v <= l.max;
  return {
    age,
    weightKg,
    heightCm,
    errors: {
      age: age !== null && !inRange(age, LIMITS.age) ? `Enter an age from ${LIMITS.age.min} to ${LIMITS.age.max}.` : undefined,
      weight: weightKg !== null && !inRange(weightKg, LIMITS.weightKg) ? 'That weight looks out of range.' : undefined,
      height: heightCm !== null && !inRange(heightCm, LIMITS.heightCm) ? 'That height looks out of range.' : undefined,
    },
    valid:
      f.sex !== null &&
      inRange(age, LIMITS.age) &&
      inRange(weightKg, LIMITS.weightKg) &&
      inRange(heightCm, LIMITS.heightCm),
  };
}

/** The form for sex, age, weight and height, opened from the Health tab. */
export default function BodyDetailsScreen() {
  const user = useCurrentUser();
  // Wrapped so "no details saved yet" (null) isn't mistaken for "still loading".
  const { data, error: loadError } = useLoadOnFocus(
    async () => ({ profile: await getHealthProfile() }),
    [user.id],
  );
  const saved = data?.profile ?? null;
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill the form once, from what's saved (or blank for a first visit).
  useEffect(() => {
    if (form === null && data) setForm(data.profile ? toForm(data.profile) : EMPTY);
  }, [data, form]);

  if (loadError && !form) return <EmptyState title="Something went wrong" message={loadError} />;
  if (!form) return <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />;

  const m = measurements(form);
  const set = (change: Partial<Form>) => setForm({ ...form, ...change });

  function changeWeightUnit(unit: WeightUnit) {
    if (unit === form!.weightUnit) return;
    const kg = m.weightKg;
    set({
      weightUnit: unit,
      weight: kg === null ? form!.weight : trim1(unit === 'lb' ? kgToLb(kg) : kg),
      exactKg: kg,
    });
  }

  function changeHeightUnit(unit: HeightUnit) {
    if (unit === form!.heightUnit) return;
    if (m.heightCm === null) return set({ heightUnit: unit });
    const { feet, inches } = cmToFeetInches(m.heightCm);
    set({ heightUnit: unit, cm: trim1(m.heightCm), feet: String(feet), inches: String(inches) });
  }

  const profile: HealthProfile | null = m.valid
    ? {
        sex: form.sex!,
        age: m.age!,
        weightKg: m.weightKg!,
        heightCm: m.heightCm!,
        weightUnit: form.weightUnit,
        heightUnit: form.heightUnit,
        activity: saved?.activity ?? 'moderate',
      }
    : null;
  const unchanged =
    !!saved &&
    !!profile &&
    saved.sex === profile.sex &&
    saved.age === Math.round(profile.age) &&
    Math.abs(saved.weightKg - profile.weightKg) < 0.06 &&
    Math.abs(saved.heightCm - profile.heightCm) < 0.06 &&
    saved.weightUnit === profile.weightUnit &&
    saved.heightUnit === profile.heightUnit;

  async function save() {
    if (!profile) return;
    if (unchanged) return goBack('/health');
    setError(null);
    setSaving(true);
    try {
      await saveHealthProfile(profile);
      goBack('/health');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details.');
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <Card>
        <Text style={styles.heading}>Your details</Text>

        <Text style={styles.label}>Sex</Text>
        <View style={styles.chips}>
          <Chip label="Male" selected={form.sex === 'male'} onPress={() => set({ sex: 'male' })} />
          <Chip label="Female" selected={form.sex === 'female'} onPress={() => set({ sex: 'female' })} />
        </View>

        <TextField
          label="Age"
          value={form.age}
          onChangeText={(age) => set({ age })}
          keyboardType="number-pad"
          placeholder="e.g. 28"
          error={m.errors.age}
        />

        <View style={styles.unitRow}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.chips}>
            <Chip label="kg" selected={form.weightUnit === 'kg'} onPress={() => changeWeightUnit('kg')} />
            <Chip label="lb" selected={form.weightUnit === 'lb'} onPress={() => changeWeightUnit('lb')} />
          </View>
        </View>
        <TextField
          value={form.weight}
          onChangeText={(weight) => set({ weight, exactKg: null })}
          keyboardType="decimal-pad"
          placeholder={form.weightUnit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
          accessibilityLabel={`Weight in ${form.weightUnit}`}
          error={m.errors.weight}
        />

        <View style={styles.unitRow}>
          <Text style={styles.label}>Height</Text>
          <View style={styles.chips}>
            <Chip label="cm" selected={form.heightUnit === 'cm'} onPress={() => changeHeightUnit('cm')} />
            <Chip label="ft / in" selected={form.heightUnit === 'ft'} onPress={() => changeHeightUnit('ft')} />
          </View>
        </View>
        {form.heightUnit === 'cm' ? (
          <TextField
            value={form.cm}
            onChangeText={(cm) => set({ cm })}
            keyboardType="decimal-pad"
            placeholder="e.g. 175"
            accessibilityLabel="Height in centimetres"
            error={m.errors.height}
          />
        ) : (
          <View style={styles.feetRow}>
            <View style={styles.flex}>
              <TextField
                value={form.feet}
                onChangeText={(feet) => set({ feet })}
                keyboardType="number-pad"
                placeholder="ft"
                accessibilityLabel="Height, feet"
                error={m.errors.height}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                value={form.inches}
                onChangeText={(inches) => set({ inches })}
                keyboardType="number-pad"
                placeholder="in"
                accessibilityLabel="Height, inches"
              />
            </View>
          </View>
        )}

      </Card>
      <Button title="Save details" onPress={save} loading={saving} disabled={!profile} />
      {!profile ? <Text style={styles.hint}>Fill in every field to save.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  heading: { fontSize: 18, fontFamily: fonts.heading, color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feetRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
