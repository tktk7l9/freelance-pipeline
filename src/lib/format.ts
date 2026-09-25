/** 単価の表示用フォーマッタ。金額は円の整数で受け取り、万円単位に丸めて表示する */

export function formatYen(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (Math.abs(value) < 10_000) return `${value.toLocaleString('ja-JP')}円`
  return `${Math.round(value / 10_000).toLocaleString('ja-JP')}万円`
}

/**
 * 日付の表示は全て `/` 区切りに統一する（所有者の要望、2026-09-25）。
 * 'YYYY-MM-DD' → 'YYYY/MM/DD'、'YYYY-MM' → 'YYYY/MM'、
 * 'YYYY-MM-DD HH:mm' → 'YYYY/MM/DD HH:mm'（経緯の日時）。
 * 形が合わない文字列はそのまま返す。DB の値・URL の検索パラメータは触らない
 * （あくまで表示のときにこれを通す）。
 */
export function formatDateSlash(value: string | null | undefined): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})(?:-(\d{2})( \d{2}:\d{2})?)?$/.exec(value)
  if (!m) return value
  const [, y, mo, d, time] = m
  if (!d) return `${y}/${mo}`
  return `${y}/${mo}/${d}${time ?? ''}`
}

/**
 * 住所を Google マップで開く URL。括弧書き（「（都営大江戸線 六本木駅 直結）」のような補足）は
 * 検索語から外す。空なら null。
 */
export function mapsUrl(address: string | null | undefined): string | null {
  const trimmed = address?.trim()
  if (!trimmed) return null
  const query = trimmed.replace(/[（(].*$/, '').trim() || trimmed
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
