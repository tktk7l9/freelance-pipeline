import { Badge, Button, Card, Collapse, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { DUE_COLOR, dueLabel, dueState } from '../../lib/deadlines'
import { ROUTE_LABEL } from '../../lib/enums'
import { formatDateSlash, remoteSummary } from '../../lib/format'
import { formatHourlyLines, formatMan, formatRateLines } from '../../lib/rate'
import type { CaseListItem } from '../../server/cases'
import type { CompanySites } from '../../server/repository'
import { RateLines } from '../cases/RateLines'
import { CompanyName } from '../CompanyName'
import { PlaceLink } from '../PlaceLink'

/**
 * The active case (status = joined), folded to one line: title, period, and the next step.
 * The due list is the major task on home, so this stays small and opens on demand (SHIG 20, 67).
 * Renders nothing if there is no active case.
 */
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
        <CurrentCaseCard key={c.id} item={c} sites={sites} today={today} />
      ))}
    </Stack>
  )
}

function CurrentCaseCard({
  item: c,
  sites,
  today,
}: {
  item: CaseListItem
  sites: CompanySites
  today: string
}) {
  const [open, setOpen] = useState(false)
  const period = `${formatDateSlash(c.startDate)} 〜${c.endDate ? ` ${formatDateSlash(c.endDate)}` : ''}`
  const settlement =
    c.settlementMinH !== null && c.settlementMaxH !== null
      ? `${c.settlementMinH}〜${c.settlementMaxH}h`
      : null
  const detailsId = `current-${c.id}`
  return (
    <Card withBorder padding="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Link to="/cases/$id" params={{ id: c.id }} style={{ fontWeight: 700 }}>
              {c.title}
            </Link>
            <Text size="sm" c="dimmed">
              <CompanyName name={c.company} url={sites[c.company]} />・{period}
            </Text>
          </Stack>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={detailsId}
            rightSection={
              <ChevronDown
                size={14}
                aria-hidden
                style={{ transform: open ? 'rotate(180deg)' : undefined }}
              />
            }
            style={{ flexShrink: 0 }}
          >
            {open ? '閉じる' : '詳しく'}
          </Button>
        </Group>
        {c.nextAction || c.nextActionDue ? (
          <Group gap="xs" wrap="nowrap">
            {c.nextActionDue ? (
              <Badge color={DUE_COLOR[dueState(c.nextActionDue, today)]} variant="light">
                {formatDateSlash(c.nextActionDue)}
                {dueLabel(c.nextActionDue, today) ? ` ${dueLabel(c.nextActionDue, today)}` : ''}
              </Badge>
            ) : null}
            <Text size="sm" lineClamp={1}>
              {c.nextAction ?? ''}
            </Text>
          </Group>
        ) : null}
        <Collapse expanded={open} id={detailsId}>
          <Stack gap="sm" pt="xs">
            <Text size="sm" c="dimmed">
              {ROUTE_LABEL[c.route]}
              {c.agentName ? `（${c.agentName}）` : ''}
            </Text>
            <Group gap="lg">
              <RateLines {...formatRateLines(c.monthlyMaxIncl, c.monthlyMinIncl)} />
              <RateLines {...formatHourlyLines(c.monthlyMaxIncl, c.hours)} />
              {c.actualMonthlyIncl ? (
                <RateLines main={formatMan(c.actualMonthlyIncl)} sub="実単価・税込" />
              ) : null}
            </Group>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs" verticalSpacing={4}>
              {/* Empty fields are left out instead of showing a row of dashes (SHIG 1) */}
              {settlement ? <Item label="精算幅">{settlement}</Item> : null}
              {c.daysPerWeek ? <Item label="稼働">{c.daysPerWeek}</Item> : null}
              <Item label="リモート">{remoteSummary(c.remoteType, c.onsiteNote)}</Item>
              {c.workLocation ? (
                <Item label="作業場所">
                  <PlaceLink address={c.workLocation} />
                </Item>
              ) : null}
              {c.paymentSiteDays !== null ? (
                <Item label="支払サイト">{`${c.paymentSiteDays} 日`}</Item>
              ) : null}
            </SimpleGrid>
            {/* The decision memo holds "what I want to see now", such as the rate history, so show it in full */}
            {c.note ? (
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} className="breakable">
                {c.note}
              </Text>
            ) : null}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
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
