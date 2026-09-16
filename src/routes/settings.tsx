import {
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { PageShell } from '../components/PageShell'
import { FILING_TYPE_LABEL, type BusinessInfo } from '../lib/business'
import { extractErrorMessage } from '../lib/formError'
import { getSettingsData, saveAxes, saveBusiness, saveThresholds } from '../server/settings'

export const Route = createFileRoute('/settings')({
  component: Page,
  loader: () => getSettingsData(),
})

type Num = number | ''
const n = (v: Num) => (v === '' ? null : v)

type BusinessValues = {
  openedOn: string
  occupation: string
  description: string
  filingType: string
  taxOffice: string
  taxAddress: string
  invoiceNumber: string
  invoiceRegisteredOn: string
  etaxUserId: string
  businessNumber: string
}

const toBusinessValues = (b: BusinessInfo): BusinessValues => ({
  openedOn: b.openedOn ?? '',
  occupation: b.occupation ?? '',
  description: b.description ?? '',
  filingType: b.filingType ?? '',
  taxOffice: b.taxOffice ?? '',
  taxAddress: b.taxAddress ?? '',
  invoiceNumber: b.invoiceNumber ?? '',
  invoiceRegisteredOn: b.invoiceRegisteredOn ?? '',
  etaxUserId: b.etaxUserId ?? '',
  businessNumber: b.businessNumber ?? '',
})

const t = (v: string) => (v.trim() === '' ? null : v.trim())

function Page() {
  const { thresholds, axes, business } = Route.useLoaderData()
  const router = useRouter()
  const saveT = useServerFn(saveThresholds)
  const saveA = useServerFn(saveAxes)
  const saveB = useServerFn(saveBusiness)
  const [saving, setSaving] = useState(false)
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [axisValues, setAxisValues] = useState<string[]>(axes)
  const businessForm = useForm<BusinessValues>({
    initialValues: toBusinessValues(business),
  })

  async function submitBusiness(v: BusinessValues) {
    setSavingBusiness(true)
    try {
      await saveB({
        data: {
          openedOn: t(v.openedOn),
          occupation: t(v.occupation),
          description: t(v.description),
          filingType: v.filingType === 'blue' || v.filingType === 'white' ? v.filingType : null,
          taxOffice: t(v.taxOffice),
          taxAddress: t(v.taxAddress),
          invoiceNumber: t(v.invoiceNumber),
          invoiceRegisteredOn: t(v.invoiceRegisteredOn),
          etaxUserId: t(v.etaxUserId),
          businessNumber: t(v.businessNumber),
        },
      })
      await router.invalidate()
      notifications.show({ message: '事業者情報を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSavingBusiness(false)
    }
  }
  const form = useForm<{
    minMonthlyIncl: Num
    minHourlyExcl: Num
    targetStart: string
    maxOnsitePerMonth: Num
  }>({
    initialValues: {
      minMonthlyIncl: thresholds.minMonthlyIncl ?? '',
      minHourlyExcl: thresholds.minHourlyExcl ?? '',
      targetStart: thresholds.targetStart ?? '',
      maxOnsitePerMonth: thresholds.maxOnsitePerMonth ?? '',
    },
  })

  async function submitThresholds(v: typeof form.values) {
    setSaving(true)
    try {
      await saveT({
        data: {
          minMonthlyIncl: n(v.minMonthlyIncl),
          minHourlyExcl: n(v.minHourlyExcl),
          targetStart: v.targetStart.trim() || null,
          maxOnsitePerMonth: n(v.maxOnsitePerMonth),
        },
      })
      await router.invalidate()
      notifications.show({ message: '閾値を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  async function submitAxes() {
    try {
      await saveA({ data: { axes: axisValues } })
      await router.invalidate()
      notifications.show({ message: '軸を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    }
  }

  return (
    <PageShell title="設定" description="判断基準はここ（DB）にだけ置く。リポジトリには入らない">
      <Card withBorder padding="md">
        <form onSubmit={businessForm.onSubmit(submitBusiness)}>
          <Stack gap="sm">
            <Title order={2}>事業者情報</Title>
            <Text size="sm" c="dimmed">
              確定申告・請求書まわりの基礎情報。値は D1 にだけ入る。
            </Text>
            <Group grow>
              <DateInput
                label="開業日"
                valueFormat="YYYY-MM-DD"
                clearable
                {...businessForm.getInputProps('openedOn')}
                value={businessForm.values.openedOn || null}
                onChange={(v) => businessForm.setFieldValue('openedOn', v ?? '')}
              />
              <Select
                label="申告区分"
                data={[
                  { value: 'blue', label: FILING_TYPE_LABEL.blue },
                  { value: 'white', label: FILING_TYPE_LABEL.white },
                ]}
                clearable
                value={businessForm.values.filingType || null}
                onChange={(v) => businessForm.setFieldValue('filingType', v ?? '')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="職業"
                placeholder="例: ソフトウェア開発"
                {...businessForm.getInputProps('occupation')}
              />
              <TextInput
                label="事業概要"
                placeholder="事業の概要"
                {...businessForm.getInputProps('description')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="所轄税務署"
                placeholder="◯◯税務署"
                {...businessForm.getInputProps('taxOffice')}
              />
              <TextInput label="納税地の住所" {...businessForm.getInputProps('taxAddress')} />
            </Group>
            <Group grow>
              <TextInput
                label="適格請求書発行事業者登録番号"
                placeholder="T1234567890123"
                {...businessForm.getInputProps('invoiceNumber')}
              />
              <DateInput
                label="登録年月日"
                valueFormat="YYYY-MM-DD"
                clearable
                {...businessForm.getInputProps('invoiceRegisteredOn')}
                value={businessForm.values.invoiceRegisteredOn || null}
                onChange={(v) => businessForm.setFieldValue('invoiceRegisteredOn', v ?? '')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="e-Tax 利用者識別番号"
                placeholder="1234567890123456"
                {...businessForm.getInputProps('etaxUserId')}
              />
              <TextInput label="事業者番号" {...businessForm.getInputProps('businessNumber')} />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" loading={savingBusiness}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
      <Card withBorder padding="md">
        <form onSubmit={form.onSubmit(submitThresholds)}>
          <Stack gap="sm">
            <Title order={2}>閾値</Title>
            <Text size="sm" c="dimmed">
              比較ビューで下回るセルを赤くする。空欄は判定しない。
            </Text>
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
              <Button type="submit" loading={saving}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={2}>比較の軸</Title>
          <Text size="sm" c="dimmed">
            案件ごとに 0〜2 で付ける観点。順番は比較表の行順。
          </Text>
          <TagsInput
            label="軸"
            value={axisValues}
            onChange={setAxisValues}
            placeholder="入力して Enter"
            maxTags={10}
          />
          <Group justify="flex-end">
            <Button onClick={submitAxes}>保存</Button>
          </Group>
        </Stack>
      </Card>
    </PageShell>
  )
}
