import { ActionIcon, Anchor, Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Row } from '../components/DetailRow'
import { FormDrawer } from '../components/FormDrawer'
import { PageShell } from '../components/PageShell'
import { CaseForm } from '../components/cases/CaseForm'
import { CaseLogList } from '../components/cases/CaseLogList'
import { NextActionEditor } from '../components/cases/NextActionEditor'
import { RateLines } from '../components/cases/RateLines'
import { RawTextPanel } from '../components/cases/RawTextPanel'
import { StatusBadge } from '../components/cases/StatusBadge'
import { StatusChanger } from '../components/cases/StatusChanger'
import { REMOTE_LABEL, ROUTE_LABEL, TAX_BASIS_LABEL } from '../lib/enums'
import { fitMark } from '../lib/compare'
import { formatDateSlash } from '../lib/format'
import { formatHourlyLines, formatRateLines } from '../lib/rate'
import { deleteCaseFn, getCaseDetail } from '../server/cases'
import { getSettingsData } from '../server/settings'

export const Route = createFileRoute('/cases_/$id')({
  component: Page,
  loader: async ({ params }) => {
    const [detail, settings] = await Promise.all([
      getCaseDetail({ data: { id: params.id } }),
      getSettingsData(),
    ])
    return { ...detail, axes: settings.axes }
  },
})

function Page() {
  const { item, log, today, axes } = Route.useLoaderData()
  const navigate = useNavigate()
  const remove = useServerFn(deleteCaseFn)
  const [editing, setEditing] = useState(false)
  const rateLines = formatRateLines(item.monthlyMaxIncl, item.monthlyMinIncl)

  async function handleDelete() {
    if (!window.confirm('この案件と経緯をすべて削除します。')) return
    try {
      await remove({ data: { id: item.id } })
      notifications.show({ message: '削除しました' })
      navigate({ to: '/cases', search: { group: 'active' } })
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  return (
    <PageShell
      title={item.title}
      heading
      description={`${item.company}・${ROUTE_LABEL[item.route]}${item.agentName ? `（${item.agentName}）` : ''}`}
      actions={
        <Group gap="xs">
          <StatusBadge status={item.status} />
          <ActionIcon variant="default" aria-label="編集" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </ActionIcon>
          <ActionIcon variant="default" color="red" aria-label="削除" onClick={handleDelete}>
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      }
    >
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Row
            label="単価"
            value={
              <RateLines
                main={rateLines.main}
                sub={`${rateLines.sub}（案件票は${TAX_BASIS_LABEL[item.sourceTaxBasis]}）`}
                align="right"
              />
            }
          />
          <Row
            label="時給"
            value={
              <RateLines {...formatHourlyLines(item.monthlyMaxIncl, item.hours)} align="right" />
            }
          />
          <Row
            label="精算幅"
            value={
              item.settlementMinH || item.settlementMaxH
                ? `${item.settlementMinH ?? '—'}〜${item.settlementMaxH ?? '—'}h`
                : '—'
            }
          />
          <Row
            label="リモート"
            value={`${REMOTE_LABEL[item.remoteType]}${item.onsiteNote ? `（${item.onsiteNote}）` : ''}`}
          />
          <Row
            label="開始"
            value={
              item.endDate
                ? `${formatDateSlash(item.startDate)} 〜 ${formatDateSlash(item.endDate)}`
                : formatDateSlash(item.startDate)
            }
          />
          <Row label="稼働" value={item.daysPerWeek} />
          <Row label="作業場所" value={item.workLocation} />
          <Row label="商流" value={item.supplyChain} />
          <Row
            label="支払サイト"
            value={item.paymentSiteDays === null ? '—' : `${item.paymentSiteDays}日`}
          />
          {item.actualMonthlyIncl ? (
            <Row
              label="実単価"
              value={<RateLines {...formatRateLines(item.actualMonthlyIncl, null)} align="right" />}
            />
          ) : null}
          {item.sourceUrl ? (
            <Row
              label="案件ページ"
              value={
                <Anchor href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden /> 開く
                </Anchor>
              }
            />
          ) : null}
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="xs">
          <Title order={3}>スキル</Title>
          <Group gap={4}>
            {item.mustSkills.map((sk) => (
              <Badge key={`m-${sk}`} variant="filled">
                {sk}
              </Badge>
            ))}
            {item.niceSkills.map((sk) => (
              <Badge key={`n-${sk}`} variant="default">
                {sk}
              </Badge>
            ))}
            {item.mustSkills.length + item.niceSkills.length === 0 ? (
              <Text size="sm" c="dimmed">
                未登録
              </Text>
            ) : null}
          </Group>
          {axes.length > 0 ? (
            <Group gap="sm">
              {axes.map((axis, i) => (
                <Text key={axis} size="sm">
                  {axis}: {fitMark(item.fitScores?.[i])}
                </Text>
              ))}
            </Group>
          ) : null}
        </Stack>
      </Card>

      {item.note ? (
        <Card withBorder padding="md">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {item.note}
          </Text>
        </Card>
      ) : null}

      <Card withBorder padding="md">
        <Stack gap="md">
          <NextActionEditor
            id={item.id}
            nextAction={item.nextAction}
            nextActionDue={item.nextActionDue}
          />
          <StatusChanger id={item.id} status={item.status} />
        </Stack>
      </Card>

      <CaseLogList caseId={item.id} log={log} today={today} />
      <RawTextPanel text={item.rawText} />

      <FormDrawer opened={editing} onClose={() => setEditing(false)} title="案件を編集">
        <CaseForm item={item} axes={axes} onSaved={() => setEditing(false)} />
      </FormDrawer>
    </PageShell>
  )
}
