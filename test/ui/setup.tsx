import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { notifications } from '@mantine/notifications'
import { afterEach, beforeEach, vi } from 'vitest'

import { resetMedia } from './media'

// Server functions run on Workers + D1 in production. UI tests replace each one with a vi.fn()
// so a test decides what the "server" answers, and nothing reaches a database.
vi.mock('@tanstack/react-start', () => ({ useServerFn: <T,>(fn: T) => fn }))
vi.mock('../../src/server/cases', () => ({
  listCasesFn: vi.fn(),
  getCaseDetail: vi.fn(),
  saveCase: vi.fn(),
  changeCaseStatus: vi.fn(),
  undoStatusChange: vi.fn(),
  saveNextAction: vi.fn(),
  addCaseMemo: vi.fn(),
  deleteCaseMemo: vi.fn(),
  deleteCaseFn: vi.fn(),
  importCase: vi.fn(),
}))
vi.mock('../../src/server/settings', () => ({
  getSettingsData: vi.fn(),
  saveThresholds: vi.fn(),
  saveAxes: vi.fn(),
  saveImprovements: vi.fn(),
  saveBusiness: vi.fn(),
}))
vi.mock('../../src/server/ledger', () => ({
  ledgerData: vi.fn(),
  saveLedgerEntry: vi.fn(),
  deleteLedgerEntry: vi.fn(),
}))
vi.mock('../../src/server/events', () => ({
  listEventsBetween: vi.fn(),
  saveEvent: vi.fn(),
  deleteEvent: vi.fn(),
}))
vi.mock('../../src/server/home', () => ({ homeData: vi.fn() }))
vi.mock('../../src/server/market', () => ({ marketData: vi.fn() }))

// jsdom gaps that Mantine and the app rely on. Browsers have all of these.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
window.scrollTo = () => {}
if (!('fonts' in document)) {
  // Autosize textareas listen for web fonts finishing to load
  Object.defineProperty(document, 'fonts', {
    value: { addEventListener() {}, removeEventListener() {} },
  })
}
if (typeof globalThis.CSS === 'undefined') {
  // Only CSS.escape is used (undoNotification); a minimal version is enough for data-path values
  globalThis.CSS = { escape: (v: string) => v.replace(/["\\]/g, '\\$&') } as unknown as typeof CSS
}

beforeEach(() => {
  resetMedia()
})

afterEach(() => {
  cleanup()
  notifications.clean()
  notifications.cleanQueue()
  vi.clearAllMocks()
})
