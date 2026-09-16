export type DueState = 'overdue' | 'today' | 'soon' | 'later'

/** 期限状態 → Mantine の色。カード・表・ホームで共有する */
export const DUE_COLOR: Record<DueState, string> = {
  overdue: 'red',
  today: 'orange',
  soon: 'yellow',
  later: 'gray',
}

/** 'YYYY-MM-DD' 同士の差（日）。文字列比較で足りるが、soon の判定に日数が要る */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** today は呼び出し側が JST で決めて渡す（lib は時計を持たない） */
export function dueState(due: string, today: string): DueState {
  const d = daysBetween(today, due)
  if (d < 0) return 'overdue'
  if (d === 0) return 'today'
  if (d <= 3) return 'soon'
  return 'later'
}

export function withDue<T extends { nextActionDue: string | null }>(items: T[]): T[] {
  return items
    .filter((i): i is T & { nextActionDue: string } => i.nextActionDue !== null)
    .sort((a, b) => a.nextActionDue.localeCompare(b.nextActionDue))
}
