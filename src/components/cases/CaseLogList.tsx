import { ActionIcon, Button, Group, Stack, Text, Textarea, Timeline, Title } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { CaseLogRow } from '../../db/schema'
import { describeLog, formatLogAt, sortLogNewestFirst } from '../../lib/caseLog'
import { formatJst } from '../../lib/jst'
import { showUndo } from '../undoNotification'
import { extractErrorMessage } from '../../lib/formError'
import { addCaseMemo, deleteCaseMemo } from '../../server/cases'

export function CaseLogList({
  caseId,
  log,
  today,
}: {
  caseId: string
  log: CaseLogRow[]
  today: string
}) {
  const router = useRouter()
  const add = useServerFn(addCaseMemo)
  const remove = useServerFn(deleteCaseMemo)
  const [body, setBody] = useState('')
  const [date, setDate] = useState<string>(today)
  const [saving, setSaving] = useState(false)
  const entries = sortLogNewestFirst(log)

  async function submit() {
    if (!body.trim()) return
    setSaving(true)
    try {
      await add({ data: { id: caseId, body, date } })
      setBody('')
      await router.invalidate()
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  /** 確認ダイアログは出さず、消してから「取り消す」で戻せるようにする（同じ本文・日付で足し直す） */
  async function handleDelete(entry: CaseLogRow) {
    try {
      await remove({ data: { id: entry.id } })
      await router.invalidate()
      showUndo({
        message: 'メモを削除しました',
        onUndo: async () => {
          await add({
            data: { id: caseId, body: entry.body, date: formatJst(entry.at, { withTime: false }) },
          })
          await router.invalidate()
        },
      })
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  return (
    <Stack gap="sm">
      <Title order={2}>経緯</Title>
      <Timeline bulletSize={14} lineWidth={2}>
        {entries.map((e) => (
          <Timeline.Item
            key={e.id}
            title={formatLogAt(e)}
            color={e.kind === 'status' ? 'indigo' : e.kind === 'import' ? 'gray' : 'teal'}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} className="breakable">
                {describeLog(e)}
              </Text>
              {e.kind === 'memo' ? (
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="メモを削除"
                  onClick={() => handleDelete(e)}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              ) : null}
            </Group>
          </Timeline.Item>
        ))}
      </Timeline>
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <DateInput
          label="日付"
          valueFormat="YYYY/MM/DD"
          value={date}
          onChange={(v) => setDate(v ?? today)}
        />
      </Group>
      <Textarea
        placeholder="例: 書類通過。面談日程の候補を返した"
        autosize
        minRows={2}
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        maxLength={4000}
      />
      <Button onClick={submit} loading={saving} disabled={!body.trim()} fullWidth>
        メモを追加
      </Button>
    </Stack>
  )
}
