/**
 * Math for "pull to refresh". Only pure functions that do not touch the DOM live here
 * (touch subscription and rendering are in `src/components/PullToRefresh.tsx`).
 *
 * A PWA (standalone) has no built-in browser pull-to-refresh, and since bounce is stopped with
 * `overscroll-behavior-y: none`, the built-in one does not work even when opened in a browser.
 * The app provides it instead (ported from sumai-log).
 */

/** Pulling this far (px) triggers a refresh on release */
export const PULL_THRESHOLD = 72
/** Caps the finger travel distance at this (so it does not stretch without limit) */
export const PULL_MAX = 120
/** Height at which the indicator is held while refreshing */
export const PULL_HOLD = 56

/**
 * Converts finger travel (px) into the visual pull amount. Moves lightly at first and gets heavier the further you pull
 * (starts at half the distance and approaches the cap asymptotically). Negative or 0 gives 0.
 */
export function pullDistance(dy: number): number {
  if (dy <= 0) return 0
  const eased = PULL_MAX * (1 - Math.exp(-dy / (PULL_MAX * 1.2)))
  return Math.round(Math.min(PULL_MAX, eased))
}

/** Whether to refresh on release */
export function shouldRefresh(distance: number): boolean {
  return distance >= PULL_THRESHOLD
}

/** Indicator opacity (faint at the start of the pull, 1 at the threshold) */
export function pullOpacity(distance: number): number {
  if (distance <= 0) return 0
  return Math.min(1, distance / PULL_THRESHOLD)
}
