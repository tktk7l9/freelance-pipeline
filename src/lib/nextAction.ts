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

/** Where the next-step editor should put focus when the parent asks */
export type FocusTarget = 'field' | 'save'

/** A counter-style request from the parent: bump `n` to ask again */
export interface FocusRequest {
  n: number
  target: FocusTarget
}

/**
 * Which element to focus for a request, or null when there is nothing new to do.
 * After a status change the field takes focus (SHIG 41); after saving, the save button does, because
 * saving disables the button and remounts the editor, which would otherwise drop focus to the page
 * and send keyboard and screen-reader users back to the top (SHIG 94).
 */
export function pendingFocus(handled: number, request: FocusRequest): FocusTarget | null {
  return isFreshSignal(handled, request.n) ? request.target : null
}
