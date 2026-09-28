import { VisuallyHidden } from '@mantine/core'
import { useLocation, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { PULL_HOLD, pullDistance, pullOpacity, shouldRefresh } from '../lib/pullToRefresh'

/**
 * On phones, pulling down while at the top of the page refetches the loaders (router.invalidate).
 * The page itself is not reloaded (forms and search conditions stay as they are).
 *
 * Disabled when:
 * - inside a Drawer / Modal (the user just wants to scroll the form)
 * - inside a self-scrolling box that is not scrolled to its top
 * - the page is not at the top (window.scrollY > 0)
 * Subscribes only on touch devices (pointer: coarse). Ported from sumai-log.
 */
/** Minimum time to show the refreshing state (ms) */
const MIN_SPIN_MS = 500

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { pathname } = useLocation()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0) return
      if (!canPullFrom(e.target)) return
      startY.current = e.touches[0]?.clientY ?? null
    }
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return
      const y = e.touches[0]?.clientY
      if (y === undefined) return
      const dy = y - startY.current
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0
        setPull(0)
        return
      }
      const d = pullDistance(dy)
      pullRef.current = d
      setPull(d)
    }
    const onEnd = async () => {
      if (startY.current === null) return
      startY.current = null
      const d = pullRef.current
      pullRef.current = 0
      if (!shouldRefresh(d)) {
        setPull(0)
        return
      }
      refreshingRef.current = true
      setRefreshing(true)
      setPull(PULL_HOLD)
      try {
        // Keep spinning for at least a short while so it is clear it "refreshed" even if the refetch finishes instantly
        await Promise.all([router.invalidate(), new Promise((r) => setTimeout(r, MIN_SPIN_MS))])
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        setPull(0)
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [pathname, router])

  // Same presentation as iOS (UIRefreshControl): a gap as tall as the pull opens at the top of the content,
  // a radial spinner darkens inside it, and it spins on release. No floating badge
  return (
    <>
      <div
        className="ptr-space"
        data-pulling={pull > 0 && !refreshing ? '' : undefined}
        style={{ height: pull }}
        aria-hidden={!refreshing}
      >
        <div
          className="ptr-spinner"
          data-spinning={refreshing ? '' : undefined}
          style={{ opacity: pullOpacity(pull) }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
        </div>
      </div>
      <div role="status" aria-live="polite">
        {refreshing ? <VisuallyHidden>更新中</VisuallyHidden> : null}
      </div>
      {children}
    </>
  )
}

/** Touches that start in a drawer or a self-scrolling box do not trigger pull-to-refresh */
function canPullFrom(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  if (target.closest('[role="dialog"]')) return false
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return false
  }
  return true
}
