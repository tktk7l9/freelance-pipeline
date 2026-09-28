import type { CaseStatus } from './status'

/**
 * Typical next steps per status, offered as suggestions when the owner updates the next step
 * (SHIG 51: input suggestions). Only a starting point; free text is always accepted.
 */
const SUGGESTIONS: Record<CaseStatus, readonly string[]> = {
  saved: ['応募するか決める', '条件を担当に確認する'],
  applied: ['書類選考の結果を待つ', '担当に進み具合を聞く'],
  screening: ['書類選考の結果を待つ', '面談の候補日を出す'],
  meeting: ['面談日程を返信する', '面談の準備をする', '面談の結果を待つ'],
  offer: ['条件を確認して返事をする', '契約書を確認する', '他の案件に辞退を伝える'],
  joined: ['参画の準備をする', '契約更新の意向を返す'],
  ended: [],
  declined: [],
  rejected: [],
  onhold: ['再開するか決める'],
}

export function nextActionSuggestions(status: CaseStatus): string[] {
  return [...SUGGESTIONS[status]]
}

/**
 * Whether a counter-style "focus now" signal from the parent is a bump this component has not
 * handled yet. A child that remounts starts with `handled` at the current value, so an old bump is
 * not replayed (e.g. after saving, which remounts the editor, the phone keyboard would pop up again).
 */
export function isFreshSignal(handled: number, signal: number): boolean {
  return signal > handled
}

/**
 * Where focus should go once a save of the next step settles, or null to leave it alone.
 * Saving shows the save button as loading, which disables it; if it had focus, the browser drops
 * focus to <body> and keyboard / screen-reader users are sent back to the top of the page. Put focus
 * back where it was before saving (the field after Enter, the button after a click), or on
 * `fallback` when that element is gone. If focus is already on something else, the owner moved on
 * while the save was in flight (e.g. kept typing), so do not steal it (SHIG 94).
 */
export function focusAfterSave<T>({
  active,
  body,
  before,
  beforeUsable,
  fallback,
}: {
  active: T | null
  body: T | null
  before: T | null
  beforeUsable: boolean
  fallback: T | null
}): T | null {
  if (active !== null && active !== body) return null
  if (before !== null && before !== body && beforeUsable) return before
  return fallback
}
