/**
 * createServerFn の validator（zod）失敗から日本語のメッセージを取り出す。
 *
 * TanStack Start の createServerFn は validator（zod）が失敗すると、クライアント側で
 * 受け取る Error#message が issues 配列の JSON 文字列になる。zod の既定メッセージは
 * 英語（例: "Too big: expected string to have <=30 characters"）なので、フィールド名と
 * code（too_big / too_small / invalid_type / invalid_value）から具体的な日本語の文に
 * 言い換える。サーバー側が明示的に日本語で投げたメッセージ（例:「タグは 1 つ以上
 * 必要です」）はそのまま使う。issues 配列として読めない・フィールドが未知の場合は
 * 汎用の「保存できませんでした」にフォールバックする（1 つの広いメッセージで済ませない
 * ための最終手段）。
 */

const JAPANESE_CHAR = /[぀-ヿ㐀-鿿]/

const DEFAULT_MESSAGE = '保存できませんでした'

type ZodIssueCode = 'too_big' | 'too_small' | 'invalid_type' | 'invalid_value' | 'invalid_format'

type RawIssue = {
  code?: unknown
  path?: unknown
  message?: unknown
}

/** フィールドごと・code ごとの言い換え。ここに無い組み合わせは DEFAULT_MESSAGE */
const FIELD_CODE_MESSAGE: Record<string, Partial<Record<ZodIssueCode, string>>> = {
  company: { too_small: '企業名は必須です', too_big: '企業名は 200 文字までです' },
  title: { too_small: '案件名は必須です', too_big: '案件名は 300 文字までです' },
  monthlyMax: { too_small: '単価上限は 1 円以上', invalid_type: '単価上限は整数で入れてください' },
  startDate: { invalid_format: '開始は YYYY-MM-DD か YYYY-MM' },
  nextActionDue: { invalid_format: '期日は YYYY-MM-DD' },
  sourceUrl: { too_big: 'URL は 500 文字までです' },
  rawText: { too_small: '原文は必須です', too_big: '原文は 50,000 文字までです' },
  json: { too_big: 'JSON が長すぎます' },
  body: { too_small: 'メモを入れてください', too_big: 'メモは 4000 文字までです' },
}

function firstIssue(error: unknown): RawIssue | null {
  if (!(error instanceof Error)) return null
  try {
    const issues = JSON.parse(error.message) as unknown
    if (Array.isArray(issues) && issues.length > 0) return issues[0] as RawIssue
  } catch {
    // JSON でなければ issues 配列としては読めない（プレーンな Error）
  }
  return null
}

/** `values`/`data` の先頭セグメントは createServerFn のラップで足されるので読み飛ばす */
const WRAPPER_SEGMENTS = new Set(['values', 'data'])

function pathHead(path: unknown): string | null {
  if (!Array.isArray(path) || path.length === 0) return null
  const head = WRAPPER_SEGMENTS.has(path[0]) ? path[1] : path[0]
  return typeof head === 'string' ? head : null
}

export type FormError = { message: string; path: string | null }

/** メッセージと対象フィールド（Mantine の form.setFieldError にそのまま渡せる）を返す */
export function extractFormError(error: unknown): FormError {
  const issue = firstIssue(error)
  if (!issue) {
    const message = error instanceof Error && error.message ? error.message : ''
    return { message: JAPANESE_CHAR.test(message) ? message : DEFAULT_MESSAGE, path: null }
  }

  const path = pathHead(issue.path)
  const rawMessage = typeof issue.message === 'string' ? issue.message : ''
  if (JAPANESE_CHAR.test(rawMessage)) return { message: rawMessage, path }

  const code = typeof issue.code === 'string' ? (issue.code as ZodIssueCode) : undefined
  const mapped = path && code ? FIELD_CODE_MESSAGE[path]?.[code] : undefined
  return { message: mapped ?? DEFAULT_MESSAGE, path }
}

/** Notification 表示など、メッセージ文字列だけで足りるとき */
export function extractErrorMessage(error: unknown): string {
  return extractFormError(error).message
}
