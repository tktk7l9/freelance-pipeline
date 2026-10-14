import { Button, Group, NumberInput, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import type { ContractRow } from '../../db/schema'
import type { ContractDefaults } from '../../lib/contract'
import { parseMonthOrDateInput } from '../../lib/dates'
import { extractFormError } from '../../lib/formError'
import { saveContract } from '../../server/contracts'
import { useReportDirty } from '../FormDrawer'

/** The form takes tax-included amounts. An empty NumberInput comes as '', so convert to null on submit */
type Num = number | ''
type Values = {
  startDate: string
  endDate: string
  monthlyIncl: Num
  settlementMinH: Num
  settlementMaxH: Num
  overtimeRate: Num
  deductionRate: Num
  orderNo: string
  note: string
}

const n = (v: Num) => (v === '' ? null : v)

/**
 * One contract of a case: the signed monthly fee, period and settlement terms. A new one is prefilled
 * from the latest contract (a renewal usually repeats the terms) or from the case row.
 */
export function ContractForm({
  caseId,
  contract,
  defaults,
  onSaved,
}: {
  caseId: string
  contract: ContractRow | null
  /** Prefill for a new contract (ignored when editing) */
  defaults: ContractDefaults
  onSaved: (id: string) => void
}) {
  const router = useRouter()
  const save = useServerFn(saveContract)
  const [saving, setSaving] = useState(false)
  const form = useForm<Values>({
    initialValues: contract
      ? {
          startDate: contract.startDate,
          endDate: contract.endDate ?? '',
          monthlyIncl: contract.monthlyIncl,
          settlementMinH: contract.settlementMinH ?? '',
          settlementMaxH: contract.settlementMaxH ?? '',
          overtimeRate: contract.overtimeRate ?? '',
          deductionRate: contract.deductionRate ?? '',
          orderNo: contract.orderNo ?? '',
          note: contract.note ?? '',
        }
      : {
          startDate: defaults.startDate,
          endDate: defaults.endDate ?? '',
          monthlyIncl: defaults.monthlyIncl,
          settlementMinH: defaults.settlementMinH ?? '',
          settlementMaxH: defaults.settlementMaxH ?? '',
          overtimeRate: '',
          deductionRate: '',
          orderNo: '',
          note: '',
        },
    validate: {
      startDate: (v) =>
        parseMonthOrDateInput(v) ? null : '2030/11 や 2030/11/16 の形で入れてください',
      endDate: (v) =>
        v.trim() === '' || parseMonthOrDateInput(v)
          ? null
          : '2030/12 や 2030/12/31 の形で入れてください',
      monthlyIncl: (v) => (v === '' ? '月額を入れてください' : null),
    },
  })

  // Closing the drawer with unsaved input asks first (SHIG 38)
  useReportDirty(form.isDirty())

  async function submit(v: Values) {
    setSaving(true)
    try {
      const { id } = await save({
        data: {
          ...(contract ? { id: contract.id } : {}),
          caseId,
          startDate: parseMonthOrDateInput(v.startDate) ?? v.startDate,
          endDate: parseMonthOrDateInput(v.endDate),
          monthlyIncl: v.monthlyIncl === '' ? 0 : v.monthlyIncl,
          settlementMinH: n(v.settlementMinH),
          settlementMaxH: n(v.settlementMaxH),
          overtimeRate: n(v.overtimeRate),
          deductionRate: n(v.deductionRate),
          orderNo: v.orderNo,
          note: v.note,
        },
      })
      await router.invalidate()
      notifications.show({ message: contract ? '契約を更新しました' : '契約を追加しました' })
      onSaved(id)
    } catch (e) {
      const { message, path } = extractFormError(e)
      if (path && path in form.values) form.setFieldError(path, message)
      else notifications.show({ message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="md">
        <Group grow>
          <TextInput label="開始（月だけでも可）" required {...form.getInputProps('startDate')} />
          <TextInput label="終了（月だけでも可）" {...form.getInputProps('endDate')} />
        </Group>
        <NumberInput
          label="月額（税込・円）"
          required
          min={1}
          thousandSeparator=","
          step={10_000}
          hideControls
          {...form.getInputProps('monthlyIncl')}
        />
        <Group grow>
          <NumberInput
            label="精算 下限（h）"
            min={1}
            max={400}
            {...form.getInputProps('settlementMinH')}
          />
          <NumberInput
            label="精算 上限（h）"
            min={1}
            max={400}
            {...form.getInputProps('settlementMaxH')}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="超過単価（円/h）"
            min={0}
            thousandSeparator=","
            hideControls
            {...form.getInputProps('overtimeRate')}
          />
          <NumberInput
            label="控除単価（円/h）"
            min={0}
            thousandSeparator=","
            hideControls
            {...form.getInputProps('deductionRate')}
          />
        </Group>
        <TextInput
          label="注文番号"
          placeholder="注文書・注文請書の番号"
          {...form.getInputProps('orderNo')}
        />
        <Textarea
          label="メモ"
          placeholder="例: 初月は日割り。更新時に単価改定を切り出す"
          autosize
          minRows={2}
          {...form.getInputProps('note')}
        />
        <Button type="submit" loading={saving} fullWidth>
          保存
        </Button>
      </Stack>
    </form>
  )
}
