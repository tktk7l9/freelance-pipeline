/**
 * Normalization used at the form-input boundary. When emptied, Mantine's NumberInput emits
 * an empty string `''` instead of a number, but the DB columns are nullable numbers, so
 * convert to null here before passing to the zod schema (otherwise saving fails).
 */
export function emptyToNull<T>(value: T | ''): T | null {
  return value === '' ? null : value
}
