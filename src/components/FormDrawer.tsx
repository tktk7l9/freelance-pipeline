import { Drawer } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

/** Full-screen from the bottom on phones; a 480-wide Drawer from the right on desktop */
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
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position={isMobile ? 'bottom' : 'right'}
      size={isMobile ? '100%' : 480}
      padding="md"
      zIndex={zIndex}
      styles={{ title: { fontWeight: 700, fontSize: 'var(--mantine-font-size-lg)' } }}
    >
      {children}
    </Drawer>
  )
}
