import { describe, expect, it } from 'vitest'

import { linesToImprovements, parseImprovements } from './improvements'

describe('parseImprovements', () => {
  it('JSON の文字列配列を読む。空・壊れた JSON・配列でないものは空', () => {
    expect(parseImprovements('["a"," b ",""]')).toEqual(['a', 'b'])
    expect(parseImprovements(null)).toEqual([])
    expect(parseImprovements('{')).toEqual([])
    expect(parseImprovements('{"a":1}')).toEqual([])
    expect(parseImprovements('[1, "x"]')).toEqual(['x'])
  })
})

describe('linesToImprovements', () => {
  it('1 行 1 項目。空行と先頭の記号を落とす', () => {
    expect(linesToImprovements('- a\n\n・b \n* c\nd')).toEqual(['a', 'b', 'c', 'd'])
    expect(linesToImprovements('')).toEqual([])
  })
})
