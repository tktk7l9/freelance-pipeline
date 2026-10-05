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
  it('every LEDGER_KINDS value has a label and a direction', () => {
    for (const kind of LEDGER_KINDS) {
      expect(LEDGER_KIND_LABEL[kind]).toEqual(expect.any(String))
      expect(['income', 'outgo']).toContain(LEDGER_DIRECTION[kind])
    }
  })

  it('every EVENT_KINDS value has a label', () => {
    for (const kind of EVENT_KINDS) {
      expect(EVENT_KIND_LABEL[kind]).toEqual(expect.any(String))
    }
  })

  it('every ROUTES value has a label', () => {
    for (const route of ROUTES) {
      expect(ROUTE_LABEL[route]).toEqual(expect.any(String))
    }
  })

  it('every TAX_BASES value has a label', () => {
    for (const basis of TAX_BASES) {
      expect(TAX_BASIS_LABEL[basis]).toEqual(expect.any(String))
    }
  })

  it('every REMOTE_TYPES value has a label', () => {
    for (const type of REMOTE_TYPES) {
      expect(REMOTE_LABEL[type]).toEqual(expect.any(String))
    }
  })

  it('LOG_KINDS has the 3 kinds status / memo / import', () => {
    expect(LOG_KINDS).toEqual(['status', 'memo', 'import'])
  })
})
