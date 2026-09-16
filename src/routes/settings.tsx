import {
  Button,
  Card,
  Group,
  NumberInput,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { PageShell } from '../components/PageShell'
import { extractErrorMessage } from '../lib/formError'
import { getSettingsData, saveAxes, saveThresholds } from '../server/settings'

export const Route = createFileRoute('/settings')({
  component: Page,
  loader: () => getSettingsData(),
})

type Num = number | ''
const n = (v: Num) => (v === '' ? null : v)

function Page() {
  const { thresholds, axes } = Route.useLoaderData()
  const router = useRouter()
  const saveT = useServerFn(saveThresholds)
  const saveA = useServerFn(saveAxes)
  const [saving, setSaving] = useState(false)
  const [axisValues, setAxisValues] = useState<string[]>(axes)
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
