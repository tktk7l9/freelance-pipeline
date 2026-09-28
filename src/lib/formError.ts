/**
 * Extracts a Japanese message from a createServerFn validator (zod) failure.
 *
 * When the validator (zod) of TanStack Start's createServerFn fails, the Error#message received
 * on the client is the JSON string of the issues array. zod's default messages are in
 * English (e.g. "Too big: expected string to have <=30 characters"), so rephrase them into
 * specific Japanese sentences from the field name and the code (too_big / too_small /
 * invalid_type / invalid_value). Messages the server deliberately threw in Japanese
 * (e.g. "タグは 1 つ以上必要です") are used as is. If it cannot be read as an issues array or the
 * field is unknown, fall back to the generic "保存できませんでした" (a last resort, so we do not
 * settle for one broad message).
 */

const JAPANESE_CHAR = /[぀-ヿ㐀-鿿]/

const DEFAULT_MESSAGE = '保存できませんでした'

type ZodIssueCode = 'too_big' | 'too_small' | 'invalid_type' | 'invalid_value' | 'invalid_format'

type RawIssue = {
  code?: unknown
  path?: unknown
  message?: unknown
}

/** Rephrasings per field and per code. Combinations not listed here use DEFAULT_MESSAGE */
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
    // If it is not JSON, it cannot be read as an issues array (a plain Error)
  }
  return null
}

/** The leading `values`/`data` segment is added by the createServerFn wrapper, so skip it */
const WRAPPER_SEGMENTS = new Set(['values', 'data'])

function pathHead(path: unknown): string | null {
  if (!Array.isArray(path) || path.length === 0) return null
  const head = WRAPPER_SEGMENTS.has(path[0]) ? path[1] : path[0]
  return typeof head === 'string' ? head : null
}

export type FormError = { message: string; path: string | null }

/** Returns the message and the target field (can be passed straight to Mantine's form.setFieldError) */
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

/** When only the message string is needed, e.g. for a Notification */
export function extractErrorMessage(error: unknown): string {
  return extractFormError(error).message
}
