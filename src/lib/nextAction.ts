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
