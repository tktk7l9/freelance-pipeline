import { Alert, Button, Drawer, Group, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { focusAfterSave } from '../lib/nextAction'

/** Lets a form inside a FormDrawer say whether it holds unsaved input */
const DirtyContext = createContext<((dirty: boolean) => void) | null>(null)

/**
 * Called by forms rendered inside a FormDrawer. Outside a drawer it does nothing.
 * The flag is cleared when the form unmounts.
 */
export function useReportDirty(dirty: boolean) {
  const report = useContext(DirtyContext)
  useEffect(() => {
    report?.(dirty)
  }, [report, dirty])
  useEffect(() => () => report?.(false), [report])
}

/**
 * Full-screen from the bottom on phones; a 480-wide Drawer from the right on desktop.
 *
 * Closing (Esc, ×, or the overlay) with unsaved input no longer throws it away silently: the drawer
 * stays open and asks once, in place, whether to discard it (SHIG 38: what the user typed belongs
 * to the user). Saving closes through `opened` and is not asked about.
 */
export function FormDrawer({
  opened,
  onClose,
  title,
  children,
  zIndex,
}: {
  opened: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Defaults to Mantine's modal default (200). Pages that need it above other elements pass it explicitly */
  zIndex?: number
}) {
  const isMobile = useMediaQuery('(max-width: 48em)', true)
  const [dirty, setDirty] = useState(false)
  const [asking, setAsking] = useState(false)
  const report = useCallback((d: boolean) => setDirty(d), [])
  const keepRef = useRef<HTMLButtonElement>(null)
  // The field the owner was in when the question came up. "入力を続ける" removes the question (and the
  // focused button with it), so focus goes back there instead of falling to <body> (SHIG 94)
  const resumeRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!opened) setAsking(false)
  }, [opened])

  // The question appears at the top of the form; bring it into view even when the owner was typing
  // further down, and put focus on the safe choice
  useEffect(() => {
    if (!asking) return
    keepRef.current?.scrollIntoView({ block: 'center' })
    keepRef.current?.focus({ preventScroll: true })
  }, [asking])

  function requestClose() {
    if (dirty && !asking) {
      resumeRef.current = document.activeElement
      setAsking(true)
      return
    }
    onClose()
  }

  function keepEditing() {
    setAsking(false)
    const resume = resumeRef.current
    resumeRef.current = null
    // After the question unmounts on the next frame
    requestAnimationFrame(() => {
      const target = focusAfterSave<Element>({
        active: document.activeElement,
        body: document.body,
        before: resume,
        beforeUsable: resume?.isConnected ?? false,
        fallback: null,
      })
      if (target instanceof HTMLElement) target.focus({ preventScroll: true })
    })
  }

  // Built from the compound parts instead of <Drawer title>, for two reasons:
  // - the close button is icon-only, so it needs a spoken name (SHIG 11, WCAG 4.1.2)
  // - Mantine renders the drawer header as <header>, which audits count as a second banner next to
  //   the app header; a plain container keeps a single banner landmark on the page
  return (
    <Drawer.Root
      opened={opened}
      onClose={requestClose}
      position={isMobile ? 'bottom' : 'right'}
      size={isMobile ? '100%' : 480}
      padding="md"
      zIndex={zIndex}
    >
      <Drawer.Overlay />
      <Drawer.Content>
        <Drawer.Header role="none">
          <Drawer.Title fw={700} fz="lg">
            {title}
          </Drawer.Title>
          <Drawer.CloseButton aria-label="閉じる" />
        </Drawer.Header>
        <Drawer.Body>
          {asking ? (
            <Alert
              color="yellow"
              variant="light"
              mb="md"
              role="alertdialog"
              aria-live="assertive"
              // Mantine's Alert sets aria-labelledby to its (absent) title, so name it directly
              aria-label="保存していない入力があります"
            >
              <Text size="sm" mb="xs">
                保存していない入力があります。閉じると消えます。
              </Text>
              <Group gap="xs" justify="space-between">
                <Button size="xs" variant="subtle" color="red" onClick={onClose}>
                  入力を捨てて閉じる
                </Button>
                <Button size="xs" ref={keepRef} onClick={keepEditing}>
                  入力を続ける
                </Button>
              </Group>
            </Alert>
          ) : null}
          <DirtyContext.Provider value={report}>{children}</DirtyContext.Provider>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
