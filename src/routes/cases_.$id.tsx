import { Anchor, Badge, Button, Card, Divider, Group, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Row } from '../components/DetailRow'
import { FormDrawer } from '../components/FormDrawer'
import { PageShell } from '../components/PageShell'
import { CaseForm } from '../components/cases/CaseForm'
import { CompanyName } from '../components/CompanyName'
import { PlaceLink } from '../components/PlaceLink'
import { CaseLogList } from '../components/cases/CaseLogList'
import { ContractForm } from '../components/cases/ContractForm'
import { ContractList } from '../components/cases/ContractList'
import { NextActionEditor } from '../components/cases/NextActionEditor'
import { RateLines } from '../components/cases/RateLines'
import { RawTextPanel } from '../components/cases/RawTextPanel'
import { StatusBadge } from '../components/cases/StatusBadge'
import { StatusChanger } from '../components/cases/StatusChanger'
import { showUndo } from '../components/undoNotification'
import type { ContractRow } from '../db/schema'
import { contractPeriod, nextContractDefaults } from '../lib/contract'
import { ROUTE_LABEL, TAX_BASIS_LABEL } from '../lib/enums'
import { fitMark } from '../lib/compare'
import { formatDateSlash, remoteSummary } from '../lib/format'
import { baseHours, formatHourlyLines, formatRateLines } from '../lib/rate'
import { deleteCaseFn, getCaseDetail } from '../server/cases'
import { deleteContract, saveContract } from '../server/contracts'
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
  const { item, contracts, log, companyUrl, today, axes } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const remove = useServerFn(deleteCaseFn)
  const removeContract = useServerFn(deleteContract)
  const restoreContract = useServerFn(saveContract)
  const [editing, setEditing] = useState(false)
  const [addingContract, setAddingContract] = useState(false)
  const [editingContract, setEditingContract] = useState<ContractRow | null>(null)
  // Contracts matter once a case is joined; before that the card would be an empty box (SHIG 1)
  const showContracts = item.group === 'history' || contracts.length > 0
  const hasContracts = contracts.length > 0
  // Bumped when the status changes so the next-step field takes focus (SHIG 41)
  const [focusNext, setFocusNext] = useState(0)
  const rateLines = formatRateLines(item.monthlyMaxIncl, item.monthlyMinIncl)
  // The case sheet's own hourly rate (its settlement range), whatever the contract says
  const sheetHours = baseHours(item).hours

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

  /** No confirm dialog; delete first, then "Undo" re-adds the same terms (as a new row) */
  async function handleDeleteContract(c: ContractRow) {
    try {
      await removeContract({ data: { id: c.id } })
      await router.invalidate()
      setEditingContract(null)
      showUndo({
        message: '契約を削除しました',
        onUndo: async () => {
          await restoreContract({
            data: {
              caseId: c.caseId,
              startDate: c.startDate,
              endDate: c.endDate,
              monthlyIncl: c.monthlyIncl,
              settlementMinH: c.settlementMinH,
              settlementMaxH: c.settlementMaxH,
              overtimeRate: c.overtimeRate,
              deductionRate: c.deductionRate,
              orderNo: c.orderNo ?? '',
              note: c.note ?? '',
            },
          })
          await router.invalidate()
        },
      })
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  return (
    <PageShell
      title={item.title}
      heading
      description={
        <>
          <CompanyName name={item.company} url={companyUrl} />・{ROUTE_LABEL[item.route]}
          {item.agentName ? `（${item.agentName}）` : ''}
        </>
      }
      back={{ to: '/cases', label: '案件' }}
      actions={
        <Group gap="xs">
          <StatusBadge status={item.status} />
          <Button
            variant="default"
            size="xs"
            leftSection={<Pencil size={14} aria-hidden />}
            onClick={() => setEditing(true)}
          >
            編集
          </Button>
        </Group>
      }
    >
      {/* The most common action (got a message → update the status and next step) goes first. Conditions barely change after import */}
      <Card withBorder padding="md">
        <Stack gap="md">
          <NextActionEditor
            id={item.id}
            status={item.status}
            nextAction={item.nextAction}
            nextActionDue={item.nextActionDue}
            today={today}
            focusSignal={focusNext}
          />
          <StatusChanger
            id={item.id}
            status={item.status}
            onChanged={() => setFocusNext((n) => n + 1)}
          />
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="xs">
          {/* Once a contract exists, say that these two rows are the case sheet's numbers, not the signed ones */}
          <Row
            label={hasContracts ? '案件票の単価' : '単価'}
            value={
              <RateLines
                main={rateLines.main}
                sub={`${rateLines.sub}（案件票は${TAX_BASIS_LABEL[item.sourceTaxBasis]}）`}
                align="right"
              />
            }
          />
          <Row
            label={hasContracts ? '案件票の時給' : '時給'}
            value={
              <RateLines {...formatHourlyLines(item.monthlyMaxIncl, sheetHours)} align="right" />
            }
          />
          <Row
            label="精算幅"
            value={
              item.settlementMinH || item.settlementMaxH
                ? `${item.settlementMinH ?? ''}〜${item.settlementMaxH ?? ''}h`
                : null
            }
          />
          <Row label="リモート" value={remoteSummary(item.remoteType, item.onsiteNote)} />
          <Row
            label="開始"
            value={
              item.endDate
                ? `${formatDateSlash(item.startDate)} 〜 ${formatDateSlash(item.endDate)}`
                : formatDateSlash(item.startDate)
            }
          />
          <Row label="稼働" value={item.daysPerWeek} />
          <Row
            label="作業場所"
            value={item.workLocation ? <PlaceLink address={item.workLocation} /> : null}
          />
          <Row label="商流" value={item.supplyChain} />
          <Row
            label="支払サイト"
            value={item.paymentSiteDays === null ? null : `${item.paymentSiteDays}日`}
          />
          {/* A legacy single actual rate (before contracts existed); a contract replaces it */}
          {item.actualMonthlyIncl && !hasContracts ? (
            <Row
              label="実単価"
              value={<RateLines {...formatRateLines(item.actualMonthlyIncl, null)} align="right" />}
            />
          ) : null}
          {item.sourceUrl ? (
            <Row
              label="案件ページ"
              value={
                <Anchor
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hotspot"
                >
                  <ExternalLink size={14} aria-hidden /> 開く
                </Anchor>
              }
            />
          ) : null}
        </Stack>
      </Card>

      {showContracts ? (
        <ContractList
          contracts={contracts}
          route={item.route}
          onAdd={() => setAddingContract(true)}
          onSelect={setEditingContract}
        />
      ) : null}

      <Card withBorder padding="md">
        <Stack gap="xs">
          {/* h2 like 経緯: a section of the case page, not a subsection. Same look as before */}
          <Title order={2} size="h3">
            スキル
          </Title>
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
          {/* Only scored axes; unscored ones would be a row of dashes (SHIG 1) */}
          {axes.some((_, i) => item.fitScores?.[i] !== undefined) ? (
            <Group gap="sm">
              {axes.map((axis, i) =>
                item.fitScores?.[i] === undefined ? null : (
                  <Text key={axis} size="sm">
                    {axis}: {fitMark(item.fitScores[i])}
                  </Text>
                ),
              )}
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

      <CaseLogList caseId={item.id} log={log} today={today} />
      <RawTextPanel text={item.rawText} />

      {/* Deletion is irreversible, so only this keeps a confirm. Not placed next to edit (mis-taps) */}
      <Group justify="center">
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<Trash2 size={14} aria-hidden />}
          onClick={handleDelete}
        >
          この案件と経緯を削除
        </Button>
      </Group>

      <FormDrawer opened={editing} onClose={() => setEditing(false)} title="案件を編集">
        <CaseForm
          item={item}
          companyUrl={companyUrl}
          axes={axes}
          onSaved={() => setEditing(false)}
        />
      </FormDrawer>
      <FormDrawer
        opened={addingContract}
        onClose={() => setAddingContract(false)}
        title="契約を追加"
      >
        <ContractForm
          caseId={item.id}
          contract={null}
          defaults={nextContractDefaults(item, contracts)}
          onSaved={() => setAddingContract(false)}
        />
      </FormDrawer>
      <FormDrawer
        opened={editingContract !== null}
        onClose={() => setEditingContract(null)}
        title={editingContract ? `${contractPeriod(editingContract)} の契約を編集` : '契約を編集'}
      >
        {editingContract ? (
          <Stack gap="md">
            <ContractForm
              caseId={item.id}
              contract={editingContract}
              defaults={nextContractDefaults(item, contracts)}
              onSaved={() => setEditingContract(null)}
            />
            {/* Kept away from "Save" behind a divider (SHIG 16, 13); it can be undone (54) */}
            <Divider mt="xl" />
            <Group justify="center">
              <Button
                color="red"
                variant="subtle"
                size="xs"
                leftSection={<Trash2 size={14} aria-hidden />}
                onClick={() => handleDeleteContract(editingContract)}
              >
                この契約を削除
              </Button>
            </Group>
          </Stack>
        ) : null}
      </FormDrawer>
    </PageShell>
  )
}
