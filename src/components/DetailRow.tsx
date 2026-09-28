import { Group, Text } from '@mantine/core'

/**
 * One "label: value" row on a detail page. Shared by case details and others.
 * An empty value renders no row at all rather than a row of dashes (SHIG 1).
 */
export function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text component="div" size="sm" ta="right" className="breakable">
        {value}
      </Text>
    </Group>
  )
}
