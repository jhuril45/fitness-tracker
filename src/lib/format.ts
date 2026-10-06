export function formatWeight(weight: number, unit: string): string {
  return `${Number.isInteger(weight) ? weight : weight.toFixed(1)} ${unit}`;
}

export function formatSetsReps(sets: number | null, reps: number | null): string | null {
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return `${sets} sets`;
  if (reps) return `${reps} reps`;
  return null;
}

/** e.g. "3 × 12 · 20 kg". Pass `weight` to show a weight other than the current one. */
export function describeExercise(
  exercise: { sets: number | null; reps: number | null; unit: string; currentWeight: number | null },
  weight: number | null = exercise.currentWeight,
): string {
  return [formatSetsReps(exercise.sets, exercise.reps), weight !== null ? formatWeight(weight, exercise.unit) : null]
    .filter(Boolean)
    .join(' · ');
}

export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Parses a positive number typed by the user, accepting "," as decimal mark. */
export function parsePositiveNumber(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}
