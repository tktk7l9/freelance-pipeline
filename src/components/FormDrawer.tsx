import { Alert, Button, Drawer, Group, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

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
      setAsking(true)
      return
    }
    onClose()
  }

  return (
    <Drawer
      opened={opened}
      onClose={requestClose}
      title={title}
      position={isMobile ? 'bottom' : 'right'}
      size={isMobile ? '100%' : 480}
      padding="md"
      zIndex={zIndex}
      styles={{ title: { fontWeight: 700, fontSize: 'var(--mantine-font-size-lg)' } }}
    >
      {asking ? (
        <Alert color="yellow" variant="light" mb="md" role="alertdialog" aria-live="assertive">
          <Text size="sm" mb="xs">
            保存していない入力があります。閉じると消えます。
          </Text>
          <Group gap="xs" justify="space-between">
            <Button size="xs" variant="subtle" color="red" onClick={onClose}>
              入力を捨てて閉じる
            </Button>
            <Button size="xs" ref={keepRef} onClick={() => setAsking(false)}>
              入力を続ける
            </Button>
          </Group>
        </Alert>
      ) : null}
      <DirtyContext.Provider value={report}>{children}</DirtyContext.Provider>
    </Drawer>
  )
}
