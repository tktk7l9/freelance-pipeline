/**
 * 「改善したいこと」（ホームに出す箇条書き）。settings の 'improvements' に JSON の文字列配列で持つ。
 * 過去のやり取りから拾った反省・次の一手を、忘れないよう毎回目に入る場所に置く（SHIG 12）。
 */
export function parseImprovements(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
      : []
  } catch {
    return []
  }
}

/** 設定画面の Textarea（1 行 1 項目）から配列へ。空行と前後の空白は落とす。先頭の「- 」は外す */
export function linesToImprovements(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-・*]\s*/, ''))
    .filter((l) => l !== '')
}
