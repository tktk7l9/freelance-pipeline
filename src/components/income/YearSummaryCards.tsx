import { Card, SimpleGrid, Stack, Text } from '@mantine/core'

import { formatMan } from '../../lib/rate'
import { yoyPercent, type YearSummary } from '../../lib/ledger'

/**
 * 年の「情報」。数値そのものより意味（売上・収入・引かれるもの・手取り・前年比）を先に出す（SHIG 28）。
 * 今年は税がまだ確定していないので、手取りは暫定と明示する（55）。
 */
export function YearSummaryCards({
  summary,
  previous,
  forecast,
  isThisYear,
}: {
  summary: YearSummary
  previous: YearSummary
  forecast: { salesIncl: number; incomeTotal: number; filledMonths: number } | null
  isThisYear: boolean
}) {
  const avg = summary.monthsWithIncome > 0 ? summary.incomeTotal / summary.monthsWithIncome : 0
  return (
    <Stack gap="xs">
      <SimpleGrid cols={2} spacing="xs">
        <Stat
          label="売上（フリーランス・税込）"
          value={formatMan(summary.salesIncl)}
          sub={`税抜 ${formatMan(summary.salesExcl)}${yoy(summary.salesIncl, previous.salesIncl)}`}
        />
        <Stat
          label="収入合計"
          value={formatMan(summary.incomeTotal)}
          sub={`役員報酬 ${formatMan(summary.officer)}${summary.otherIncome ? `・その他 ${formatMan(summary.otherIncome)}` : ''}${yoy(summary.incomeTotal, previous.incomeTotal)}`}
        />
        <Stat
          label="税・社保・経費"
          value={formatMan(summary.outgoTotal)}
          sub={`税 ${formatMan(summary.tax)}・社保 ${formatMan(summary.insurance)}・経費 ${formatMan(summary.expense)}${summary.otherOutgo ? `・その他 ${formatMan(summary.otherOutgo)}` : ''}`}
        />
        <Stat
          label={isThisYear ? '手取り（暫定）' : '手取り'}
          value={formatMan(summary.net)}
          sub={
            isThisYear
              ? '未計上の税・経費があれば減る'
              : `${yoy(summary.net, previous.net).replace(/^・/, '') || '前年比 —'}`
          }
          emphasis
        />
      </SimpleGrid>
      <Card withBorder padding="sm">
        <Text size="sm">
          収入のある月は {summary.monthsWithIncome} か月・月平均 {formatMan(Math.round(avg))}
          {forecast && forecast.filledMonths > 0
            ? `。年の着地見込み 収入 ${formatMan(forecast.incomeTotal)}（売上 ${formatMan(forecast.salesIncl)}）＝残り ${forecast.filledMonths} か月を参画中案件と役員報酬で埋めた場合`
            : ''}
        </Text>
      </Card>
    </Stack>
  )
}

function yoy(current: number, previous: number): string {
  const p = yoyPercent(current, previous)
  if (p === null) return ''
  return `・前年比 ${p > 0 ? '+' : ''}${p}%`
}

function Stat({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string
  value: string
  sub: string
  emphasis?: boolean
}) {
  return (
    <Card withBorder padding="sm">
      <Stack gap={2}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text fw={700} fz={emphasis ? 26 : 22} lh={1.2}>
          {value}
        </Text>
        <Text size="xs" c="dimmed">
          {sub}
        </Text>
      </Stack>
    </Card>
  )
}
