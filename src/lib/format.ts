export function formatWeight(weight: number, unit: string): string {
  return `${Number.isInteger(weight) ? weight : weight.toFixed(1)} ${unit}`;
}

export function formatSetsReps(sets: number | null, reps: number | null): string | null {
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return `${sets} sets`;
  if (reps) return `${reps} reps`;
  return null;
}

/** Parses a positive number typed by the user, accepting "," as decimal mark. */
export function parsePositiveNumber(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}
