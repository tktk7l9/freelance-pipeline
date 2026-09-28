/** Shared normalization helpers for settings forms. Empty strings/fields become null before going to the DB */
export const t = (v: string) => v.trim() || null

export const n = (v: number | '') => (v === '' ? null : v)
