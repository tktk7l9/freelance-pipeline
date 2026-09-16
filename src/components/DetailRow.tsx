import { Group, Text } from '@mantine/core'

/** 詳細ページの「ラベル: 値」1 行。案件詳細などで共有する */
export function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text component="div" size="sm" ta="right" className="breakable">
        {value ?? '—'}
      </Text>
    </Group>
  )
}
