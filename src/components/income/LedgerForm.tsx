import { Button, NumberInput, Select, Stack, TextInput, Textarea } from '@mantine/core'
import { MonthPickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import type { LedgerRow } from '../../db/schema'
import { LEDGER_DIRECTION, LEDGER_KINDS, LEDGER_KIND_LABEL, type LedgerKind } from '../../lib/enums'
import { extractErrorMessage } from '../../lib/formError'
import { saveLedgerEntry } from '../../server/ledger'
import type { CaseOption } from '../calendar/EventForm'

type Num = number | ''
type Values = {
  yearMonth: string
  kind: LedgerKind
  party: string
  caseId: string | null
  amount: Num
  note: string
}

const KIND_OPTIONS = [
  {
    group: '収入',
    items: LEDGER_KINDS.filter((k) => LEDGER_DIRECTION[k] === 'income').map((k) => ({
      value: k,
      label: LEDGER_KIND_LABEL[k],
    })),
  },
  {
    group: '支出（税・社保・経費）',
    items: LEDGER_KINDS.filter((k) => LEDGER_DIRECTION[k] === 'outgo').map((k) => ({
      value: k,
      label: LEDGER_KIND_LABEL[k],
    })),
  },
]

export function LedgerForm({
  entry,
  defaults,
  caseOptions,
  onSaved,
}: {
  entry: LedgerRow | null
  /** 新規の既定値（直近の行に合わせる＝よいデフォルト） */
  defaults?: Partial<Pick<Values, 'yearMonth' | 'kind' | 'party' | 'amount'>>
  caseOptions: CaseOption[]
  onSaved: (id: string) => void
}) {
  const router = useRouter()
  const save = useServerFn(saveLedgerEntry)
  const [saving, setSaving] = useState(false)
  const form = useForm<Values>({
    initialValues: entry
      ? {
          yearMonth: entry.yearMonth,
          kind: entry.kind,
          party: entry.party ?? '',
          caseId: entry.caseId,
          amount: entry.amount,
          note: entry.note ?? '',
        }
      : {
          yearMonth: defaults?.yearMonth ?? '',
          kind: defaults?.kind ?? 'freelance',
          party: defaults?.party ?? '',
          caseId: null,
          amount: defaults?.amount ?? '',
          note: '',
        },
    validate: {
      yearMonth: (v) => (/^\d{4}-\d{2}$/.test(v) ? null : '年月を選んでください'),
      amount: (v) => (v === '' ? '金額を入れてください' : null),
    },
  })

  async function submit(v: Values) {
    setSaving(true)
    try {
      const res = await save({
        data: {
          ...(entry ? { id: entry.id } : {}),
          yearMonth: v.yearMonth,
          kind: v.kind,
          party: v.party,
          caseId: v.caseId,
          amount: v.amount === '' ? 0 : v.amount,
          note: v.note,
        },
      })
      await router.invalidate()
      notifications.show({ message: entry ? '更新しました' : '追加しました' })
      onSaved(res.id)
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  const isIncome = LEDGER_DIRECTION[form.values.kind] === 'income'
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="md">
        <Select
          label="種別"
          data={KIND_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps('kind')}
        />
        <MonthPickerInput
          label="年月"
          required
          valueFormat="YYYY/MM"
          value={form.values.yearMonth ? `${form.values.yearMonth}-01` : null}
          onChange={(d) => form.setFieldValue('yearMonth', d ? String(d).slice(0, 7) : '')}
          error={form.errors.yearMonth}
        />
        <NumberInput
          label={isIncome ? '金額（円・売上は税込）' : '金額（円）'}
          required
          thousandSeparator=","
          min={0}
          step={10_000}
          hideControls
          {...form.getInputProps('amount')}
        />
        <TextInput
          label={isIncome ? '支払元' : '支払先'}
          placeholder={isIncome ? '例: レバテック' : '例: 税務署'}
          {...form.getInputProps('party')}
        />
        {form.values.kind === 'freelance' ? (
          <Select
            label="案件"
            clearable
            searchable
            data={caseOptions.map((c) => ({ value: c.id, label: c.label }))}
            {...form.getInputProps('caseId')}
          />
        ) : null}
        <Textarea label="メモ" autosize minRows={2} {...form.getInputProps('note')} />
        <Button type="submit" loading={saving} fullWidth>
          保存
        </Button>
      </Stack>
    </form>
  )
}
