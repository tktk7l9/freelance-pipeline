import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { DUE_COLOR, dueLabel, dueState, groupByDue, postponeDue } from '../../lib/deadlines'
import { formatDateSlash } from '../../lib/format'
import { saveNextAction } from '../../server/cases'
import type { CompanySites } from '../../server/repository'
import { CompanyName } from '../CompanyName'
import { showUndo } from '../undoNotification'

type Item = {
  id: string
  company: string
  title: string
  nextAction: string | null
  nextActionDue: string
}

/**
 * Due list at the top of home (SHIG 20: the major task first). Pushing a due date back is the most
 * common update, so each card can do it in place (30: pen near the paper) and undo it (57, 54).
 */
export function DueList({
  items,
  sites,
  today,
}: {
  items: Item[]
  sites: CompanySites
  today: string
}) {
  if (items.length === 0) return null
  const groups = groupByDue(items)
  return (
    <Stack gap="xs">
      <Title order={2}>期日順</Title>
      {groups.map((g) => {
        const state = dueState(g.date, today)
        return (
          <Stack key={g.date} gap={4}>
            <Group gap="xs">
              <Text size="sm" fw={700} c={DUE_COLOR[state]}>
                {formatDateSlash(g.date)}
              </Text>
              {dueLabel(g.date, today) ? (
                <Badge color={DUE_COLOR[state]} variant="light" size="sm">
                  {dueLabel(g.date, today)}
                </Badge>
              ) : null}
            </Group>
            {g.items.map((i) => (
              <DueCard key={i.id} item={i} sites={sites} today={today} />
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}

function DueCard({ item, sites, today }: { item: Item; sites: CompanySites; today: string }) {
  const router = useRouter()
  const save = useServerFn(saveNextAction)
  const [saving, setSaving] = useState<number | null>(null)

  async function postpone(days: number) {
    const before = item.nextActionDue
    const after = postponeDue(before, today, days)
    setSaving(days)
    try {
      await save({ data: { id: item.id, nextAction: item.nextAction ?? '', nextActionDue: after } })
      await router.invalidate()
      showUndo({
        message: `期日を ${formatDateSlash(after)} にしました`,
        onUndo: async () => {
          await save({
            data: { id: item.id, nextAction: item.nextAction ?? '', nextActionDue: before },
          })
          await router.invalidate()
        },
      })
    } catch {
      notifications.show({ message: '期日を変えられませんでした', color: 'red' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card withBorder padding={0}>
      <Link
        to="/cases/$id"
        params={{ id: item.id }}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <Stack gap={2} p="sm" pb={6}>
          <Text fw={600} lineClamp={1}>
            {item.nextAction ?? '（次の一手が未設定）'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            <CompanyName name={item.company} url={sites[item.company]} nested />・{item.title}
          </Text>
        </Stack>
      </Link>
      <Group gap="xs" px="sm" pb="sm" justify="flex-end">
        <Text size="xs" c="dimmed" mr="auto">
          期日を延ばす
        </Text>
        <Button
          size="xs"
          variant="default"
          loading={saving === 1}
          disabled={saving !== null}
          aria-label="期日を 1 日延ばす"
          onClick={() => postpone(1)}
        >
          +1日
        </Button>
        <Button
          size="xs"
          variant="default"
          loading={saving === 7}
          disabled={saving !== null}
          aria-label="期日を 1 週間延ばす"
          onClick={() => postpone(7)}
        >
          +1週間
        </Button>
      </Group>
    </Card>
  )
}
