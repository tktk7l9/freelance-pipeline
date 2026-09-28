/**
 * Japanese public holidays. Used only to color calendar dates red.
 *
 * Covers **2023 onward** (current Public Holiday Act only). Past exceptions (e.g. the Olympics shifts) are not reproduced.
 * Ported from the implementation inherited kousan-admin → sumai-log, only as much as needed to resolve holiday names.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

type ParsedDate = { year: number; month: number; day: number }

function parseIsoDate(value: string): ParsedDate | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return { year, month, day }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Day of week. 0 = Sunday. null if the format is wrong. */
export function dayOfWeek(iso: string): number | null {
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()
}

/** The n-th Monday of the month (for Happy Monday holidays). */
export function nthMondayOf(year: number, month: number, nth: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const firstMonday = 1 + ((8 - firstDay) % 7)
  return firstMonday + (nth - 1) * 7
}

/** Vernal and autumnal equinox days. Approximation that matches the values published by the National Astronomical Observatory in the official gazette (valid 1980–2099). */
export function equinoxDay(year: number, season: 'spring' | 'autumn'): number {
  const base = season === 'spring' ? 20.8431 : 23.2488
  return Math.floor(base + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

function statutoryHolidays(year: number): Map<string, string> {
  const map = new Map<string, string>()
  const put = (month: number, day: number, name: string) => {
    map.set(toIsoDate(year, month, day), name)
  }
  put(1, 1, '元日')
  put(1, nthMondayOf(year, 1, 2), '成人の日')
  put(2, 11, '建国記念の日')
  put(2, 23, '天皇誕生日')
  put(3, equinoxDay(year, 'spring'), '春分の日')
  put(4, 29, '昭和の日')
  put(5, 3, '憲法記念日')
  put(5, 4, 'みどりの日')
  put(5, 5, 'こどもの日')
  put(7, nthMondayOf(year, 7, 3), '海の日')
  put(8, 11, '山の日')
  put(9, nthMondayOf(year, 9, 3), '敬老の日')
  put(9, equinoxDay(year, 'autumn'), '秋分の日')
  put(10, nthMondayOf(year, 10, 2), 'スポーツの日')
  put(11, 3, '文化の日')
  put(11, 23, '勤労感謝の日')
  return map
}

function shiftDate(iso: string, days: number): string {
  const parsed = parseIsoDate(iso) as ParsedDate
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days))
  return toIsoDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/**
 * The year's holiday list including substitute holidays and national holidays (国民の休日).
 * Substitute holiday: if a holiday falls on Sunday, the first weekday after it becomes a holiday.
 * National holiday: a weekday sandwiched between holidays becomes a holiday (e.g. between Respect for the Aged Day and the autumnal equinox).
 */
export function holidaysOfYear(year: number): Map<string, string> {
  const holidays = new Map(statutoryHolidays(year))
  for (const iso of [...holidays.keys()].sort()) {
    if (dayOfWeek(iso) !== 0) continue
    let candidate = shiftDate(iso, 1)
    while (holidays.has(candidate)) candidate = shiftDate(candidate, 1)
    holidays.set(candidate, '振替休日')
  }
  for (const iso of [...holidays.keys()].sort()) {
    const dayAfterNext = shiftDate(iso, 2)
    const between = shiftDate(iso, 1)
    if (!holidays.has(dayAfterNext)) continue
    if (holidays.has(between)) continue
    // A sandwiched Sunday does not become a national holiday. Never happens for 2023–2099 under the current holidays,
    // but kept so a future law change adding holidays does not create one by mistake
    /* v8 ignore next */
    if (dayOfWeek(between) === 0) continue
    holidays.set(between, '国民の休日')
  }
  return holidays
}

/** The holiday name if the date is a holiday, otherwise null. */
export function holidayName(iso: string): string | null {
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  return holidaysOfYear(parsed.year).get(iso) ?? null
}
