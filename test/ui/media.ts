/**
 * Controllable window.matchMedia. Tests call setMedia() to act as a phone (narrow, touch) or a
 * desktop; every query not listed answers false.
 */
// Reduced motion is always on: with it Mantine skips height/opacity transitions that never finish
// in jsdom (no transitionend), so Collapse and friends settle immediately.
const ALWAYS = ['(prefers-reduced-motion: reduce)']
let matching = new Set<string>(ALWAYS)

export function setMedia(queries: string[]) {
  matching = new Set([...ALWAYS, ...queries])
}

export function resetMedia() {
  matching = new Set(ALWAYS)
}

/** Queries used by the app */
export const PHONE = ['(max-width: 48em)', '(max-width: 47.99em)', '(pointer: coarse)']

window.matchMedia = (query: string) =>
  ({
    matches: matching.has(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
