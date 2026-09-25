import { Group, Stack, Table, Text, Title } from '@mantine/core'

import { formatMan } from '../../lib/rate'
import type { MonthRow } from '../../lib/ledger'

/**
 * 月別の内訳。棒（CSS）と数字を並べ、色だけで読ませない（SHIG 96）。
 * 棒の幅は年内の最大月を 100% にした割合。
 */
export function MonthlyBreakdown({ months }: { months: MonthRow[] }) {
  const max = Math.max(
    1,
    ...months.map((m) => Math.max(m.income + m.forecastFreelance + m.forecastOfficer, m.outgo)),
  )
  const pct = (v: number) => `${Math.round((v / max) * 100)}%`
  return (
    <Stack gap="xs">
      <Title order={2}>月別</Title>
      <Group gap="sm" wrap="wrap">
        <Legend className="seg-freelance" label="売上" />
        <Legend className="seg-officer" label="役員報酬" />
        <Legend className="seg-other" label="その他" />
        <Legend className="seg-outgo" label="税・社保・経費" />
        <Legend className="seg-forecast" label="見込み（参画中案件・役員報酬）" />
      </Group>
      <Table verticalSpacing={4} withRowBorders={false}>
        <Table.Tbody>
          {months.map((m) => (
            <Table.Tr key={m.month}>
              <Table.Td w={48} pl={0} style={{ whiteSpace: 'nowrap' }}>
                <Text
                  size="sm"
                  c={m.income === 0 && m.outgo === 0 && !forecastOf(m) ? 'dimmed' : undefined}
                >
                  {m.month}月
                </Text>
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <div
                    className="income-bar"
                    role="img"
                    aria-label={`収入 ${formatMan(m.income)}${forecastOf(m) ? `・見込み ${formatMan(forecastOf(m))}` : ''}`}
                    style={{ width: pct(m.income + forecastOf(m)) }}
                  >
                    <span className="seg-freelance" style={{ width: pct(m.freelance) }} />
                    <span className="seg-officer" style={{ width: pct(m.officer) }} />
                    <span className="seg-other" style={{ width: pct(m.otherIncome) }} />
                    <span className="seg-forecast" style={{ width: pct(forecastOf(m)) }} />
                  </div>
                  {m.outgo > 0 ? (
                    <div
                      className="income-bar"
                      role="img"
                      aria-label={`支出 ${formatMan(m.outgo)}`}
                      style={{ width: pct(m.outgo), height: 6 }}
                    >
                      <span className="seg-outgo" style={{ width: '100%' }} />
                    </div>
                  ) : null}
                </Stack>
              </Table.Td>
              <Table.Td w={120} pr={0} ta="right">
                <Text size="sm" fw={600}>
                  {m.income > 0 ? formatMan(m.income) : forecastOf(m) ? '' : '—'}
                </Text>
                {forecastOf(m) ? (
                  <Text size="xs" c="dimmed">
                    見込み {formatMan(m.income + forecastOf(m))}
                  </Text>
                ) : null}
                {m.outgo > 0 ? (
                  <Text size="xs" c="dimmed">
                    −{formatMan(m.outgo)}
                  </Text>
                ) : null}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}

/** その月の見込み（売上＋役員報酬）。実績のある種別は 0 になっている */
function forecastOf(m: MonthRow): number {
  return m.forecastFreelance + m.forecastOfficer
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <span aria-hidden className="income-bar" style={{ width: 10, height: 10 }}>
        <span className={className} style={{ width: '100%' }} />
      </span>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  )
}
