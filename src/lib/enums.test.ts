import { describe, expect, it } from 'vitest'

import {
  EVENT_KINDS,
  EVENT_KIND_LABEL,
  LEDGER_DIRECTION,
  LEDGER_KINDS,
  LEDGER_KIND_LABEL,
  LOG_KINDS,
  REMOTE_LABEL,
  REMOTE_TYPES,
  ROUTES,
  ROUTE_LABEL,
  TAX_BASES,
  TAX_BASIS_LABEL,
} from './enums'

describe('enums', () => {
  it('LEDGER_KINDS の各値にラベルと向きがある', () => {
    for (const kind of LEDGER_KINDS) {
      expect(LEDGER_KIND_LABEL[kind]).toEqual(expect.any(String))
      expect(['income', 'outgo']).toContain(LEDGER_DIRECTION[kind])
    }
  })

  it('EVENT_KINDS の各値にラベルがある', () => {
    for (const kind of EVENT_KINDS) {
      expect(EVENT_KIND_LABEL[kind]).toEqual(expect.any(String))
    }
  })

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
