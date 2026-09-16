import { Badge, Card, Group, Stack, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { RateLines } from '../cases/RateLines'
import { ROUTE_LABEL } from '../../lib/enums'
import { formatRateLines, type RouteStat } from '../../lib/rate'

export function PipelineStats({
  activeCount,
  medianIncl,
  byRoute,
}: {
  activeCount: number
  medianIncl: number | null
  byRoute: RouteStat[]
}) {
  return (
    <Link to="/cases" search={{ group: 'active' }} style={{ textDecoration: 'none' }}>
      <Card withBorder padding="md">
        <Stack gap="sm">
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
                中央値
              </Text>
              {medianIncl === null ? (
                <Text fw={700} fz={28}>
                  —
                </Text>
              ) : (
                <RateLines {...formatRateLines(medianIncl, null)} />
              )}
            </Stack>
          </Group>
          {byRoute.length > 0 ? (
            <Stack gap={4}>
              {byRoute.map((r) => (
                <Group key={r.route} justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Badge variant="light" size="sm">
                      {ROUTE_LABEL[r.route]}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {r.activeCount} 本
                    </Text>
                  </Group>
                  {r.medianIncl === null ? (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  ) : (
                    <RateLines {...formatRateLines(r.medianIncl, null)} align="right" />
                  )}
                </Group>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Card>
    </Link>
  )
}
