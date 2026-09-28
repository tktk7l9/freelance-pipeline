import { Card, Stack, Text } from '@mantine/core'

/**
 * Frame shown when there is nothing. Holds only one emoji, one sentence, and (if any) a next-step button.
 * The emoji is decoration, so it is hidden from screen readers.
 */
export function EmptyState({
  emoji = '🏠',
  title,
  description,
  action,
}: {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <Card withBorder padding="lg" className="sunken">
      <Stack align="center" gap="xs" ta="center">
        <Text fz={32} lh={1} aria-hidden>
          {emoji}
        </Text>
        <Text fw={600}>{title}</Text>
        {/* Even on the sunken surface (.sunken), dimmed reaches 4.71:1 (light) / 7.23:1 (dark).
            Hierarchy comes from size (14 vs 16) and weight in addition to color */}
        {description ? (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        ) : null}
        {action ? <Stack pt={4}>{action}</Stack> : null}
      </Stack>
    </Card>
  )
}
