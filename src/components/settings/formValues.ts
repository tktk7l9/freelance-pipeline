/** 設定フォーム共通の正規化ヘルパー。空文字/空欄は null にして DB へ送る */
export const t = (v: string) => v.trim() || null

export const n = (v: number | '') => (v === '' ? null : v)
