import { Button, Chip, Group, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { z } from 'zod'

import { EmptyState } from '../components/EmptyState'
import { Fab } from '../components/Fab'
import { FormDrawer } from '../components/FormDrawer'
import { EntryList } from '../components/income/EntryList'
import { LedgerForm } from '../components/income/LedgerForm'
import { MonthlyBreakdown } from '../components/income/MonthlyBreakdown'
import { YearSummaryCards } from '../components/income/YearSummaryCards'
import { PageShell } from '../components/PageShell'
import { showUndo } from '../components/undoNotification'
import type { LedgerRow } from '../db/schema'
import {
  forecastMonths,
  forecastYear,
  latestOfficerMonthly,
  monthlyBreakdown,
  summarizeYear,
  yearOf,
  yearsOf,
} from '../lib/ledger'
import { deleteLedgerEntry, ledgerData, saveLedgerEntry } from '../server/ledger'

const search = z.object({ y: z.coerce.number().int().min(2000).max(2100).optional() })

export const Route = createFileRoute('/income')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loader: () => ledgerData(),
})

function Page() {
  const { rows, joined, caseOptions, todayYm } = Route.useLoaderData()
  const { y } = Route.useSearch()
  const navigate = useNavigate({ from: '/income' })
  const router = useRouter()
  const remove = useServerFn(deleteLedgerEntry)
  const restore = useServerFn(saveLedgerEntry)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<LedgerRow | null>(null)

  const thisYear = Number(todayYm.slice(0, 4))
  const years = yearsOf(rows, thisYear)
  const year = y ?? thisYear
  const summary = useMemo(() => summarizeYear(rows, year), [rows, year])
  const previous = useMemo(() => summarizeYear(rows, year - 1), [rows, year])
  const officerMonthly = latestOfficerMonthly(rows)
  const forecastByMonth = useMemo(
    () =>
      year === thisYear
        ? forecastMonths(rows, year, todayYm, joined, officerMonthly)
        : new Map<string, never>(),
    [rows, year, thisYear, todayYm, joined, officerMonthly],
  )
  const months = useMemo(
    () => monthlyBreakdown(rows, year, forecastByMonth),
    [rows, year, forecastByMonth],
  )
  const forecast =
    year === thisYear ? forecastYear(rows, year, todayYm, joined, officerMonthly) : null
  const inYear = rows.filter((r) => yearOf(r.yearMonth) === year)
  // 新規の既定は直近の行に合わせる（同じ源泉・同じ額が続くことが多い）
  const latest = rows[0]
  const defaults = latest
    ? { yearMonth: todayYm, kind: latest.kind, party: latest.party ?? '', amount: latest.amount }
    : { yearMonth: todayYm }

  async function handleDelete(e: LedgerRow) {
    try {
      await remove({ data: { id: e.id } })
      await router.invalidate()
      setEditing(null)
      showUndo({
        message: '削除しました',
        onUndo: async () => {
          await restore({
            data: {
              yearMonth: e.yearMonth,
              kind: e.kind,
              party: e.party ?? '',
              caseId: e.caseId,
              amount: e.amount,
              note: e.note ?? '',
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
    <PageShell title="収入" fab>
      <Stack gap="lg">
        <Chip.Group
          value={String(year)}
          onChange={(v) => navigate({ search: { y: Number(v) }, replace: true })}
        >
          <Group gap="xs">
            {years.map((yr) => (
              <Chip key={yr} value={String(yr)}>
                {yr}年
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        {inYear.length === 0 ? (
          <EmptyState
            emoji="💴"
            title={`${year}年の記録はまだありません`}
            description="右下の「収入を追加」から、請求・入金・納付を年月ごとに入れます。"
          />
        ) : (
          <>
            <YearSummaryCards
              summary={summary}
              previous={previous}
              forecast={forecast}
              isThisYear={year === thisYear}
            />
            <MonthlyBreakdown months={months} />
            <EntryList rows={inYear} onSelect={setEditing} />
          </>
        )}
      </Stack>

      <Fab label="収入を追加" onClick={() => setCreating(true)} />
      <FormDrawer opened={creating} onClose={() => setCreating(false)} title="収入・支出を追加">
        <LedgerForm
          entry={null}
          defaults={defaults}
          caseOptions={caseOptions}
          onSaved={() => setCreating(false)}
        />
      </FormDrawer>
      <FormDrawer opened={editing !== null} onClose={() => setEditing(null)} title="編集">
        {editing ? (
          <Stack gap="md">
            <LedgerForm
              entry={editing}
              caseOptions={caseOptions}
              onSaved={() => setEditing(null)}
            />
            <Button color="red" variant="subtle" fullWidth onClick={() => handleDelete(editing)}>
              この行を削除
            </Button>
          </Stack>
        ) : null}
      </FormDrawer>
    </PageShell>
  )
}
