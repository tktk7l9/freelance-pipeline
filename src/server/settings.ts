import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { readAxes, readThresholds } from './repository'

export const getSettingsData = createServerFn().handler(async () => {
  const db = getDb()
  const [thresholds, axes] = await Promise.all([readThresholds(db), readAxes(db)])
  return { thresholds, axes }
})
