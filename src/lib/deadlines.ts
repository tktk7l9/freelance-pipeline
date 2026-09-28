import { addDays } from './calendar'

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

/** Deadline state → Mantine color. Shared by cards, tables, and home */
export const DUE_COLOR: Record<DueState, string> = {
  overdue: 'red',
  today: 'orange',
  soon: 'yellow',
  later: 'gray',
}

/** Difference in days between two 'YYYY-MM-DD' values. String comparison would do, but "soon" needs a day count */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** The caller decides today in JST and passes it in (lib has no clock) */
export function dueState(due: string, today: string): DueState {
  const d = daysBetween(today, due)
  if (d < 0) return 'overdue'
  if (d === 0) return 'today'
  if (d <= 3) return 'soon'
  return 'later'
}

export function withDue<T extends { nextActionDue: string | null }>(
  items: T[],
): (T & { nextActionDue: string })[] {
  return items
    .filter((i): i is T & { nextActionDue: string } => i.nextActionDue !== null)
    .sort((a, b) => a.nextActionDue.localeCompare(b.nextActionDue))
}

/** Groups cases with the same due date under a date heading. Dates ascending; input order kept within a group */
export function groupByDue<T extends { nextActionDue: string }>(
  items: T[],
): { date: string; items: T[] }[] {
  const byDate = new Map<string, T[]>()
  for (const item of items) {
    const list = byDate.get(item.nextActionDue)
    if (list) list.push(item)
    else byDate.set(item.nextActionDue, [item])
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, group]) => ({ date, items: group }))
}

/**
 * Text added to the due badge. Urgency is not conveyed by color alone (readable with color vision deficiency or in grayscale).
 * Overdue / today / N days left (within 3 days). Later than that is null = show only the date.
 */
export function dueLabel(due: string, today: string): string | null {
  const d = daysBetween(today, due)
  if (d < 0) return '期限切れ'
  if (d === 0) return '今日'
  if (d <= 3) return `あと${d}日`
  return null
}

/**
 * Pushes a due date back by `days`. Counted from the due date when it is still ahead, or from today
 * when it has already passed (moving an overdue date by one day would leave it overdue).
 */
export function postponeDue(due: string, today: string, days: number): string {
  return addDays(due > today ? due : today, days)
}

/** Ready-made due dates to pick instead of typing one (SHIG 45: choose the result) */
export function quickDueOptions(today: string): { label: string; date: string }[] {
  return [
    { label: '明日', date: addDays(today, 1) },
    { label: '3日後', date: addDays(today, 3) },
    { label: '1週間後', date: addDays(today, 7) },
  ]
}
