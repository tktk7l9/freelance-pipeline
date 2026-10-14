import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { effectiveRate, groupByCase, ratePoints } from '../lib/contract'
import { formatJst } from '../lib/jst'
import { marketDataSchema, type MarketData } from '../lib/market'
import {
  latestPerSkill,
  listCases,
  listContracts,
  listMarketSnapshots,
  readBusiness,
} from './repository'

export type MarketSkill = { skill: string; takenOn: string; data: MarketData }

/**
 * For "Compare › Market". The latest snapshot per skill, the date of birth for my age band,
 * the current rate (contract rate of the active case), and the points where the rate changed (for the annual growth rate).
 * Rows with malformed JSON are dropped (so the screen does not crash).
 */
export const marketData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, cases, contracts, business] = await Promise.all([
    listMarketSnapshots(db),
    listCases(db),
    listContracts(db),
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
  const byCase = groupByCase(contracts)
  // Current rate = the rate of the active case with the newest start date (its latest contract, else the case row)
  const joined = cases
    .filter((c) => c.status === 'joined')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  const current = joined[0]
  const myRate = current ? effectiveRate(current, byCase.get(current.id) ?? []).monthlyIncl : null
  return {
    skills,
    birthDate: business.birthDate,
    myRate,
    // Rate change points = every contract of joined / ended cases ordered by start month
    ratePoints: ratePoints(cases, byCase),
    today: formatJst(new Date().toISOString(), { withTime: false }),
  }
})
