import { Button, Card, Group, List, Stack, Text, Textarea, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { extractErrorMessage } from '../../lib/formError'
import { linesToImprovements } from '../../lib/improvements'
import { saveImprovements } from '../../server/settings'

/** ホームに出す「改善したいこと」。Textarea で 1 行 1 項目 */
export function ImprovementsCard({
  value,
  editing,
  onEdit,
  onClose,
}: {
  value: string[]
  editing: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const save = useServerFn(saveImprovements)
  const [text, setText] = useState(value.join('\n'))
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setText(value.join('\n'))
    onEdit()
  }

  async function submit() {
    setSaving(true)
    try {
      await save({ data: { items: linesToImprovements(text) } })
      await router.invalidate()
      notifications.show({ message: '改善したいことを保存しました' })
      onClose()
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2}>改善したいこと</Title>
          {!editing ? (
            <Button
              variant="default"
              size="xs"
              leftSection={<Pencil size={14} aria-hidden />}
              onClick={startEdit}
            >
              編集
            </Button>
          ) : null}
        </Group>
        <Text size="sm" c="dimmed">
          ホームの先頭近くに箇条書きで出る。1 行 1 項目。
        </Text>
        {!editing ? (
          value.length === 0 ? (
            <Text size="sm" c="dimmed">
              未入力。
            </Text>
          ) : (
            <List size="sm" spacing={4}>
              {value.map((v, i) => (
                <List.Item key={i}>{v}</List.Item>
              ))}
            </List>
          )
        ) : (
          <Stack gap="sm">
            <Textarea
              autosize
              minRows={6}
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder={
                '例: 商談の前に基礎用語を一言で言える状態にする\n例: 契約更新のたびに単価を交渉する'
              }
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={submit} loading={saving}>
                保存
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
