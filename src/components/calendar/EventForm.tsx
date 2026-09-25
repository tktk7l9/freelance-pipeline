import { Button, Checkbox, Group, Select, Stack, TextInput, Textarea } from '@mantine/core'
import { DateInput, TimeInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import dayjs from 'dayjs'
import { useState } from 'react'

import type { EventRow } from '../../db/schema'
import { splitStartsAt } from '../../lib/calendar'
import { extractErrorMessage } from '../../lib/formError'
import { EVENT_KINDS, EVENT_KIND_LABEL } from '../../lib/enums'
import { saveEvent, type EventInput } from '../../server/events'

type Values = Omit<EventInput, 'id'>
export type CaseOption = { id: string; label: string }

export function EventForm({
  event,
  defaults,
  caseOptions,
  onSaved,
}: {
  event: EventRow | null
  defaults?: Partial<Pick<Values, 'date' | 'caseId'>>
  caseOptions: CaseOption[]
  onSaved: (id: string) => void
}) {
  const router = useRouter()
  const save = useServerFn(saveEvent)
  const [saving, setSaving] = useState(false)
  const initial: Values = event
    ? {
        title: event.title,
        kind: event.kind,
        date: splitStartsAt(event.startsAt).date,
        allDay: event.allDay,
        startTime: splitStartsAt(event.startsAt).time,
        endTime: event.endsAt ? splitStartsAt(event.endsAt).time : null,
        caseId: event.caseId,
        note: event.note,
      }
    : {
        title: '',
        kind: 'meeting',
        date: defaults?.date ?? dayjs().format('YYYY-MM-DD'),
        allDay: false,
        startTime: '10:00',
        endTime: null,
        caseId: defaults?.caseId ?? null,
        note: null,
      }
  const form = useForm<Values>({
    initialValues: initial,
    validate: {
      title: (v) => (v.trim() ? null : 'タイトルは必須です'),
      startTime: (v, values) => (!values.allDay && !v ? '開始時刻を入れてください' : null),
    },
  })

  async function submit(values: Values) {
    setSaving(true)
    try {
      const res = await save({
        data: {
          ...(event ? { id: event.id } : {}),
          ...values,
          startTime: values.startTime || null,
          endTime: values.endTime || null,
          note: values.note || null,
        },
      })
      await router.invalidate()
      notifications.show({ message: event ? '予定を更新しました' : '予定を追加しました' })
      onSaved(res.id)
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="md">
        <TextInput label="タイトル" required {...form.getInputProps('title')} />
        <Select
          label="種別"
          data={EVENT_KINDS.map((k) => ({ value: k, label: EVENT_KIND_LABEL[k] }))}
          {...form.getInputProps('kind')}
        />
        <DateInput
          label="日付"
          required
          valueFormat="YYYY/MM/DD"
          value={form.values.date ? new Date(`${form.values.date}T00:00:00`) : null}
          onChange={(d) => form.setFieldValue('date', d ? dayjs(d).format('YYYY-MM-DD') : '')}
        />
        <Checkbox label="終日" {...form.getInputProps('allDay', { type: 'checkbox' })} />
        {!form.values.allDay ? (
          <Group grow>
            <TimeInput
              label="開始"
              {...form.getInputProps('startTime')}
              value={form.values.startTime ?? ''}
            />
            <TimeInput
              label="終了"
              {...form.getInputProps('endTime')}
              value={form.values.endTime ?? ''}
              onChange={(e) => form.setFieldValue('endTime', e.currentTarget.value || null)}
            />
          </Group>
        ) : null}
        <Select
          label="案件"
          clearable
          searchable
          data={caseOptions.map((c) => ({ value: c.id, label: c.label }))}
          {...form.getInputProps('caseId')}
        />
        <Textarea
          label="メモ"
          autosize
          minRows={2}
          {...form.getInputProps('note')}
          value={form.values.note ?? ''}
        />
        <Button type="submit" loading={saving} fullWidth>
          保存
        </Button>
      </Stack>
    </form>
  )
}
