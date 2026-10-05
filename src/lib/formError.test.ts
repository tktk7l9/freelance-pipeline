import { describe, expect, it } from 'vitest'

import { extractErrorMessage, extractFormError } from './formError'

function issueError(issues: unknown[]): Error {
  return new Error(JSON.stringify(issues))
}

describe('extractFormError', () => {
  it('a non-Error value gives the default message and no path', () => {
    expect(extractFormError('boom')).toEqual({ message: '保存できませんでした', path: null })
    expect(extractFormError(undefined)).toEqual({ message: '保存できませんでした', path: null })
  })

  it('a plain Error that is not an issues array is used as is when it is Japanese', () => {
    expect(extractFormError(new Error('ネットワークに問題があります'))).toEqual({
      message: 'ネットワークに問題があります',
      path: null,
    })
  })

  it('a plain Error that is not an issues array gives the default message when it is English', () => {
    expect(extractFormError(new Error('Network error'))).toEqual({
      message: '保存できませんでした',
      path: null,
    })
  })

  it('a plain Error that is not an issues array gives the default message when its message is empty', () => {
    expect(extractFormError(new Error())).toEqual({ message: '保存できませんでした', path: null })
  })

  it('uses as is the message of an issue the server explicitly threw in Japanese', () => {
    const error = issueError([
      { code: 'custom', path: ['company'], message: '取引先名を確認してください' },
    ])
    expect(extractFormError(error)).toEqual({
      message: '取引先名を確認してください',
      path: 'company',
    })
  })

  it('rewords too_small on company as 「企業名は必須です」 (company name is required)', () => {
    const error = issueError([{ code: 'too_small', path: ['company'], message: 'Too small' }])
    expect(extractFormError(error)).toEqual({
      message: '企業名は必須です',
      path: 'company',
    })
  })

  it('an unknown field gives the default message (and still returns the path)', () => {
    expect(
      extractFormError(issueError([{ code: 'too_big', path: ['unknown'], message: 'x' }])),
    ).toEqual({
      message: '保存できませんでした',
      path: 'unknown',
    })
  })

  it('an unknown code gives the default message even for a known field', () => {
    expect(
      extractFormError(issueError([{ code: 'invalid_type', path: ['company'], message: 'oops' }])),
    ).toEqual({ message: '保存できませんでした', path: 'company' })
  })

  it('path is null when it is an empty array, missing, or starts with a number', () => {
    expect(
      extractFormError(issueError([{ code: 'too_big', path: [], message: 'x' }])).path,
    ).toBeNull()
    expect(extractFormError(issueError([{ code: 'too_big', message: 'x' }])).path).toBeNull()
    expect(
      extractFormError(issueError([{ code: 'too_big', path: [0], message: 'x' }])).path,
    ).toBeNull()
  })

  it('skips a leading values/data and uses the next segment as the path', () => {
    const error = issueError([
      { code: 'too_small', path: ['values', 'company'], message: 'Too small' },
    ])
    expect(extractFormError(error)).toEqual({
      message: '企業名は必須です',
      path: 'company',
    })
  })

  it('falls back to the default message when the issue message is not a string', () => {
    expect(extractFormError(issueError([{ code: 'too_small', path: ['company'] }])).message).toBe(
      '企業名は必須です',
    )
  })

  it('without a code, a known field still gives the default message', () => {
    expect(extractFormError(issueError([{ path: ['company'], message: 'x' }])).message).toBe(
      '保存できませんでした',
    )
  })

  it('treats an empty issues array as no issue', () => {
    expect(extractFormError(issueError([]))).toEqual({
      message: '保存できませんでした',
      path: null,
    })
  })

  it('JSON that is not an array is not read as an issues array', () => {
    const error = new Error(JSON.stringify({ not: 'an array' }))
    expect(extractFormError(error)).toEqual({ message: '保存できませんでした', path: null })
  })
})

describe('extractErrorMessage', () => {
  it('returns only the message of extractFormError', () => {
    expect(
      extractErrorMessage(issueError([{ code: 'too_small', path: ['company'], message: 'x' }])),
    ).toBe('企業名は必須です')
  })
})
