import { describe, expect, it } from 'vitest'

import { linesToImprovements, parseImprovements } from './improvements'

describe('parseImprovements', () => {
  it('reads a JSON array of strings; empty, broken JSON or a non-array gives empty', () => {
    expect(parseImprovements('["a"," b ",""]')).toEqual(['a', 'b'])
    expect(parseImprovements(null)).toEqual([])
    expect(parseImprovements('{')).toEqual([])
    expect(parseImprovements('{"a":1}')).toEqual([])
    expect(parseImprovements('[1, "x"]')).toEqual(['x'])
  })
})

describe('linesToImprovements', () => {
  it('1 item per line; drops empty lines and leading bullet symbols', () => {
    expect(linesToImprovements('- a\n\n・b \n* c\nd')).toEqual(['a', 'b', 'c', 'd'])
    expect(linesToImprovements('')).toEqual([])
  })
})
