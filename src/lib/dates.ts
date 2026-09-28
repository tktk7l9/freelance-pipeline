/**
 * Parsing date input.
 *
 * The ledger stores only one form, 'YYYY-MM-DD', but the sources people copy from (land registry,
 * notices, business cards, email) use all sorts of notations, and making the typist care every time is wasteful.
 * Accept common notations and convert them to the stored form.
 */

const PATTERNS: readonly RegExp[] = [
  // 2026-07-30 / 2026-7-30
  /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  // 2026/07/30 / 2026.7.30
  /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/,
  // 20260730
  /^(\d{4})(\d{2})(\d{2})$/,
  // 2026年7月30日
  /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/,
]

/** Whether the date actually exists. Rejects values that would roll over, such as 2026-02-30. */
function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/**
 * Converts the typed string to 'YYYY-MM-DD'. Returns null if unreadable.
 *
 * Input without a year, like "7/30", is not accepted. Assuming the current year would silently
 * save the wrong year when copying past records.
 */
export function parseDateInput(value: string | null | undefined): string | null {
  const trimmed = normalizeWidth(value)
  if (!trimmed) return null

  for (const pattern of PATTERNS) {
    const match = pattern.exec(trimmed)
    if (!match) continue

    const [, rawYear, rawMonth, rawDay] = match
    const year = Number(rawYear)
    const month = Number(rawMonth)
    const day = Number(rawDay)
    if (!isRealDate(year, month, day)) return null

    return `${rawYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return null
}

/** Converts full-width digits and symbols to half-width and trims whitespace (do not demand precision from the user) */
function normalizeWidth(value: string | null | undefined): string | undefined {
  return value?.normalize('NFKC').trim()
}

const MONTH_PATTERNS: readonly RegExp[] = [
  // 2026-07 / 2026/7 / 2026.07
  /^(\d{4})[-/.](\d{1,2})$/,
  // 2026年7月
  /^(\d{4})年(\d{1,2})月$/,
]

/**
 * A case's start and end may be "fixed to the day" or "month only".
 * Converts a date to 'YYYY-MM-DD' and a year-month to 'YYYY-MM'. Returns null if unreadable.
 */
export function parseMonthOrDateInput(value: string | null | undefined): string | null {
  const date = parseDateInput(value)
  if (date) return date
  const trimmed = normalizeWidth(value)
  if (!trimmed) return null
  for (const pattern of MONTH_PATTERNS) {
    const match = pattern.exec(trimmed)
    if (!match) continue
    const month = Number(match[2])
    if (month < 1 || month > 12) return null
    return `${match[1]}-${String(month).padStart(2, '0')}`
  }
  return null
}

/** Year-month only ('YYYY-MM'). A full date is accepted and rounded to its month. Null if unreadable */
export function parseMonthInput(value: string | null | undefined): string | null {
  return parseMonthOrDateInput(value)?.slice(0, 7) ?? null
}
