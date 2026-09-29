import { Button, Group, Menu, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { STATUS_LABEL, transitionOptions, type CaseStatus } from '../../lib/status'
import { changeCaseStatus, undoStatusChange } from '../../server/cases'
import { showUndo } from '../undoNotification'
import { StatusBadge } from './StatusBadge'

/**
 * Status change. The most common action, "advance to next", is one tap; the rest (skip ahead, on hold,
 * declined, passed) fold into a menu (do not list every option = Hick's law). No confirm dialog;
 * after changing, "Undo" in the notification reverts it. The current status is shown next to the
 * label so the buttons can be read against it (SHIG 25, 12). `onChanged` lets the page move focus to
 * the next step, which usually changes with the status (41).
 */
export function StatusChanger({
  id,
  status,
  onChanged,
}: {
  id: string
  status: CaseStatus
  onChanged?: (to: CaseStatus) => void
}) {
  const router = useRouter()
  const change = useServerFn(changeCaseStatus)
  const undo = useServerFn(undoStatusChange)
  const [saving, setSaving] = useState<CaseStatus | null>(null)
  const { primary, others } = transitionOptions(status)

  async function apply(to: CaseStatus) {
    setSaving(to)
    try {
      const r = await change({ data: { id, to } })
      if (!r.ok) {
        notifications.show({ message: 'この遷移はできません', color: 'red' })
        return
      }
      await router.invalidate()
      onChanged?.(to)
      showUndo({
        message: `${STATUS_LABEL[to]} にしました。次の一手と期日も見直してください`,
        onUndo: async () => {
          await undo({ data: { id } })
          await router.invalidate()
        },
      })
    } catch {
      notifications.show({ message: '変更できませんでした', color: 'red' })
    } finally {
      setSaving(null)
    }
  }

  if (!primary && others.length === 0) return null
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" fw={600}>
          状態
        </Text>
        <Text size="sm" c="dimmed">
          いま:
        </Text>
        <StatusBadge status={status} />
      </Group>
      {primary ? (
        <Button onClick={() => apply(primary)} loading={saving === primary} fullWidth>
          {STATUS_LABEL[primary]}へ進める
        </Button>
      ) : null}
      {others.length > 0 ? (
        // No focus placeholder: Mantine puts a role="presentation" div inside role="menu", which is not an
        // allowed child; without it, opening moves focus to the first item as the ARIA menu pattern expects.
        // Portaled into <main> so the open menu stays inside a landmark
        <Menu
          position="bottom-end"
          withinPortal
          portalProps={{ target: 'main' }}
          withInitialFocusPlaceholder={false}
        >
          <Menu.Target>
            <Button
              variant={primary ? 'subtle' : 'default'}
              fullWidth
              rightSection={<ChevronDown size={14} aria-hidden />}
              loading={saving !== null && saving !== primary}
            >
              {primary ? '他の状態にする' : '状態を変える'}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {others.map((s) => (
              <Menu.Item key={s} onClick={() => apply(s)}>
                {STATUS_LABEL[s]}にする
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      ) : null}
    </Stack>
  )
}
