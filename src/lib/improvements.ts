/**
 * "Things to improve" (bullet list shown on home). Stored in settings 'improvements' as a JSON string array.
 * Lessons and next steps picked up from past exchanges are kept where they are seen every time, so they are not forgotten (SHIG 12).
 */
export function parseImprovements(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
      : []
  } catch {
    return []
  }
}

/** From the settings Textarea (one item per line) to an array. Drops empty lines and surrounding whitespace. Strips a leading "- " */
export function linesToImprovements(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-・*]\s*/, ''))
    .filter((l) => l !== '')
}
