import { describe, expect, it } from 'vitest'

import {
  LOG_KINDS,
  REMOTE_LABEL,
  REMOTE_TYPES,
  ROUTES,
  ROUTE_LABEL,
  TAX_BASES,
  TAX_BASIS_LABEL,
} from './enums'

describe('enums', () => {
  it('ROUTES の各値にラベルがある', () => {
    for (const route of ROUTES) {
      expect(ROUTE_LABEL[route]).toEqual(expect.any(String))
    }
  })

  it('TAX_BASES の各値にラベルがある', () => {
    for (const basis of TAX_BASES) {
      expect(TAX_BASIS_LABEL[basis]).toEqual(expect.any(String))
    }
  })

  it('REMOTE_TYPES の各値にラベルがある', () => {
    for (const type of REMOTE_TYPES) {
      expect(REMOTE_LABEL[type]).toEqual(expect.any(String))
    }
  })

  it('LOG_KINDS は status / memo / import の 3 種', () => {
    expect(LOG_KINDS).toEqual(['status', 'memo', 'import'])
  })
})
