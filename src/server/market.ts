import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { formatJst } from '../lib/jst'
import { marketDataSchema, type MarketData } from '../lib/market'
import { latestPerSkill, listCases, listMarketSnapshots, readBusiness } from './repository'

export type MarketSkill = { skill: string; takenOn: string; data: MarketData }

/**
 * For "Compare › Market". The latest snapshot per skill, the date of birth for my age band,
 * the current rate (actual rate of the active case), and the points where the rate changed (for the annual growth rate).
 * Rows with malformed JSON are dropped (so the screen does not crash).
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
      // Do not show broken JSON
    }
  }
  // Current rate = actual rate of the active case with the newest start date (the listed rate if none)
  const joined = cases
    .filter((c) => c.status === 'joined')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  const current = joined[0]
  const myRate = current ? (current.actualMonthlyIncl ?? current.monthlyMaxIncl) : null
  // Rate change points = actual rates of joined/ended cases ordered by start month
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
