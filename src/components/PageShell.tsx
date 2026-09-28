import { Anchor, Container, Stack, Text, Title, VisuallyHidden } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

/**
 * Page frame. On tab pages (home, cases, compare, schedule, settings) the heading is conveyed only to
 * assistive technology and not shown on screen (it would repeat the bottom-tab / left-nav label, and on
 * phones it takes too much prime space; owner's request, 2026-09-25). The heading hierarchy (h1) is kept.
 * Pages whose heading is itself the content, like case details, show it on screen via `heading`.
 */
export function PageShell({
  title,
  back,
  heading = false,
  description,
  actions,
  fab = false,
  wide = false,
  children,
}: {
  title: string
  /** Link back up one level. A PWA added to the home screen has no browser back button, so
   * always put it on deep pages such as details and import */
  back?: { to: '/' | '/cases' | '/calendar' | '/settings'; label: string }
  /** When true, show the heading and description on screen (pages whose heading is the content, like case details) */
  heading?: boolean
  /** Used only with heading */
  description?: React.ReactNode
  /** Actions placed to the right of the heading (for desktop; phones use the FAB) */
  actions?: React.ReactNode
  /** Whether this page shows a <Fab>. If true, add bottom padding so the last card is not hidden */
  fab?: boolean
  /** Pages that show tables. At reading width (sm) columns get squashed, so widen to lg */
  wide?: boolean
  children?: React.ReactNode
}) {
  return (
    <Container size={wide ? 'lg' : 'sm'} px={0} className={fab ? 'fab-clearance' : undefined}>
      {/* 24px between heading and content (same as between sections). 4px inside the heading group */}
      <Stack gap="lg">
        {back ? (
          <Anchor
            component={Link}
            to={back.to}
            size="sm"
            c="dimmed"
            underline="never"
            className="back-link"
          >
            <ArrowLeft size={16} aria-hidden />
            {back.label}
          </Anchor>
        ) : null}
        {heading ? (
          <Stack gap={4}>
            <Title order={1}>{title}</Title>
            {description ? (
              <Text c="dimmed" size="sm">
                {description}
              </Text>
            ) : null}
            {actions ? <Stack pt={4}>{actions}</Stack> : null}
          </Stack>
        ) : (
          <>
            <VisuallyHidden>
              <Title order={1}>{title}</Title>
            </VisuallyHidden>
            {actions ? <Stack>{actions}</Stack> : null}
          </>
        )}
        {children}
      </Stack>
    </Container>
  )
}
