import { Button, Group, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Schedule } from '@mantine/schedule'
import type { ScheduleEventData, ScheduleViewLevel } from '@mantine/schedule'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { EventForm } from '../components/calendar/EventForm'
import { Fab } from '../components/Fab'
import { FormDrawer } from '../components/FormDrawer'
import { PageShell } from '../components/PageShell'
import { dateKey, formatDateWithWeekday, toJstIso, visibleRange } from '../lib/calendar'
import { formatDateSlash } from '../lib/format'
import { holidayName } from '../lib/holidays'
import { dueToScheduleEvents, toScheduleEvents, type CalendarPayload } from '../lib/scheduleEvents'
import { SCHEDULE_LABELS_JA } from '../lib/scheduleLabels'
import { deleteEvent, listEventsBetween } from '../server/events'
import type { EventRow } from '../db/schema'

const search = z.object({
  // 表示中の月 'YYYY-MM'。無ければ今月
  m: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  // 選択日 'YYYY-MM-DD'
  d: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  v: z.enum(['day', 'week', 'month']).optional(),
})

export const Route = createFileRoute('/calendar')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search }) => ({ m: search.m, d: search.d, v: search.v }),
  loader: async ({ deps }) => {
    const view = deps.v ?? 'month'
    const date = deps.d ?? (deps.m ? `${deps.m}-01` : dateKey(toJstIso(new Date())))
    const data = await listEventsBetween({ data: visibleRange(date, view) })
    return { ...data, date }
  },
})

function Page() {
  const { events, due, caseOptions, date, nowIso, todayKey } = Route.useLoaderData()
  const { d, v } = Route.useSearch()
  const navigate = useNavigate({ from: '/calendar' })
  const router = useRouter()
  const remove = useServerFn(deleteEvent)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [creating, setCreating] = useState(false)
  // 'year' は URL に持たせない。ヘッダーから選ばれても表示だけローカルで切り替える
  const [view, setView] = useState<ScheduleViewLevel>(v ?? 'month')
  // スマホは 1 日あたりの表示件数を 1 にしてセルの高さを詰める（Mantine が高さを連動させる）
  const isMobile = useMediaQuery('(max-width: 47.99em)', true)

  useEffect(() => {
    setView(v ?? 'month')
  }, [v])

  const scheduleEvents = useMemo<ScheduleEventData<CalendarPayload>[]>(
    () => [...toScheduleEvents(events, nowIso), ...dueToScheduleEvents(due, todayKey)],
    [events, due, nowIso, todayKey],
  )
  const selected = d ?? date

  function navigateToDay(next: string) {
    // Schedule のコールバックは 'YYYY-MM-DD HH:mm:ss' で来るため日付部分だけ取り出す
    navigate({ search: (s) => ({ ...s, d: dateKey(next) }), replace: true })
  }

  function handleViewChange(next: ScheduleViewLevel) {
    setView(next)
    if (next === 'day' || next === 'week' || next === 'month') {
      navigate({ search: (s) => ({ ...s, v: next }), replace: true })
    }
  }

  function handleEventClick(ev: ScheduleEventData) {
    const payload = ev.payload as CalendarPayload | undefined
    if (!payload) return
    if (payload.kind === 'own') {
      const found = events.find((e) => e.id === payload.eventId)
      if (found) setEditing(found)
      return
    }
    navigate({ to: '/cases/$id', params: { id: payload.caseId } })
  }

  async function handleDelete(e: EventRow) {
    if (!window.confirm(`「${e.title}」を削除します。`)) return
    try {
      await remove({ data: { id: e.id } })
      await router.invalidate()
      setEditing(null)
      notifications.show({ message: '予定を削除しました' })
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  /** 終わったものは文字色を落とす。期日レイヤーは枠線だけで描く */
  function renderEventBody(event: ScheduleEventData) {
    const payload = event.payload as CalendarPayload | undefined
    return (
      <Text span inherit c={payload?.past ? 'dimmed' : undefined}>
        {event.title}
      </Text>
    )
  }

  function dayProps(key: string) {
    const name = holidayName(key)
    return name ? { style: { color: 'var(--mantine-color-red-6)' }, title: name } : {}
  }

  return (
    <PageShell title="予定" fab>
      <Stack gap="md">
        <Schedule
          date={date}
          onDateChange={(next) => {
            const key = dateKey(next)
            navigate({ search: (s) => ({ ...s, m: key.slice(0, 7), d: key }), replace: true })
          }}
          view={view}
          onViewChange={handleViewChange}
          events={scheduleEvents}
          labels={SCHEDULE_LABELS_JA}
          layout="default"
          mode="default"
          onDayClick={(next) => navigateToDay(next)}
          onEventClick={handleEventClick}
          renderEventBody={renderEventBody}
          monthViewProps={{
            firstDayOfWeek: 1,
            weekendDays: [0, 6],
            highlightToday: true,
            getDayProps: dayProps,
            maxEventsPerDay: isMobile ? 1 : 2,
            monthYearSelectProps: { labelFormat: 'YYYY/MM' },
          }}
          weekViewProps={{
            startTime: '07:00:00',
            endTime: '22:00:00',
            intervalMinutes: 30,
            renderWeekLabel: ({ weekStart, weekEnd }) =>
              `${formatDateSlash(weekStart)} – ${formatDateSlash(weekEnd)}`,
          }}
          dayViewProps={{
            startTime: '07:00:00',
            endTime: '22:00:00',
            intervalMinutes: 30,
            headerFormat: (d) => formatDateWithWeekday(dateKey(d)),
          }}
        />
        <Group gap="sm" wrap="wrap">
          <Legend color="var(--mantine-color-indigo-6)" label="自分の予定" />
          <Legend color="var(--mantine-color-gray-5)" label="終わった予定" />
          <Legend border label="案件の期日（クリックで案件へ）" />
        </Group>
      </Stack>

      <Fab label="予定を追加" onClick={() => setCreating(true)} />
      <FormDrawer opened={creating} onClose={() => setCreating(false)} title="予定を追加">
        <EventForm
          event={null}
          defaults={{ date: selected }}
          caseOptions={caseOptions}
          onSaved={() => setCreating(false)}
        />
      </FormDrawer>
      <FormDrawer opened={editing !== null} onClose={() => setEditing(null)} title="予定を編集">
        {editing ? (
          <Stack gap="md">
            <EventForm event={editing} caseOptions={caseOptions} onSaved={() => setEditing(null)} />
            <Button color="red" variant="light" fullWidth onClick={() => handleDelete(editing)}>
              削除
            </Button>
          </Stack>
        ) : null}
      </FormDrawer>
    </PageShell>
  )
}

function Legend({ color, border, label }: { color?: string; border?: boolean; label: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          display: 'inline-block',
          backgroundColor: color,
          border: border ? '1px solid var(--mantine-color-gray-6)' : undefined,
        }}
      />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  )
}
