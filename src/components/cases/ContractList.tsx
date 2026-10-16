import { Button, Card, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { Plus } from 'lucide-react'

import type { ContractRow } from '../../db/schema'
import { contractHours, contractPeriod, sortContractsNewestFirst } from '../../lib/contract'
import type { Route } from '../../lib/enums'
import { formatHourlyLines, formatRateLines } from '../../lib/rate'
import { RateLines } from './RateLines'

/**
 * The signed contracts of a case, newest first: period, monthly fee, hourly, settlement terms.
 * Tap a contract to edit it (noun → verb, like the ledger). The case-sheet rate stays in the
 * conditions card above; this card is what was actually agreed.
 */
export function ContractList({
  contracts,
  route,
  onAdd,
  onSelect,
}: {
  contracts: ContractRow[]
  route: Route
  onAdd: () => void
  onSelect: (c: ContractRow) => void
}) {
  const rows = sortContractsNewestFirst(contracts)
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={2} size="h3">
            契約
          </Title>
          <Button
            variant="default"
            size="xs"
            leftSection={<Plus size={14} aria-hidden />}
            onClick={onAdd}
          >
            契約を追加
          </Button>
        </Group>
        {rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            契約はまだ登録されていません。注文書が届いたら月額と期間を入れると、一覧と収入の予測が契約の単価で計算されます。
          </Text>
        ) : (
          <Stack gap={0}>
            {rows.map((c) => (
              <ContractItem key={c.id} contract={c} route={route} onSelect={onSelect} />
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}

function ContractItem({
  contract: c,
  route,
  onSelect,
}: {
  contract: ContractRow
  route: Route
  onSelect: (c: ContractRow) => void
}) {
  const period = contractPeriod(c)
  const hours = contractHours(c, route)
  const settlement =
    c.settlementMinH !== null || c.settlementMaxH !== null
      ? `精算 ${c.settlementMinH ?? ''}〜${c.settlementMaxH ?? ''}h`
      : null
  const unitRates = [
    c.overtimeRate !== null ? `超過 ${c.overtimeRate.toLocaleString('ja-JP')}円/h` : null,
    c.deductionRate !== null ? `控除 ${c.deductionRate.toLocaleString('ja-JP')}円/h` : null,
  ].filter((s): s is string => s !== null)
  const terms = [settlement, ...unitRates, c.orderNo ? `注文番号 ${c.orderNo}` : null].filter(
    (s): s is string => s !== null,
  )
  return (
    <UnstyledButton
      onClick={() => onSelect(c)}
      className="ledger-row"
      aria-label={`${period} の契約を編集`}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start" py={8} gap="sm">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text size="sm" fw={600}>
            {period}
          </Text>
          {terms.length > 0 ? (
            <Text size="xs" c="dimmed" className="breakable">
              {terms.join('・')}
            </Text>
          ) : null}
          {c.note ? (
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }} className="breakable">
              {c.note}
            </Text>
          ) : null}
        </Stack>
        <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
          <RateLines {...formatRateLines(c.monthlyIncl, null)} align="right" />
          <RateLines {...formatHourlyLines(c.monthlyIncl, hours)} align="right" />
        </Group>
      </Group>
    </UnstyledButton>
  )
}
