import { Autocomplete, Button, Chip, Group, Stack, Text } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useRef, useState } from 'react'

import { quickDueOptions } from '../../lib/deadlines'
import { extractErrorMessage } from '../../lib/formError'
import { nextActionSuggestions, pendingFocus, type FocusRequest } from '../../lib/nextAction'
import type { CaseStatus } from '../../lib/status'
import { saveNextAction } from '../../server/cases'

export function NextActionEditor({
  id,
  status,
  nextAction,
  nextActionDue,
  today,
  focusRequest = { n: 0, target: 'field' },
  onSaved,
}: {
  id: string
  status: CaseStatus
  nextAction: string | null
  nextActionDue: string | null
  today: string
  /** Bumped by the parent. After the status advances it asks for the field so the next step gets
   * reviewed (SHIG 41, 77); after saving it asks for the save button so focus stays put (SHIG 94) */
  focusRequest?: FocusRequest
  /** Called after a successful save; the parent answers with a 'save' focus request */
  onSaved?: () => void
}) {
  const router = useRouter()
  const save = useServerFn(saveNextAction)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  // Mantine 9.6's DateInput handles values as 'YYYY-MM-DD' strings
  const form = useForm({
    initialValues: { nextAction: nextAction ?? '', nextActionDue: nextActionDue ?? '' },
  })

  // Follow the saved values when they change from outside (e.g. postponed elsewhere) unless the owner
  // is typing. The editor used to be remounted through a key instead, but a remount after every save
  // threw away the focused save button and dropped focus to the page (SHIG 94)
  useEffect(() => {
    if (form.isDirty()) return
    const saved = { nextAction: nextAction ?? '', nextActionDue: nextActionDue ?? '' }
    form.setValues(saved)
    form.resetDirty(saved)
    // `form` is left out of the deps on purpose: it is a new object on every render
  }, [nextAction, nextActionDue])

  // Start from the current request so a remount does not replay an old bump (focus + phone keyboard)
  const handled = useRef(focusRequest.n)
  // Runs after `saving` settles too: the button is disabled while loading and cannot take focus until then
  useEffect(() => {
    if (saving) return
    const target = pendingFocus(handled.current, focusRequest)
    if (!target) return
    handled.current = focusRequest.n
    if (target === 'save') {
      saveRef.current?.focus()
      return
    }
    const input = inputRef.current
    if (!input) return
    input.scrollIntoView({ block: 'center', behavior: 'smooth' })
    input.focus({ preventScroll: true })
  }, [focusRequest, saving])

  async function submit(v: { nextAction: string; nextActionDue: string }) {
    setSaving(true)
    try {
      await save({ data: { id, nextAction: v.nextAction, nextActionDue: v.nextActionDue || null } })
      await router.invalidate()
      form.resetDirty(v)
      notifications.show({ message: '次の一手を保存しました' })
      onSaved?.()
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
          <Button type="submit" loading={saving} ref={saveRef}>
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
