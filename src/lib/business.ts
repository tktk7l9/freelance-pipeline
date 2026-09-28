export type FilingType = 'blue' | 'white'

export type BusinessInfo = {
  /** Date of birth YYYY-MM-DD. Used to find my age band in market data */
  birthDate: string | null
  openedOn: string | null // Business start date YYYY-MM-DD
  occupation: string | null // Occupation
  description: string | null // Business summary
  filingType: FilingType | null // Filing type (blue/white return)
  taxOffice: string | null // Competent tax office
  taxAddress: string | null // Address of the place for tax payment
  invoiceNumber: string | null // Qualified invoice issuer registration number, T + 13 digits
  invoiceRegisteredOn: string | null // Registration date YYYY-MM-DD
  etaxUserId: string | null // e-Tax user ID, 16 digits
  businessNumber: string | null // Business number
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

/** Restores the business settings from JSON. Broken JSON / wrong types become null per field */
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
