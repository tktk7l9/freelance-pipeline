import { Card, Group, Stack, Text, Title } from '@mantine/core'

import { formatDateSlash } from '../../lib/format'
import type { RateChange, RatePoint } from '../../lib/ledger'
import { formatMan } from '../../lib/rate'

/**
 * 単価の推移（主契約の月額・税込）。年をまたいで全期間を出す。
 * 棒は月ごと、改定した月に額を書く（色に加えて文字で 96）。日割りの月は斜線。
 */
export function RateHistory({ history, changes }: { history: RatePoint[]; changes: RateChange[] }) {
  if (history.length === 0) return null
  const max = Math.max(...history.map((p) => p.rate), 1)
  const first = history.find((p) => !p.partial) ?? history[0]
  const last = [...history].reverse().find((p) => !p.partial) ?? history[history.length - 1]
  const diff = last.rate - first.rate
  const pct = first.rate > 0 ? Math.round((diff / first.rate) * 100) : 0
  const changeMonths = new Set(changes.map((c) => c.yearMonth))
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="baseline" wrap="wrap">
          <Title order={3}>単価の推移（月額・税込）</Title>
          <Text size="sm">
            {formatDateSlash(first.yearMonth)} {formatMan(first.rate)} →{' '}
            {formatDateSlash(last.yearMonth)}{' '}
            <Text span fw={700}>
              {formatMan(last.rate)}
            </Text>
            （{diff >= 0 ? '+' : ''}
            {formatMan(diff)}・{pct >= 0 ? '+' : ''}
            {pct}%・改定 {changes.length} 回）
          </Text>
        </Group>
        <div
          className="rate-bars"
          role="img"
          aria-label={history
            .map(
              (p) =>
                `${formatDateSlash(p.yearMonth)} ${formatMan(p.rate)}${p.partial ? '（日割り）' : ''}`,
            )
            .join('、')}
        >
          {history.map((p) => (
            <div
              key={p.yearMonth}
              className={`rate-bar${p.partial ? ' is-partial' : ''}${changeMonths.has(p.yearMonth) ? ' is-change' : ''}`}
              title={`${formatDateSlash(p.yearMonth)} ${formatMan(p.rate)}`}
            >
              <span className="rate-bar-fill" style={{ height: `${(p.rate / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <Group gap={0} justify="space-between">
          {history
            .filter((p) => p.yearMonth.endsWith('-01') || p === history[0])
            .map((p) => (
              <Text key={p.yearMonth} size="xs" c="dimmed">
                {p.yearMonth.slice(0, 4)}
              </Text>
            ))}
        </Group>
        {changes.length > 0 ? (
          <Stack gap={2}>
            {changes.map((c) => (
              <Text key={c.yearMonth} size="sm">
                {formatDateSlash(c.yearMonth)}〜 {formatMan(c.from)} → {formatMan(c.to)}（
                {c.to - c.from >= 0 ? '+' : ''}
                {formatMan(c.to - c.from)}）
              </Text>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            改定はまだありません。
          </Text>
        )}
        <Text size="xs" c="dimmed">
          月ごとにフリーランス売上の最大の行を主契約の月額とみなす。前後より低い月（斜線）は日割りとして改定の判定から外す。
        </Text>
      </Stack>
    </Card>
  )
}
