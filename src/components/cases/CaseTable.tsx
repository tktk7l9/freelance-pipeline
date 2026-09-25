import { Badge, Table, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { DUE_COLOR, dueState } from '../../lib/deadlines'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatDateSlash } from '../../lib/format'
import { formatHourlyLines, formatRateLines } from '../../lib/rate'
import type { CaseListItem } from '../../server/cases'
import { RateLines } from './RateLines'
import { StatusBadge } from './StatusBadge'
import type { CompanySites } from '../../server/repository'
import { CompanyName } from '../CompanyName'

export function CaseTable({
  items,
  sites,
  today,
}: {
  items: CaseListItem[]
  sites: CompanySites
  today: string
}) {
  return (
    <Table.ScrollContainer minWidth={900}>
      <Table striped highlightOnHover stickyHeader className="case-table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>案件</Table.Th>
            <Table.Th>経路</Table.Th>
            <Table.Th ta="right">単価</Table.Th>
            <Table.Th ta="right">時給</Table.Th>
            <Table.Th>リモート</Table.Th>
            <Table.Th>開始</Table.Th>
            <Table.Th>状態</Table.Th>
            <Table.Th>次の一手</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>
                <Link to="/cases/$id" params={{ id: c.id }}>
                  <Text fw={600} lineClamp={1}>
                    {c.title}
                  </Text>
                </Link>
                <Text size="xs" c="dimmed">
                  <CompanyName name={c.company} url={sites[c.company]} />
                </Text>
              </Table.Td>
              <Table.Td>{ROUTE_LABEL[c.route]}</Table.Td>
              <Table.Td ta="right">
                <RateLines {...formatRateLines(c.monthlyMaxIncl, c.monthlyMinIncl)} align="right" />
              </Table.Td>
              <Table.Td ta="right">
                <RateLines {...formatHourlyLines(c.monthlyMaxIncl, c.hours)} align="right" />
              </Table.Td>
              <Table.Td>
                {REMOTE_LABEL[c.remoteType]}
                {c.onsiteNote ? (
                  <Text size="xs" c="dimmed">
                    {c.onsiteNote}
                  </Text>
                ) : null}
              </Table.Td>
              <Table.Td>{formatDateSlash(c.startDate)}</Table.Td>
              <Table.Td>
                <StatusBadge status={c.status} />
              </Table.Td>
              <Table.Td>
                {c.nextActionDue ? (
                  <Badge color={DUE_COLOR[dueState(c.nextActionDue, today)]} variant="light" mr={4}>
                    {formatDateSlash(c.nextActionDue)}
                  </Badge>
                ) : null}
                <Text size="sm" span>
                  {c.nextAction ?? ''}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
