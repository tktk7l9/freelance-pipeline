import { Button, Menu, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { STATUS_LABEL, transitionOptions, type CaseStatus } from '../../lib/status'
import { changeCaseStatus, undoStatusChange } from '../../server/cases'
import { showUndo } from '../undoNotification'

/**
 * ステータス変更。いちばん多い「次へ進める」は 1 タップ、残り（飛び級・保留・辞退・見送り）は
 * メニューに畳む（選択肢を並べ切らない＝ヒックの法則）。確認ダイアログは出さず、
 * 変えたあと通知の「取り消す」で戻せる。
 */
export function StatusChanger({ id, status }: { id: string; status: CaseStatus }) {
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
      showUndo({
        message: `${STATUS_LABEL[to]} にしました`,
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
      <Text size="sm" fw={600}>
        状態
      </Text>
      {primary ? (
        <Button onClick={() => apply(primary)} loading={saving === primary} fullWidth>
          {STATUS_LABEL[primary]}へ進める
        </Button>
      ) : null}
      {others.length > 0 ? (
        <Menu position="bottom-end" withinPortal>
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
