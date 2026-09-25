import { z } from 'zod'

/**
 * 市場データ（レバテックプラットフォームの「案件データ」「人材データ」）の 1 スキルぶん。
 * スクショから数字の読める項目だけを写す。折れ線や目盛りの無い分布は持たない。
 * 単価は税込・円。年齢別の単価割合は「〜¥900,000」のような上限（bin）ごとの %。
 */
const pctItem = z.object({ label: z.string().min(1).max(40), pct: z.number().min(0).max(100) })
const countItem = z.object({ label: z.string().min(1).max(40), count: z.number().int().min(0) })

export const marketDataSchema = z.object({
  sourceUrl: z.string().url().optional(),
  jobs: z.object({
    open: z.number().int().min(0),
    newWeek: z.number().int().min(0),
    ratio: z.number().min(0),
    growthPct: z.number(),
    maxRate: z.number().int().min(0),
    byDays: z.array(countItem).max(20),
    remote: z.array(pctItem).max(10),
  }),
  talent: z.object({
    annualRaiseAvg: z.number().int().min(0),
    /** 単価帯の上限（円・昇順）。凡例の「〜¥500,000」など */
    bins: z.array(z.number().int().positive()).min(1).max(20),
    ageRate: z
      .array(
        z.object({
          band: z.string().min(1).max(20),
          cells: z.array(z.object({ bin: z.number().int().positive(), pct: z.number().min(0) })),
        }),
      )
      .max(12),
    ageShare: z.array(pctItem).max(12),
    renewal: z.array(pctItem).max(10),
  }),
})
export type MarketData = z.infer<typeof marketDataSchema>
export type AgeRateRow = MarketData['talent']['ageRate'][number]

export const AGE_BANDS = [
  '20代前半',
  '20代後半',
  '30代前半',
  '30代後半',
  '40代前半',
  '40代後半',
  '50代前半',
  '50代後半',
  '60代以上',
] as const
export type AgeBand = (typeof AGE_BANDS)[number]

/** 満年齢（today は 'YYYY-MM-DD'） */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age
}

/** レバテックの年齢帯。20 歳未満は 20代前半に寄せる */
export function ageBandOf(age: number): AgeBand {
  if (age >= 60) return '60代以上'
  if (age < 25) return '20代前半'
  const decade = Math.floor(age / 10) * 10
  const half = age % 10 < 5 ? '前半' : '後半'
  return `${decade}代${half}` as AgeBand
}

/** 単価が入る帯（bins の中で最小の「rate 以下の上限」）。上限を超えるなら最大の帯 */
export function binFor(bins: readonly number[], rate: number): number {
  const sorted = [...bins].sort((a, b) => a - b)
  for (const b of sorted) if (rate <= b) return b
  return sorted[sorted.length - 1]
}

export type BandPosition = {
  band: string
  bin: number
  /** 自分の帯より高い帯の合計 % */
  abovePct: number
  /** 同じ帯の % */
  samePct: number
  /** 自分の帯より低い帯の合計 % */
  belowPct: number
  /** いちばん人が多い帯 */
  modeBin: number | null
}

/**
 * 同年代の単価分布の中で、自分の単価がどこにいるか（SHIG 28: データより情報）。
 * 行が無い年齢帯なら null。
 */
export function positionInBand(
  rows: readonly AgeRateRow[],
  bins: readonly number[],
  band: string,
  rate: number,
): BandPosition | null {
  const row = rows.find((r) => r.band === band)
  if (!row) return null
  const bin = binFor(bins, rate)
  let above = 0
  let same = 0
  let below = 0
  let mode: { bin: number; pct: number } | null = null
  for (const c of row.cells) {
    if (c.bin > bin) above += c.pct
    else if (c.bin === bin) same += c.pct
    else below += c.pct
    if (!mode || c.pct > mode.pct) mode = { bin: c.bin, pct: c.pct }
  }
  const round = (v: number) => Math.round(v * 10) / 10
  return {
    band,
    bin,
    abovePct: round(above),
    samePct: round(same),
    belowPct: round(below),
    modeBin: mode?.bin ?? null,
  }
}

/**
 * 自分の単価の上がり方（円/年）。単価の変わった点（年月・税込月額）を古い順に見て、
 * 最初と最後の差を経過年で割る。1 年未満しか無ければ null（年率にすると誇張になる）。
 */
export function raisePacePerYear(points: readonly { ym: string; rate: number }[]): number | null {
  if (points.length < 2) return null
  const sorted = [...points].sort((a, b) => a.ym.localeCompare(b.ym))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const months = monthsBetween(first.ym, last.ym)
  if (months < 12) return null
  return Math.round(((last.rate - first.rate) / months) * 12)
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}

/** '〜¥900,000' のような帯ラベル */
export function binLabel(bin: number): string {
  return `〜${(bin / 10_000).toLocaleString('ja-JP')}万`
}

/** 単価帯の色（帯の上限で固定＝スキルをまたいでも同じ帯は同じ色） */
export function binColor(bin: number): string {
  const table: Record<number, string> = {
    200_000: 'var(--mantine-color-red-3)',
    300_000: 'var(--mantine-color-red-6)',
    400_000: 'var(--mantine-color-orange-6)',
    500_000: 'var(--mantine-color-yellow-6)',
    600_000: 'var(--mantine-color-lime-6)',
    700_000: 'var(--mantine-color-teal-5)',
    800_000: 'var(--mantine-color-teal-9)',
    900_000: 'var(--mantine-color-indigo-7)',
    1_000_000: 'var(--mantine-color-violet-6)',
    1_100_000: 'var(--mantine-color-gray-6)',
    1_200_000: 'var(--mantine-color-blue-2)',
  }
  return table[bin] ?? 'var(--mantine-color-gray-4)'
}
