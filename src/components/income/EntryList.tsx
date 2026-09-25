import { Badge, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core'

import type { LedgerRow } from '../../db/schema'
import { LEDGER_DIRECTION, LEDGER_KIND_LABEL } from '../../lib/enums'
import { formatDateSlash } from '../../lib/format'

/** 年内の明細。行をタップで編集（名詞→動詞：対象を選んでから操作） */
export function EntryList({
  rows,
  onSelect,
}: {
  rows: LedgerRow[]
  onSelect: (r: LedgerRow) => void
}) {
  if (rows.length === 0) return null
  return (
    <Stack gap="xs">
      <Title order={2}>明細</Title>
      <Stack gap={0}>
        {rows.map((r) => {
          const income = LEDGER_DIRECTION[r.kind] === 'income'
          return (
            <UnstyledButton
              key={r.id}
              onClick={() => onSelect(r)}
              className="ledger-row"
              aria-label={`${formatDateSlash(r.yearMonth)} ${LEDGER_KIND_LABEL[r.kind]} ${r.amount.toLocaleString('ja-JP')}円 を編集`}
            >
              <Group justify="space-between" wrap="nowrap" py={8} gap="sm">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                    {formatDateSlash(r.yearMonth)}
                  </Text>
                  <Badge variant={income ? 'light' : 'default'} color={income ? 'indigo' : 'gray'}>
                    {LEDGER_KIND_LABEL[r.kind]}
                  </Badge>
                  <Text size="sm" lineClamp={1}>
                    {r.party ?? ''}
                  </Text>
                </Group>
                <Text size="sm" fw={600} style={{ flexShrink: 0 }}>
                  {income ? '' : '−'}
                  {r.amount.toLocaleString('ja-JP')}円
                </Text>
              </Group>
            </UnstyledButton>
          )
        })}
      </Stack>
    </Stack>
  )
}
