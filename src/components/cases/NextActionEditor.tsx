import { Autocomplete, Button, Chip, Group, Stack, Text } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'

import { quickDueOptions } from '../../lib/deadlines'
import { extractErrorMessage } from '../../lib/formError'
import { nextActionSuggestions } from '../../lib/nextAction'
import type { CaseStatus } from '../../lib/status'
import { saveNextAction } from '../../server/cases'

export function NextActionEditor({
  id,
  status,
  nextAction,
  nextActionDue,
  today,
  focusSignal = 0,
}: {
  id: string
  status: CaseStatus
  nextAction: string | null
  nextActionDue: string | null
  today: string
  /** Bumped by the parent after the status advances: focus the field so the next step gets reviewed (SHIG 41, 77) */
  focusSignal?: number
}) {
  const router = useRouter()
  const save = useServerFn(saveNextAction)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Mantine 9.6's DateInput handles values as 'YYYY-MM-DD' strings
  const form = useForm({
    initialValues: { nextAction: nextAction ?? '', nextActionDue: nextActionDue ?? '' },
  })

  useEffect(() => {
    if (focusSignal === 0) return
    const input = inputRef.current
    if (!input) return
    input.scrollIntoView({ block: 'center', behavior: 'smooth' })
    input.focus({ preventScroll: true })
  }, [focusSignal])

  async function submit(v: { nextAction: string; nextActionDue: string }) {
    setSaving(true)
    try {
      await save({ data: { id, nextAction: v.nextAction, nextActionDue: v.nextActionDue || null } })
      await router.invalidate()
      form.resetDirty(v)
      notifications.show({ message: '次の一手を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  const suggestions = nextActionSuggestions(status)
  const quick = quickDueOptions(today)
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="xs">
        <Autocomplete
          ref={inputRef}
          label="次の一手"
          placeholder="例: 書類通過の連絡が来たら面談日程を返す"
          data={suggestions}
          {...form.getInputProps('nextAction')}
        />
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <DateInput
            label="期日"
            valueFormat="YYYY/MM/DD"
            clearable
            clearButtonProps={{ 'aria-label': '期日を消す' }}
            style={{ flex: 1 }}
            {...form.getInputProps('nextActionDue')}
            value={form.values.nextActionDue || null}
            onChange={(v) => form.setFieldValue('nextActionDue', v ?? '')}
          />
          <Button type="submit" loading={saving}>
            保存
          </Button>
        </Group>
        {/* Pick a result instead of typing a date (SHIG 45) */}
        <Group gap="xs" wrap="wrap" role="group" aria-label="期日をすぐ選ぶ">
          <Text size="xs" c="dimmed">
            期日:
          </Text>
          {quick.map((o) => (
            <Chip
              key={o.label}
              size="sm"
              checked={form.values.nextActionDue === o.date}
              onChange={() => form.setFieldValue('nextActionDue', o.date)}
            >
              {o.label}
            </Chip>
          ))}
        </Group>
      </Stack>
    </form>
  )
}
