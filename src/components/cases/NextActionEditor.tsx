import { Button, Group, Stack, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { extractErrorMessage } from '../../lib/formError'
import { saveNextAction } from '../../server/cases'

export function NextActionEditor({
  id,
  nextAction,
  nextActionDue,
}: {
  id: string
  nextAction: string | null
  nextActionDue: string | null
}) {
  const router = useRouter()
  const save = useServerFn(saveNextAction)
  const [saving, setSaving] = useState(false)
  // Mantine 9.6 の DateInput は値を 'YYYY-MM-DD' 文字列で扱う
  const form = useForm({
    initialValues: { nextAction: nextAction ?? '', nextActionDue: nextActionDue ?? '' },
  })

  async function submit(v: { nextAction: string; nextActionDue: string }) {
    setSaving(true)
    try {
      await save({ data: { id, nextAction: v.nextAction, nextActionDue: v.nextActionDue || null } })
      await router.invalidate()
      notifications.show({ message: '次の一手を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="xs">
        <TextInput
          label="次の一手"
          placeholder="例: 書類通過の連絡が来たら面談日程を返す"
          {...form.getInputProps('nextAction')}
        />
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <DateInput
            label="期日"
            valueFormat="YYYY-MM-DD"
            clearable
            style={{ flex: 1 }}
            {...form.getInputProps('nextActionDue')}
            value={form.values.nextActionDue || null}
            onChange={(v) => form.setFieldValue('nextActionDue', v ?? '')}
          />
          <Button type="submit" loading={saving}>
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
