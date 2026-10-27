import { callFunction } from './back4app';

// Body measurements and the numbers derived from them: BMI, daily calorie
// needs (Mifflin-St Jeor) and a protein target. Stored on Back4App through
// the Cloud Code functions in `cloud/main.js`, always in metric.

export type Sex = 'male' | 'female';
export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';

export type HealthProfile = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  /** How the user prefers to see weight and height. */
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  activity: ActivityLevel;
};

export const LIMITS = {
  age: { min: 13, max: 100 },
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 120, max: 230 },
};

export function getHealthProfile(): Promise<HealthProfile | null> {
  return callFunction('getHealthProfile');
}

export async function saveHealthProfile(profile: HealthProfile): Promise<void> {
  await callFunction('saveHealthProfile', { profile });
}

// ---------------------------------------------------------------- units

const LB_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const total = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(total / 12), inches: total % 12 };
}

export const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * CM_PER_INCH;

export function formatWeightIn(kg: number, unit: WeightUnit): string {
  return unit === 'kg' ? `${Math.round(kg)} kg` : `${Math.round(kgToLb(kg))} lb`;
}

// ---------------------------------------------------------------- BMI

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export const BMI_LABELS: Record<BmiCategory, string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
};

/** Body mass index: weight (kg) divided by height (m) squared. */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** WHO adult categories. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  return 'obese';
}

/** Weights (kg) that give a BMI of 18.5 to 24.9 at this height. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m2 = (heightCm / 100) ** 2;
  return { min: 18.5 * m2, max: 24.9 * m2 };
}

// ---------------------------------------------------------------- calories

/**
 * `factor` multiplies resting calories into daily calories; `protein` is the
 * grams per kg to eat while losing weight, higher the more you train.
 */
export const ACTIVITY_LEVELS: {
  id: ActivityLevel;
  label: string;
  detail: string;
  factor: number;
  protein: { min: number; max: number };
}[] = [
  { id: 'sedentary', label: 'Sedentary', detail: 'Desk job, little exercise', factor: 1.2, protein: { min: 1.2, max: 1.6 } },
  { id: 'light', label: 'Light', detail: 'Exercise 1–3 days a week', factor: 1.375, protein: { min: 1.4, max: 1.8 } },
  { id: 'moderate', label: 'Moderate', detail: 'Exercise 3–5 days a week', factor: 1.55, protein: { min: 1.6, max: 2.0 } },
  { id: 'active', label: 'Active', detail: 'Hard exercise 6–7 days a week', factor: 1.725, protein: { min: 1.8, max: 2.2 } },
  { id: 'veryActive', label: 'Very active', detail: 'Physical job plus training', factor: 1.9, protein: { min: 2.0, max: 2.4 } },
];

function activityLevel(id: ActivityLevel) {
  return ACTIVITY_LEVELS.find((a) => a.id === id) ?? ACTIVITY_LEVELS[2];
}

/** Calories burned at complete rest (Mifflin-St Jeor equation). */
export function restingCalories(p: Pick<HealthProfile, 'sex' | 'age' | 'weightKg' | 'heightCm'>): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

/** Calories that keep weight steady at this activity level. */
export function maintenanceCalories(p: Pick<HealthProfile, 'sex' | 'age' | 'weightKg' | 'heightCm' | 'activity'>): number {
  return restingCalories(p) * activityLevel(p.activity).factor;
}

/** Common lower limits for unsupervised dieting. */
export const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

/** About 7,700 kcal per kg of body fat. */
const KCAL_PER_KG_FAT = 7700;

export type DeficitPlan = {
  id: 'gentle' | 'steady' | 'faster';
  label: string;
  /** Share of maintenance calories cut, e.g. 0.2 for 20%. */
  percent: number;
  /** Calories a day below maintenance (smaller than planned if held at the minimum). */
  deficit: number;
  /** Daily calories to eat, never below the minimum. */
  calories: number;
  /** True when the minimum raised the target (so the real deficit is smaller). */
  atMinimum: boolean;
  /** Expected loss per week, in kg. */
  kgPerWeek: number;
  /** Faster than about 1% of body weight a week, the usual upper limit for safe loss. */
  tooFast: boolean;
};

/**
 * Three ways to eat less than maintenance, each a share of it, so a more
 * active person (higher maintenance) gets a bigger deficit and faster loss.
 */
export function deficitPlans(p: HealthProfile): DeficitPlan[] {
  const maintenance = maintenanceCalories(p);
  const floor = MIN_CALORIES[p.sex];
  const plans: Pick<DeficitPlan, 'id' | 'label' | 'percent'>[] = [
    { id: 'gentle', label: 'Gentle', percent: 0.1 },
    { id: 'steady', label: 'Steady', percent: 0.2 },
    { id: 'faster', label: 'Faster', percent: 0.25 },
  ];
  return plans.map((plan) => {
    const target = roundTo(maintenance * (1 - plan.percent), 10);
    const calories = Math.max(target, floor);
    const deficit = Math.max(maintenance - calories, 0);
    return {
      ...plan,
      calories,
      deficit: roundTo(deficit, 10),
      atMinimum: calories === floor && target < floor,
      kgPerWeek: (deficit * 7) / KCAL_PER_KG_FAT,
      tooFast: (deficit * 7) / KCAL_PER_KG_FAT > p.weightKg * 0.01,
    };
  });
}

// ---------------------------------------------------------------- protein

/**
 * Daily protein while losing fat, which helps keep muscle: grams per kg by
 * activity level, from 1.2 g/kg for sedentary people up to the ISSN's
 * 1.4–2.0 g/kg (and more in a deficit) for people who train. Above BMI 30 the
 * weight is capped at the weight for BMI 30, since extra fat mass doesn't
 * raise protein needs.
 */
export function proteinTarget(p: Pick<HealthProfile, 'weightKg' | 'heightCm' | 'activity'>): {
  min: number;
  max: number;
  perKg: { min: number; max: number };
  basisKg: number;
  usesAdjustedWeight: boolean;
} {
  const usesAdjustedWeight = bmi(p.weightKg, p.heightCm) > 30;
  const basisKg = usesAdjustedWeight ? 30 * (p.heightCm / 100) ** 2 : p.weightKg;
  const perKg = activityLevel(p.activity).protein;
  return { min: roundTo(basisKg * perKg.min, 5), max: roundTo(basisKg * perKg.max, 5), perKg, basisKg, usesAdjustedWeight };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
