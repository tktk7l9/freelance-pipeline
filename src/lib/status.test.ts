import { describe, expect, it } from 'vitest'

import {
  CASE_STATUSES,
  PROGRESS_STATUSES,
  STATUS_LABEL,
  canTransition,
  isTerminal,
  progressRank,
  statusGroup,
  nextProgress,
  transitionOptions,
} from './status'

describe('status', () => {
  it('全ステータスにラベルがある', () => {
    for (const s of CASE_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy()
  })

  it('進行は後ろにだけ進める（飛ばしは可）', () => {
    expect(canTransition('saved', 'applied')).toBe(true)
    expect(canTransition('saved', 'meeting')).toBe(true)
    expect(canTransition('meeting', 'applied')).toBe(false)
    expect(canTransition('applied', 'applied')).toBe(false)
    expect(progressRank('offer')).toBeGreaterThan(progressRank('meeting'))
    expect(progressRank('declined')).toBe(-1)
  })

  it('別枠へはどこからでも行ける', () => {
    for (const s of PROGRESS_STATUSES) {
      expect(canTransition(s, 'declined')).toBe(true)
      expect(canTransition(s, 'rejected')).toBe(true)
      expect(canTransition(s, 'onhold')).toBe(true)
    }
  })

  it('onhold からは進行のどこへでも戻れる', () => {
    expect(canTransition('onhold', 'saved')).toBe(true)
    expect(canTransition('onhold', 'joined')).toBe(true)
    expect(canTransition('onhold', 'declined')).toBe(true)
  })

  it('declined / rejected は終端', () => {
    expect(isTerminal('declined')).toBe(true)
    expect(isTerminal('rejected')).toBe(true)
    expect(isTerminal('onhold')).toBe(false)
    expect(canTransition('declined', 'saved')).toBe(false)
    expect(canTransition('rejected', 'onhold')).toBe(false)
  })

  it('グループ分け', () => {
    expect(statusGroup('saved')).toBe('active')
    expect(statusGroup('offer')).toBe('active')
    expect(statusGroup('joined')).toBe('history')
    expect(statusGroup('ended')).toBe('history')
    expect(statusGroup('onhold')).toBe('onhold')
    expect(statusGroup('declined')).toBe('closed')
    expect(statusGroup('rejected')).toBe('closed')
  })

  it('次に進む状態と、ボタンの構成', () => {
    expect(nextProgress('saved')).toBe('applied')
    expect(nextProgress('offer')).toBe('joined')
    expect(nextProgress('ended')).toBeNull()
    expect(nextProgress('onhold')).toBeNull()
    expect(nextProgress('declined')).toBeNull()
    expect(transitionOptions('applied')).toEqual({
      primary: 'screening',
      others: ['meeting', 'offer', 'joined', 'ended', 'declined', 'rejected', 'onhold'],
    })
    expect(transitionOptions('onhold').primary).toBeNull()
    expect(transitionOptions('onhold').others).toContain('applied')
    expect(transitionOptions('rejected')).toEqual({ primary: null, others: [] })
  })
})
