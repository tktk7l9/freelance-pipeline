import { Anchor, Badge, Card, Group, Select, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

import { formatDateSlash } from '../../lib/format'
import {
  ageBandOf,
  ageOn,
  binColor,
  binFor,
  binLabel,
  positionInBand,
  raisePacePerYear,
  type AgeRateRow,
  type MarketData,
} from '../../lib/market'
import { formatMan } from '../../lib/rate'
import type { MarketSkill } from '../../server/market'
import { EmptyState } from '../EmptyState'

/**
 * 比較 › 市場。レバテックの市場データ（スキルごと）と、その中での自分の位置。
 * 先頭に「自分の位置」（SHIG 28 データより情報）、次に年齢別の単価割合に自分の帯を
 * 文字とマーカーで示す（96 色に依存しない）。
 */
export function MarketView({
  skills,
  skill,
  onSkillChange,
  birthDate,
  myRate,
  ratePoints,
  today,
}: {
  skills: MarketSkill[]
  skill: string | null
  onSkillChange: (skill: string) => void
  birthDate: string | null
  myRate: number | null
  ratePoints: { ym: string; rate: number }[]
  today: string
}) {
  if (skills.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="市場データがまだありません"
        description="レバテックプラットフォームの案件データ・人材データを書き起こして D1 に入れると、ここに出ます。"
      />
    )
  }
  const current = skills.find((s) => s.skill === skill) ?? skills[0]
  const d = current.data
  const band = birthDate ? ageBandOf(ageOn(birthDate, today)) : null
  const position =
    band && myRate !== null ? positionInBand(d.talent.ageRate, d.talent.bins, band, myRate) : null
  const pace = raisePacePerYear(ratePoints)

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Select
          label="スキル"
          data={skills.map((s) => s.skill)}
          value={current.skill}
          onChange={(v) => v && onSkillChange(v)}
          allowDeselect={false}
          style={{ minWidth: 220 }}
        />
        <Text size="xs" c="dimmed">
          レバテックプラットフォーム {formatDateSlash(current.takenOn)} 時点の書き起こし
          {d.sourceUrl ? (
            <>
              ・
              <Anchor href={d.sourceUrl} target="_blank" rel="noopener noreferrer" size="xs">
                元のダッシュボード <ExternalLink size={10} aria-hidden />
              </Anchor>
            </>
          ) : null}
        </Text>
      </Group>

      <PositionCard
        band={band}
        myRate={myRate}
        position={position}
        pace={pace}
        raiseAvg={d.talent.annualRaiseAvg}
        jobs={d.jobs}
        birthDateMissing={!birthDate}
      />

      <AgeRateBars rows={d.talent.ageRate} bins={d.talent.bins} myBand={band} myRate={myRate} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Title order={3}>案件</Title>
            <Row label="募集中" value={`${d.jobs.open} 件`} />
            <Row label="直近 1 週間の新規" value={`${d.jobs.newWeek} 件`} />
            <Row label="案件倍率（案件数 ÷ 技術者数）" value={`${d.jobs.ratio} 倍`} />
            <Row label="前年同時期比" value={`${d.jobs.growthPct}%`} />
            <Row label="最高単価" value={`${d.jobs.maxRate.toLocaleString('ja-JP')} 円`} />
            <Text size="xs" c="dimmed" mt={4}>
              作業日数: {d.jobs.byDays.map((b) => `${b.label} ${b.count}`).join('・')}
            </Text>
            <Text size="xs" c="dimmed">
              リモート: {d.jobs.remote.map((r) => `${r.label} ${r.pct}%`).join('・')}
            </Text>
          </Stack>
        </Card>
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Title order={3}>技術者</Title>
            <Row
              label="年間受取単価の上昇額平均"
              value={`${d.talent.annualRaiseAvg.toLocaleString('ja-JP')} 円/年`}
            />
            <Text size="xs" c="dimmed" mt={4}>
              年齢: {d.talent.ageShare.map((a) => `${a.label} ${a.pct}%`).join('・')}
            </Text>
            <Text size="xs" c="dimmed">
              契約満了後: {d.talent.renewal.map((r) => `${r.label} ${r.pct}%`).join('・')}
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  )
}

