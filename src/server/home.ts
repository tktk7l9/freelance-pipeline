import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { withDue } from '../lib/deadlines'
import { formatJst } from '../lib/jst'
import { median, statsByRoute } from '../lib/rate'
import { statusGroup } from '../lib/status'
import { decorate } from './cases'
import { listCases, listCompanySites, recentLog } from './repository'

export const homeData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, recent, sites] = await Promise.all([
    listCases(db),
    recentLog(db, 10),
    listCompanySites(db),
  ])
  const active = rows.filter((c) => statusGroup(c.status) === 'active')
  // 参画中＝いまの案件。複数なら開始日の新しい順
  const current = rows
    .filter((c) => c.status === 'joined')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map(decorate)
  return {
    current,
    sites,
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
