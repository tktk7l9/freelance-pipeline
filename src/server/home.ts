import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { withDue } from '../lib/deadlines'
import { formatJst } from '../lib/jst'
import { median, statsByRoute } from '../lib/rate'
import { statusGroup } from '../lib/status'
import { decorate } from './cases'
import { listCases, listCompanySites, readImprovements, recentLog } from './repository'

export const homeData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, recent, sites, improvements] = await Promise.all([
    listCases(db),
    recentLog(db, 10),
    listCompanySites(db),
    readImprovements(db),
  ])
  const active = rows.filter((c) => statusGroup(c.status) === 'active')
  // Joined = the current case. If several, newest start date first
  const current = rows
    .filter((c) => c.status === 'joined')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map(decorate)
  return {
    current,
    sites,
    improvements,
    due: withDue(active).map((c) => ({
      id: c.id,
      company: c.company,
      title: c.title,
      nextAction: c.nextAction,
      nextActionDue: c.nextActionDue,
    })),
    activeCount: active.length,
    medianIncl: median(active.map((c) => c.monthlyMaxIncl)),
    byRoute: statsByRoute(active),
    recent,
    today: formatJst(new Date().toISOString(), { withTime: false }),
  }
})
