/**
 * 日本の祝日。カレンダーの日付を赤くするためだけに使う。
 *
 * 対象は **2023年以降**（現行の祝日法のみ）。過去の特例（五輪の移動など）は再現しない。
 * kousan-admin → sumai-log と受け継いだ実装から、祝日名の判定に要る分だけ移植。
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

/** 曜日。0=日曜。書式が違えば null。 */
export function dayOfWeek(iso: string): number | null {
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()
}

/** その月の n 番目の月曜日（ハッピーマンデー用）。 */
export function nthMondayOf(year: number, month: number, nth: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const firstMonday = 1 + ((8 - firstDay) % 7)
  return firstMonday + (nth - 1) * 7
}

/** 春分の日・秋分の日。国立天文台の官報公表値に一致する近似式（1980〜2099 で有効）。 */
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
 * 振替休日と国民の休日を足した、その年の祝日一覧。
 * 振替休日: 祝日が日曜なら、その後の最初の平日が休日になる。
 * 国民の休日: 祝日に挟まれた平日は休日になる（敬老の日と秋分の日の間など）。
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
    // 挟まれた日が日曜なら国民の休日にはならない。現行の祝日では 2023〜2099 に発生しないが
    // 法改正で祝日が増えたときに誤って作らないよう残す
    /* v8 ignore next */
    if (dayOfWeek(between) === 0) continue
    holidays.set(between, '国民の休日')
  }
  return holidays
}

/** その日が祝日なら名称、そうでなければ null。 */
export function holidayName(iso: string): string | null {
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  return holidaysOfYear(parsed.year).get(iso) ?? null
}
