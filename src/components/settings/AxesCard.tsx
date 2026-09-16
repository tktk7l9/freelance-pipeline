import { Badge, Button, Card, Group, Stack, TagsInput, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { extractErrorMessage } from '../../lib/formError'
import { saveAxes } from '../../server/settings'

export function AxesCard({
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
  const save = useServerFn(saveAxes)
  const [axisValues, setAxisValues] = useState<string[]>(value)
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setAxisValues(value)
    onEdit()
  }

  function cancel() {
    setAxisValues(value)
    onClose()
  }

  async function submit() {
    setSaving(true)
    try {
      await save({ data: { axes: axisValues } })
      await router.invalidate()
      notifications.show({ message: '軸を保存しました' })
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
          <Title order={2}>比較の軸</Title>
          {!editing ? (
            <Button
              variant="default"
              size="xs"
              leftSection={<Pencil size={14} />}
              onClick={startEdit}
            >
              編集
            </Button>
          ) : null}
        </Group>
        <Text size="sm" c="dimmed">
          案件ごとに 0〜2 で付ける観点。順番は比較表の行順。
        </Text>
        {!editing ? (
          <Group gap="xs">
            {value.length === 0 ? (
              <Text size="sm" c="dimmed">
                —
              </Text>
            ) : (
              value.map((a) => (
                <Badge key={a} variant="light">
                  {a}
                </Badge>
              ))
            )}
          </Group>
        ) : (
          <Stack gap="sm">
            <TagsInput
              label="軸"
              value={axisValues}
              onChange={setAxisValues}
              placeholder="入力して Enter"
              maxTags={10}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={cancel} disabled={saving}>
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
