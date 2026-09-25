import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { DUE_COLOR, dueLabel, dueState } from '../../lib/deadlines'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatDateSlash } from '../../lib/format'
import { formatHourlyLines, formatMan, formatRateLines } from '../../lib/rate'
import type { CaseListItem } from '../../server/cases'
import type { CompanySites } from '../../server/repository'
import { RateLines } from '../cases/RateLines'
import { CompanyName } from '../CompanyName'

/** ホームの先頭。参画中（status = joined）の案件を出す。無ければ何も出さない */
export function CurrentCase({
  items,
  sites,
  today,
}: {
  items: CaseListItem[]
  sites: CompanySites
  today: string
}) {
  if (items.length === 0) return null
  return (
    <Stack gap="xs">
      <Title order={2}>現在の案件</Title>
      {items.map((c) => (
        <Link key={c.id} to="/cases/$id" params={{ id: c.id }} style={{ textDecoration: 'none' }}>
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Stack gap={2}>
                <Text fw={700} lineClamp={2}>
                  {c.title}
                </Text>
                <Text size="sm" c="dimmed">
                  <CompanyName name={c.company} url={sites[c.company]} nested />・
                  {ROUTE_LABEL[c.route]}
                  {c.agentName ? `（${c.agentName}）` : ''}
                </Text>
              </Stack>
              <Group gap="lg">
                <RateLines {...formatRateLines(c.monthlyMaxIncl, c.monthlyMinIncl)} />
                <RateLines {...formatHourlyLines(c.monthlyMaxIncl, c.hours)} />
                {c.actualMonthlyIncl ? (
                  <RateLines main={formatMan(c.actualMonthlyIncl)} sub="実単価・税込" />
                ) : null}
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs" verticalSpacing={4}>
                <Item label="契約期間">
                  {formatDateSlash(c.startDate)}
                  {c.endDate ? ` 〜 ${formatDateSlash(c.endDate)}` : ' 〜'}
                </Item>
                <Item label="精算幅">
                  {c.settlementMinH !== null && c.settlementMaxH !== null
                    ? `${c.settlementMinH}〜${c.settlementMaxH}h`
                    : '—'}
                </Item>
                <Item label="稼働">{c.daysPerWeek ?? '—'}</Item>
                <Item label="リモート">
                  {REMOTE_LABEL[c.remoteType]}
                  {c.onsiteNote ? `（${c.onsiteNote}）` : ''}
                </Item>
                <Item label="作業場所">{c.workLocation ?? '—'}</Item>
                <Item label="支払サイト">
                  {c.paymentSiteDays !== null ? `${c.paymentSiteDays} 日` : '—'}
                </Item>
              </SimpleGrid>
              {c.nextAction || c.nextActionDue ? (
                <Group gap="xs" wrap="nowrap">
                  {c.nextActionDue ? (
                    <Badge color={DUE_COLOR[dueState(c.nextActionDue, today)]} variant="light">
                      {formatDateSlash(c.nextActionDue)}
                      {dueLabel(c.nextActionDue, today)
                        ? ` ${dueLabel(c.nextActionDue, today)}`
                        : ''}
                    </Badge>
                  ) : null}
                  <Text size="sm" lineClamp={1}>
                    {c.nextAction ?? ''}
                  </Text>
                </Group>
              ) : null}
            </Stack>
          </Card>
        </Link>
      ))}
    </Stack>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{children}</Text>
    </Stack>
  )
}
