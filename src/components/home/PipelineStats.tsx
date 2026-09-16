import { Card, Group, Stack, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { formatMan } from '../../lib/rate'

export function PipelineStats({
  activeCount,
  medianIncl,
}: {
  activeCount: number
  medianIncl: number | null
}) {
  return (
    <Link to="/cases" search={{ group: 'active' }} style={{ textDecoration: 'none' }}>
      <Card withBorder padding="md">
        <Group grow>
          <Stack gap={0} align="center">
            <Text size="xs" c="dimmed">
              進行中
            </Text>
            <Text fw={700} fz={28}>
              {activeCount}
              <Text span size="sm">
                {' '}
                本
              </Text>
            </Text>
          </Stack>
          <Stack gap={0} align="center">
            <Text size="xs" c="dimmed">
              税込中央値
            </Text>
            <Text fw={700} fz={28}>
              {formatMan(medianIncl)}
            </Text>
          </Stack>
        </Group>
      </Card>
    </Link>
  )
}
