import { describe, expect, it } from 'vitest'

import {
  EMPTY_BUSINESS,
  FILING_TYPE_LABEL,
  isInvoiceNumber,
  parseBusiness,
  type BusinessInfo,
} from './business'

const full: BusinessInfo = {
  birthDate: '1990-01-01',
  openedOn: '2020-04-01',
  occupation: 'ソフトウェア開発',
  description: '受託開発の事業概要（サンプル）',
  filingType: 'blue',
  taxOffice: 'サンプル税務署',
  taxAddress: 'サンプル県サンプル市1-2-3',
  invoiceNumber: 'T1234567890123',
  invoiceRegisteredOn: '2023-10-01',
  etaxUserId: '1234567890123456',
  businessNumber: 'B0001',
}

describe('business', () => {
  it('the empty default has every field null', () => {
    expect(EMPTY_BUSINESS).toEqual({
      birthDate: null,
      openedOn: null,
      occupation: null,
      description: null,
      filingType: null,
      taxOffice: null,
      taxAddress: null,
      invoiceNumber: null,
      invoiceRegisteredOn: null,
      etaxUserId: null,
      businessNumber: null,
    })
  })

  it('display labels of the filing type', () => {
    expect(FILING_TYPE_LABEL.blue).toBe('青色申告')
    expect(FILING_TYPE_LABEL.white).toBe('白色申告')
  })

  it('the invoice registration number (インボイス登録番号) is T + 13 digits', () => {
    expect(isInvoiceNumber('T1234567890123')).toBe(true)
    expect(isInvoiceNumber('T123456789012')).toBe(false)
    expect(isInvoiceNumber('1234567890123')).toBe(false)
    expect(isInvoiceNumber('T12345678901234')).toBe(false)
    expect(isInvoiceNumber('Tabcdefghijklm')).toBe(false)
  })

  it('null / broken JSON gives the default', () => {
    expect(parseBusiness(null)).toEqual(EMPTY_BUSINESS)
    expect(parseBusiness('{bad')).toEqual(EMPTY_BUSINESS)
    expect(parseBusiness(JSON.stringify('not-object'))).toEqual(EMPTY_BUSINESS)
    expect(parseBusiness(JSON.stringify(null))).toEqual(EMPTY_BUSINESS)
  })

  it('round-trips (when every field is filled)', () => {
    expect(parseBusiness(JSON.stringify(full))).toEqual(full)
  })

  it('fields with a wrong type or invalid value fall back to null', () => {
    const raw = JSON.stringify({
      openedOn: 123,
      occupation: '',
      description: '   ',
      filingType: 'red',
      taxOffice: null,
      taxAddress: undefined,
      invoiceNumber: 42,
      invoiceRegisteredOn: {},
      etaxUserId: [],
      businessNumber: true,
    })
    expect(parseBusiness(raw)).toEqual(EMPTY_BUSINESS)
  })

  it('also reads filingType white', () => {
    expect(parseBusiness(JSON.stringify({ ...full, filingType: 'white' })).filingType).toBe('white')
  })
})
