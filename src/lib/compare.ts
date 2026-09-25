import { REMOTE_LABEL, type RemoteType, type Route } from './enums'
import { baseHours, formatHourlyLines, formatRateLines, hourlyExcl } from './rate'

/** 判断基準。値は D1 の settings にだけ入る。ここは形と既定（全部 null=判定しない）だけ */
export type Thresholds = {
  minMonthlyIncl: number | null
  minHourlyExcl: number | null
  targetStart: string | null
  maxOnsitePerMonth: number | null
}
export const DEFAULT_THRESHOLDS: Thresholds = {
  minMonthlyIncl: null,
  minHourlyExcl: null,
  targetStart: null,
  maxOnsitePerMonth: null,
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function parseThresholds(raw: string | null): Thresholds {
  if (!raw) return DEFAULT_THRESHOLDS
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (typeof o !== 'object' || o === null) return DEFAULT_THRESHOLDS
    return {
      minMonthlyIncl: numOrNull(o.minMonthlyIncl),
      minHourlyExcl: numOrNull(o.minHourlyExcl),
      targetStart:
        typeof o.targetStart === 'string' && /^\d{4}-\d{2}$/.test(o.targetStart)
          ? o.targetStart
          : null,
      maxOnsitePerMonth: numOrNull(o.maxOnsitePerMonth),
    }
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

export function parseAxes(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : []
  } catch {
    return []
  }
}

export type CompareCase = {
  id: string
  company: string
  title: string
  route: Route
  monthlyMaxIncl: number
  monthlyMinIncl: number | null
  settlementMinH: number | null
  settlementMaxH: number | null
  remoteType: RemoteType
  onsiteNote: string | null
  startDate: string
  daysPerWeek: string | null
  supplyChain: string | null
  paymentSiteDays: number | null
  mustSkills: string[]
  niceSkills: string[]
  fitScores: number[] | null
}

export type CompareCell = { caseId: string; text: string; sub?: string; bad: boolean }
export type CompareRow = { key: string; label: string; cells: CompareCell[] }

/** full=0、onsite=∞、partial は「月N回」を読めた時だけ N。読めなければ null（判定しない） */
export function onsitePerMonth(remoteType: RemoteType, onsiteNote: string | null): number | null {
  if (remoteType === 'full') return 0
  if (remoteType === 'onsite') return Number.POSITIVE_INFINITY
  const m = onsiteNote?.match(/月\s*(\d+)\s*回/)
  return m ? Number(m[1]) : null
}

export function fitMark(score: number | null | undefined): string {
  // ○△× は文化で意味が変わる記号なので文字にする（SHIG 70・96）
  if (score === 2) return '合う'
  if (score === 1) return '一部'
  if (score === 0) return '合わない'
  return '—'
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '—' : String(v)

export function buildCompareRows(
  cases: CompareCase[],
  t: Thresholds,
  axes: string[],
): CompareRow[] {
  const row = (key: string, label: string, cell: (c: CompareCase) => CompareCell): CompareRow => ({
    key,
    label,
    cells: cases.map(cell),
  })
  const rows: CompareRow[] = [
    row('rate', '単価', (c) => {
      const lines = formatRateLines(c.monthlyMaxIncl, c.monthlyMinIncl)
      return {
        caseId: c.id,
        text: lines.main,
        sub: lines.sub,
        bad: t.minMonthlyIncl !== null && c.monthlyMaxIncl < t.minMonthlyIncl,
      }
    }),
    row('hourly', '時給', (c) => {
      const { hours } = baseHours(c)
      const h = hourlyExcl(c.monthlyMaxIncl, hours)
      const lines = formatHourlyLines(c.monthlyMaxIncl, hours)
      return {
        caseId: c.id,
        text: lines.main,
        sub: lines.sub,
        bad: t.minHourlyExcl !== null && h < t.minHourlyExcl,
      }
    }),
    row('settlement', '精算幅', (c) => ({
      caseId: c.id,
      text:
        c.settlementMinH || c.settlementMaxH
          ? `${dash(c.settlementMinH)}〜${dash(c.settlementMaxH)}h`
          : '—',
      bad: false,
    })),
    row('remote', 'リモート', (c) => ({
      caseId: c.id,
      text: REMOTE_LABEL[c.remoteType],
      bad: false,
    })),
    row('onsite', '出社', (c) => {
      const n = onsitePerMonth(c.remoteType, c.onsiteNote)
      return {
        caseId: c.id,
        text: c.onsiteNote ?? (c.remoteType === 'full' ? 'なし' : '—'),
        bad: t.maxOnsitePerMonth !== null && n !== null && n > t.maxOnsitePerMonth,
      }
    }),
    row('start', '開始', (c) => ({
      caseId: c.id,
      text: c.startDate,
      bad: t.targetStart !== null && c.startDate.slice(0, 7) > t.targetStart,
    })),
    row('days', '稼働', (c) => ({ caseId: c.id, text: dash(c.daysPerWeek), bad: false })),
    row('supplyChain', '商流', (c) => ({ caseId: c.id, text: dash(c.supplyChain), bad: false })),
    row('paymentSite', '支払サイト', (c) => ({
      caseId: c.id,
      text: c.paymentSiteDays === null ? '—' : `${c.paymentSiteDays}日`,
      bad: false,
    })),
    row('must', '必須', (c) => ({
      caseId: c.id,
      text: c.mustSkills.join('、') || '—',
      bad: false,
    })),
    row('nice', '歓迎', (c) => ({
      caseId: c.id,
      text: c.niceSkills.join('、') || '—',
      bad: false,
    })),
  ]
  axes.forEach((axis, i) => {
    rows.push(
      row(`axis:${i}`, axis, (c) => ({
        caseId: c.id,
        text: fitMark(c.fitScores?.[i]),
        bad: false,
      })),
    )
  })
  return rows
}
