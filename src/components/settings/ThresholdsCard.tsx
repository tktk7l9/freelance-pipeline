import { Button, Card, Group, NumberInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { Row } from '../DetailRow'
import { RateLines } from '../cases/RateLines'
import { n } from './formValues'
import { extractErrorMessage } from '../../lib/formError'
import { formatRateLines } from '../../lib/rate'
import type { Thresholds } from '../../lib/compare'
import { saveThresholds } from '../../server/settings'

type Num = number | ''

type ThresholdsValues = {
  minMonthlyIncl: Num
  minHourlyExcl: Num
  targetStart: string
  maxOnsitePerMonth: Num
}

const toThresholdsValues = (t: Thresholds): ThresholdsValues => ({
  minMonthlyIncl: t.minMonthlyIncl ?? '',
  minHourlyExcl: t.minHourlyExcl ?? '',
  targetStart: t.targetStart ?? '',
  maxOnsitePerMonth: t.maxOnsitePerMonth ?? '',
})

export function ThresholdsCard({
  value,
  editing,
  onEdit,
  onClose,
}: {
  value: Thresholds
  editing: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const save = useServerFn(saveThresholds)
  const [saving, setSaving] = useState(false)
  const form = useForm<ThresholdsValues>({ initialValues: toThresholdsValues(value) })

  function startEdit() {
    form.setValues(toThresholdsValues(value))
    onEdit()
  }

  function cancel() {
    form.setValues(toThresholdsValues(value))
    onClose()
  }

  async function submit(v: ThresholdsValues) {
    setSaving(true)
    try {
      await save({
        data: {
          minMonthlyIncl: n(v.minMonthlyIncl),
          minHourlyExcl: n(v.minHourlyExcl),
          targetStart: v.targetStart.trim() || null,
          maxOnsitePerMonth: n(v.maxOnsitePerMonth),
        },
      })
      await router.invalidate()
      notifications.show({ message: '閾値を保存しました' })
      onClose()
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2}>閾値</Title>
          {!editing ? (
            <Button
              variant="default"
              size="xs"
              leftSection={<Pencil size={14} />}
              onClick={startEdit}
            >
              編集
            </Button>
          ) : null}
        </Group>
        <Text size="sm" c="dimmed">
          比較ビューで下回るセルを赤くする。空欄は判定しない。
        </Text>
        {!editing ? (
          <Stack gap="xs">
            <Row
              label="単価下限（税込）"
              value={
                value.minMonthlyIncl !== null ? (
                  <RateLines {...formatRateLines(value.minMonthlyIncl, null)} align="right" />
                ) : null
              }
            />
            <Row
              label="時給下限（税抜）"
              value={
                value.minHourlyExcl !== null
                  ? `${value.minHourlyExcl.toLocaleString('ja-JP')}円/h`
                  : null
              }
            />
            <Row label="希望開始" value={value.targetStart} />
            <Row
              label="出社の上限"
              value={value.maxOnsitePerMonth !== null ? `${value.maxOnsitePerMonth}回/月` : null}
            />
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(submit)}>
            <Stack gap="sm">
              <NumberInput
                label="単価下限（税込・円）"
                thousandSeparator=","
                min={0}
                {...form.getInputProps('minMonthlyIncl')}
              />
              <NumberInput
                label="時給下限（税抜・円）"
                thousandSeparator=","
                min={0}
                {...form.getInputProps('minHourlyExcl')}
              />
              <TextInput
                label="希望開始（YYYY-MM）これより後は赤"
                {...form.getInputProps('targetStart')}
              />
              <NumberInput
                label="出社の上限（回/月）"
                min={0}
                {...form.getInputProps('maxOnsitePerMonth')}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={cancel} disabled={saving}>
                  キャンセル
                </Button>
                <Button type="submit" loading={saving}>
                  保存
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </Card>
  )
}
