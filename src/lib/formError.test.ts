import { describe, expect, it } from 'vitest'

import { extractErrorMessage, extractFormError } from './formError'

function issueError(issues: unknown[]): Error {
  return new Error(JSON.stringify(issues))
}

describe('extractFormError', () => {
  it('Error でない値は既定のメッセージ・path なし', () => {
    expect(extractFormError('boom')).toEqual({ message: '保存できませんでした', path: null })
    expect(extractFormError(undefined)).toEqual({ message: '保存できませんでした', path: null })
  })

  it('issues 配列として読めないプレーンな Error は、日本語ならそのまま使う', () => {
    expect(extractFormError(new Error('ネットワークに問題があります'))).toEqual({
      message: 'ネットワークに問題があります',
      path: null,
    })
  })

  it('issues 配列として読めないプレーンな Error で、英語なら既定のメッセージにする', () => {
    expect(extractFormError(new Error('Network error'))).toEqual({
      message: '保存できませんでした',
      path: null,
    })
  })

  it('issues 配列として読めないプレーンな Error で、message が空なら既定のメッセージにする', () => {
    expect(extractFormError(new Error())).toEqual({ message: '保存できませんでした', path: null })
  })

  it('サーバーが明示的に日本語で投げた issue のメッセージはそのまま使う', () => {
    const error = issueError([
      { code: 'custom', path: ['company'], message: '取引先名を確認してください' },
    ])
    expect(extractFormError(error)).toEqual({
      message: '取引先名を確認してください',
      path: 'company',
    })
  })

  it('company の too_small は「企業名は必須です」に言い換える', () => {
    const error = issueError([{ code: 'too_small', path: ['company'], message: 'Too small' }])
    expect(extractFormError(error)).toEqual({
      message: '企業名は必須です',
      path: 'company',
    })
  })

  it('未知のフィールドは既定のメッセージ（path は返す）', () => {
    expect(
      extractFormError(issueError([{ code: 'too_big', path: ['unknown'], message: 'x' }])),
    ).toEqual({
      message: '保存できませんでした',
      path: 'unknown',
    })
  })

  it('既知のフィールドでも未知の code は既定のメッセージ', () => {
    expect(
      extractFormError(issueError([{ code: 'invalid_type', path: ['company'], message: 'oops' }])),
    ).toEqual({ message: '保存できませんでした', path: 'company' })
  })

  it('path が空配列・無い・数値始まりなら path は null', () => {
    expect(
      extractFormError(issueError([{ code: 'too_big', path: [], message: 'x' }])).path,
    ).toBeNull()
    expect(extractFormError(issueError([{ code: 'too_big', message: 'x' }])).path).toBeNull()
    expect(
      extractFormError(issueError([{ code: 'too_big', path: [0], message: 'x' }])).path,
    ).toBeNull()
  })

  it('issue の message が文字列でなくても既定のメッセージにフォールバックする', () => {
    expect(extractFormError(issueError([{ code: 'too_small', path: ['company'] }])).message).toBe(
      '企業名は必須です',
    )
  })

  it('code が無ければ既知のフィールドでも既定のメッセージ', () => {
    expect(extractFormError(issueError([{ path: ['company'], message: 'x' }])).message).toBe(
      '保存できませんでした',
    )
  })

  it('issues が空配列なら issue 無しとして扱う', () => {
    expect(extractFormError(issueError([]))).toEqual({
      message: '保存できませんでした',
      path: null,
    })
  })

  it('JSON だが配列でなければ issues 配列としては読めない扱いになる', () => {
    const error = new Error(JSON.stringify({ not: 'an array' }))
    expect(extractFormError(error)).toEqual({ message: '保存できませんでした', path: null })
  })
})

describe('extractErrorMessage', () => {
  it('extractFormError の message だけを返す', () => {
    expect(
      extractErrorMessage(issueError([{ code: 'too_small', path: ['company'], message: 'x' }])),
    ).toBe('企業名は必須です')
  })
})
