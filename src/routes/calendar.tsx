import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Schedule } from '@mantine/schedule'
import type { ScheduleEventData, ScheduleViewLevel } from '@mantine/schedule'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { EventForm } from '../components/calendar/EventForm'
import { Fab } from '../components/Fab'
import { FormDrawer } from '../components/FormDrawer'
import { PageShell } from '../components/PageShell'
import {
  dateKey,
  formatDateJa,
  formatDateWithWeekday,
  toJstIso,
  visibleRange,
} from '../lib/calendar'
import { EVENT_KINDS, EVENT_KIND_LABEL } from '../lib/enums'
import { formatDateSlash } from '../lib/format'
import { holidayName } from '../lib/holidays'
import {
  KIND_COLOR,
  PAST_EVENT_COLOR,
  dayListTimeLabel,
  dueToScheduleEvents,
  eventsOnDay,
  toScheduleEvents,
  type CalendarPayload,
} from '../lib/scheduleEvents'
import { SCHEDULE_LABELS_JA } from '../lib/scheduleLabels'
import { deleteEvent, listEventsBetween, saveEvent } from '../server/events'
import { splitStartsAt } from '../lib/calendar'
import { showUndo } from '../components/undoNotification'
import type { EventRow } from '../db/schema'

const search = z.object({
  // Displayed month 'YYYY-MM'. Defaults to this month
  m: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  // Selected date 'YYYY-MM-DD'
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
  const restore = useServerFn(saveEvent)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [creating, setCreating] = useState(false)
  // 'year' is not kept in the URL. Even if chosen from the header, only the local display switches
  const [view, setView] = useState<ScheduleViewLevel>(v ?? 'month')
  // On phones, show 1 event per day to tighten the cell height (Mantine ties the height to it)
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
    // Schedule callbacks come as 'YYYY-MM-DD HH:mm:ss', so take only the date part
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

  /** No confirmation; after deleting, "Undo" re-adds the same content */
  async function handleDelete(e: EventRow) {
    try {
      await remove({ data: { id: e.id } })
      await router.invalidate()
      setEditing(null)
      showUndo({
        message: '予定を削除しました',
        onUndo: async () => {
          const { date, time } = splitStartsAt(e.startsAt)
          await restore({
            data: {
              title: e.title,
              kind: e.kind,
              date,
              allDay: e.allDay,
              startTime: e.allDay ? null : time,
              endTime: e.endsAt ? splitStartsAt(e.endsAt).time : null,
              caseId: e.caseId,
              note: e.note,
            },
          })
          await router.invalidate()
        },
      })
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  /** Finished items get dimmer text. The due-date layer is drawn as outlines only */
  function renderEventBody(event: ScheduleEventData) {
    const payload = event.payload as CalendarPayload | undefined
    return (
      <Text span inherit c={payload?.past ? 'dimmed' : undefined}>
        {event.title}
      </Text>
    )
  }

  /** Day buttons are read as '2026年9月1日' instead of Mantine's English order (SHIG 94) */
  function dayProps(key: string) {
    const name = holidayName(key)
    const label = formatDateJa(key)
    return name
      ? {
          style: { color: 'var(--mantine-color-red-6)' },
          title: name,
          'aria-label': `${label} ${name}`,
        }
      : { 'aria-label': label }
  }

  function goToday() {
    navigate({
      search: (s) => ({ ...s, m: todayKey.slice(0, 7), d: todayKey }),
      replace: true,
    })
  }

  // On phones a month cell fits one short title, so list the selected day's events below (SHIG 82, 28)
  const dayEvents = eventsOnDay(scheduleEvents, selected)

  return (
    <PageShell title="予定" fab>
      <Stack gap="md">
        {/* The Schedule header hides its "today" button on narrow screens; keep a way back (SHIG 60) */}
        <Group hiddenFrom="sm" justify="flex-end">
          <Button variant="default" size="xs" onClick={goToday}>
            今日
          </Button>
        </Group>
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
        {isMobile && view === 'month' ? (
          <Card withBorder padding="sm">
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Title order={2} size="h5">
                  {formatDateWithWeekday(selected)}
                </Title>
                <Button variant="subtle" size="xs" onClick={() => setCreating(true)}>
                  この日に追加
                </Button>
              </Group>
              {dayEvents.length === 0 ? (
                <Text size="sm" c="dimmed">
                  予定はありません。日付を押すとその日の予定が出ます。
                </Text>
              ) : (
                dayEvents.map((ev) => (
                  <UnstyledButton
                    key={String(ev.id)}
                    onClick={() => handleEventClick(ev)}
                    className="day-event"
                  >
                    <Group gap="xs" wrap="nowrap">
                      <Badge
                        variant={
                          (ev.payload as CalendarPayload).kind === 'due' ? 'outline' : 'light'
                        }
                        color={ev.color ?? 'gray'}
                        style={{ flexShrink: 0 }}
                      >
                        {dayListTimeLabel(ev)}
                      </Badge>
                      <Text
                        size="sm"
                        lineClamp={2}
                        c={(ev.payload as CalendarPayload).past ? 'dimmed' : undefined}
                      >
                        {ev.title}
                      </Text>
                    </Group>
                  </UnstyledButton>
                ))
              )}
            </Stack>
          </Card>
        ) : null}
        {/* The legend matches how events are actually colored: one color per kind (SHIG 96, 31) */}
        <Group gap="xs" wrap="wrap" aria-label="色の見方">
          {EVENT_KINDS.map((k) => (
            <Badge key={k} variant="light" color={KIND_COLOR[k]} size="sm">
              {EVENT_KIND_LABEL[k]}
            </Badge>
          ))}
          <Badge variant="light" color={PAST_EVENT_COLOR} size="sm">
            終わった予定
          </Badge>
          <Badge variant="outline" color="gray" size="sm">
            案件の期日（押すと案件へ）
          </Badge>
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
            {/* Kept away from "Save" behind a divider, and quiet: it can be undone (SHIG 16, 13, 54) */}
            <Divider mt="xl" />
            <Group justify="center">
              <Button
                color="red"
                variant="subtle"
                size="xs"
                leftSection={<Trash2 size={14} aria-hidden />}
                onClick={() => handleDelete(editing)}
              >
                この予定を削除
              </Button>
            </Group>
          </Stack>
        ) : null}
      </FormDrawer>
    </PageShell>
  )
}