function PositionCard({
  band,
  myRate,
  position,
  pace,
  raiseAvg,
  jobs,
  birthDateMissing,
}: {
  band: string | null
  myRate: number | null
  position: ReturnType<typeof positionInBand>
  pace: number | null
  raiseAvg: number
  jobs: MarketData['jobs']
  birthDateMissing: boolean
}) {
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <Title order={2}>自分の位置</Title>
          <Group gap="xs">
            {band ? <Badge variant="light">{band}</Badge> : null}
            {myRate !== null ? <Badge variant="light">{formatMan(myRate)}（税込）</Badge> : null}
          </Group>
        </Group>
        {birthDateMissing ? (
          <Text size="sm">
            年齢帯を出すには{' '}
            <Anchor component={Link} to="/settings" size="sm">
              設定の事業者情報
            </Anchor>{' '}
            に生年月日を入れてください。
          </Text>
        ) : null}
        {myRate === null ? (
          <Text size="sm">参画中の案件が無いので、いまの単価を決められません。</Text>
        ) : null}
        {position ? (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
            <Stat
              label={`同年代で自分より高い帯`}
              value={`${position.abovePct}%`}
              sub={`${binLabel(position.bin)} より上`}
            />
            <Stat
              label="同じ帯"
              value={`${position.samePct}%`}
              sub={`${binLabel(position.bin)} の帯にいる人`}
            />
            <Stat
              label="自分より低い帯"
              value={`${position.belowPct}%`}
              sub={
                position.modeBin !== null
                  ? `同年代でいちばん多いのは ${binLabel(position.modeBin)}`
                  : ''
              }
            />
          </SimpleGrid>
        ) : band && myRate !== null ? (
          <Text size="sm">このスキルには {band} の分布がありません。</Text>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <Stat
            label="単価の上がり方（年率）"
            value={pace === null ? '—' : `${pace >= 0 ? '+' : ''}${formatMan(pace)}/年`}
            sub={`市場の平均 +${formatMan(raiseAvg)}/年${
              pace !== null
                ? `＝差 ${formatMan(pace - raiseAvg)}`
                : '。案件の実単価が 2 点以上・1 年以上あれば出る'
            }`}
          />
          <Stat
            label="このスキルの案件"
            value={`${jobs.open} 件・倍率 ${jobs.ratio}`}
            sub={`倍率 1 未満は技術者の方が多い（買い手市場）。前年比 ${jobs.growthPct}%`}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  )
}

function AgeRateBars({
  rows,
  bins,
  myBand,
  myRate,
}: {
  rows: AgeRateRow[]
  bins: number[]
  myBand: string | null
  myRate: number | null
}) {
  const myBin = myRate !== null ? binFor(bins, myRate) : null
  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Title order={3}>年齢別の単価割合</Title>
        <Text size="xs" c="dimmed">
          各年齢帯の技術者を単価 10 万円ごとに分けた割合。自分の帯は ▼ と太字。数字の無い細い帯は
          元の画面で読めなかったぶん。
        </Text>
        <Stack gap={10}>
          {rows.map((row) => {
            const mine = row.band === myBand
            const total = row.cells.reduce((s, c) => s + c.pct, 0) || 1
            return (
              <Stack key={row.band} gap={2}>
                <Group gap="xs">
                  <Text size="sm" fw={mine ? 700 : 500} style={{ whiteSpace: 'nowrap' }}>
                    {mine ? '▼ ' : ''}
                    {row.band}
                  </Text>
                  {mine && myBin !== null ? (
                    <Text size="xs" fw={700}>
                      あなた: {binLabel(myBin)}
                    </Text>
                  ) : null}
                </Group>
                <div
                  className="market-bar"
                  role="img"
                  aria-label={`${row.band}: ${row.cells.map((c) => `${binLabel(c.bin)} ${c.pct}%`).join('、')}`}
                >
                  {row.cells.map((c) => (
                    <span
                      key={c.bin}
                      className={mine && c.bin === myBin ? 'is-mine' : undefined}
                      style={{ width: `${(c.pct / total) * 100}%`, background: binColor(c.bin) }}
                      title={`${binLabel(c.bin)} ${c.pct}%`}
                    >
                      {c.pct >= 8 ? `${c.pct}%` : ''}
                    </span>
                  ))}
                </div>
              </Stack>
            )
          })}
        </Stack>
        <Group gap="sm" wrap="wrap">
          {bins.map((b) => (
            <Group key={b} gap={4} wrap="nowrap">
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  display: 'inline-block',
                  background: binColor(b),
                }}
              />
              <Text size="xs" c="dimmed">
                {binLabel(b)}
              </Text>
            </Group>
          ))}
        </Group>
      </Stack>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Group>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} fz={22} lh={1.2}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {sub}
      </Text>
    </Stack>
  )
}
