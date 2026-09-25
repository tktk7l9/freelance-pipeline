import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { formatJst } from '../lib/jst'
import { marketDataSchema, type MarketData } from '../lib/market'
import { latestPerSkill, listCases, listMarketSnapshots, readBusiness } from './repository'

export type MarketSkill = { skill: string; takenOn: string; data: MarketData }

/**
 * 「比較 › 市場」用。スキルごとの最新スナップショット、自分の年齢帯を出す生年月日、
 * いまの単価（参画中案件の実単価）、単価の変わった点（上がり方の年率用）。
 * JSON の形が崩れている行は捨てる（画面を落とさない）。
 */
export const marketData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, cases, business] = await Promise.all([
    listMarketSnapshots(db),
    listCases(db),
    readBusiness(db),
  ])
  const skills: MarketSkill[] = []
  for (const r of latestPerSkill(rows)) {
    try {
      const parsed = marketDataSchema.safeParse(JSON.parse(r.data))
      if (parsed.success) skills.push({ skill: r.skill, takenOn: r.takenOn, data: parsed.data })
    } catch {
      // 壊れた JSON は表示しない
    }
  }
  // いまの単価＝参画中で開始日が最も新しい案件の実単価（無ければ票面）
  const joined = cases
    .filter((c) => c.status === 'joined')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  const current = joined[0]
  const myRate = current ? (current.actualMonthlyIncl ?? current.monthlyMaxIncl) : null
  // 単価の変わった点＝参画/終了した案件の実単価を開始月で並べる
  const ratePoints = cases
    .filter((c) => (c.status === 'joined' || c.status === 'ended') && c.actualMonthlyIncl)
    .map((c) => ({ ym: c.startDate.slice(0, 7), rate: c.actualMonthlyIncl as number }))
    .sort((a, b) => a.ym.localeCompare(b.ym))
  return {
    skills,
    birthDate: business.birthDate,
    myRate,
    ratePoints,
    today: formatJst(new Date().toISOString(), { withTime: false }),
  }
})
