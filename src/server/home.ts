import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { withDue } from '../lib/deadlines'
import { formatJst } from '../lib/jst'
import { median } from '../lib/rate'
import { statusGroup } from '../lib/status'
import { listCases, recentLog } from './repository'

export const homeData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, recent] = await Promise.all([listCases(db), recentLog(db, 10)])
  const active = rows.filter((c) => statusGroup(c.status) === 'active')
  return {
    due: withDue(active).map((c) => ({
      id: c.id,
      company: c.company,
      title: c.title,
      nextAction: c.nextAction,
      nextActionDue: c.nextActionDue,
    })),
    activeCount: active.length,
    medianIncl: median(active.map((c) => c.monthlyMaxIncl)),
    recent,
    today: formatJst(new Date().toISOString(), { withTime: false }),
  }
})
