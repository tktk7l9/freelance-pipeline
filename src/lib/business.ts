export type FilingType = 'blue' | 'white'

export type BusinessInfo = {
  /** 生年月日 YYYY-MM-DD。市場データで自分の年齢帯を出すのに使う */
  birthDate: string | null
  openedOn: string | null // 開業日 YYYY-MM-DD
  occupation: string | null // 職業
  description: string | null // 事業概要
  filingType: FilingType | null // 申告区分（青色/白色）
  taxOffice: string | null // 所轄税務署
  taxAddress: string | null // 納税地の住所
  invoiceNumber: string | null // 適格請求書発行事業者登録番号 T+13桁
  invoiceRegisteredOn: string | null // 登録年月日 YYYY-MM-DD
  etaxUserId: string | null // e-Tax 利用者識別番号 16桁
  businessNumber: string | null // 事業者番号
}

export const EMPTY_BUSINESS: BusinessInfo = {
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
}

export const FILING_TYPE_LABEL: Record<FilingType, string> = {
  blue: '青色申告',
  white: '白色申告',
}

export function isInvoiceNumber(v: string): boolean {
  return /^T\d{13}$/.test(v)
}

function textOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

function filingTypeOrNull(v: unknown): FilingType | null {
  return v === 'blue' || v === 'white' ? v : null
}

/** business 設定を JSON から復元。壊れた JSON / 型違いは項目ごとに null にする */
export function parseBusiness(raw: string | null): BusinessInfo {
  if (!raw) return EMPTY_BUSINESS
  try {
    const o: unknown = JSON.parse(raw)
    if (typeof o !== 'object' || o === null) return EMPTY_BUSINESS
    const r = o as Record<string, unknown>
    return {
      birthDate: textOrNull(r.birthDate),
      openedOn: textOrNull(r.openedOn),
      occupation: textOrNull(r.occupation),
      description: textOrNull(r.description),
      filingType: filingTypeOrNull(r.filingType),
      taxOffice: textOrNull(r.taxOffice),
      taxAddress: textOrNull(r.taxAddress),
      invoiceNumber: textOrNull(r.invoiceNumber),
      invoiceRegisteredOn: textOrNull(r.invoiceRegisteredOn),
      etaxUserId: textOrNull(r.etaxUserId),
      businessNumber: textOrNull(r.businessNumber),
    }
  } catch {
    return EMPTY_BUSINESS
  }
}
