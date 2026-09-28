/**
 * Case status. Progress moves one way; the side states can be reached from anywhere.
 * Scripts read this too, so it has no imports within lib.
 */
export const PROGRESS_STATUSES = [
  'saved',
  'applied',
  'screening',
  'meeting',
  'offer',
  'joined',
  'ended',
] as const
export const SIDE_STATUSES = ['declined', 'rejected', 'onhold'] as const
export const CASE_STATUSES = [...PROGRESS_STATUSES, ...SIDE_STATUSES] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const STATUS_LABEL: Record<CaseStatus, string> = {
  saved: '保存',
  applied: '応募',
  screening: '書類選考',
  meeting: '商談',
  offer: '内定',
  joined: '参画',
  ended: '終了',
  declined: '辞退',
  rejected: '見送り',
  onhold: '保留',
}

export const STATUS_COLOR: Record<CaseStatus, string> = {
  saved: 'gray',
  applied: 'blue',
  screening: 'cyan',
  meeting: 'indigo',
  offer: 'grape',
  joined: 'teal',
  ended: 'gray',
  declined: 'gray',
  rejected: 'red',
  onhold: 'yellow',
}

/** List chips. active = in progress / onhold = on hold / closed = declined, passed / history = joined, ended */
export const STATUS_GROUPS = ['active', 'onhold', 'closed', 'history'] as const
export type StatusGroup = (typeof STATUS_GROUPS)[number]
export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  active: '進行中',
  onhold: '保留',
  closed: '辞退・見送り',
  history: '参画・終了',
}

export function statusGroup(status: CaseStatus): StatusGroup {
  if (status === 'onhold') return 'onhold'
  if (status === 'declined' || status === 'rejected') return 'closed'
  if (status === 'joined' || status === 'ended') return 'history'
  return 'active'
}

export function isTerminal(status: CaseStatus): boolean {
  return status === 'declined' || status === 'rejected'
}

/** Progress rank. Side states are -1 */
export function progressRank(status: CaseStatus): number {
  return (PROGRESS_STATUSES as readonly string[]).indexOf(status)
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return false
  if (isTerminal(from)) return false
  if ((SIDE_STATUSES as readonly string[]).includes(to)) return true
  if (from === 'onhold') return true
  return progressRank(to) > progressRank(from)
}

/** The next state (one step ahead in progress). null for terminal states, side states, or states that cannot advance */
export function nextProgress(status: CaseStatus): CaseStatus | null {
  if (status === 'onhold') return null
  const rank = progressRank(status)
  if (rank < 0) return null
  const next = PROGRESS_STATUSES[rank + 1]
  return next && canTransition(status, next) ? next : null
}

/**
 * Layout of the status change buttons. primary = the "next state" advanced with one tap,
 * others = the rest folded into a menu (skip-ahead progress and side states). So not every option is listed (Hick's law).
 */
export function transitionOptions(status: CaseStatus): {
  primary: CaseStatus | null
  others: CaseStatus[]
} {
  const primary = nextProgress(status)
  const others = CASE_STATUSES.filter((s) => s !== primary && canTransition(status, s))
  return { primary, others }
}
