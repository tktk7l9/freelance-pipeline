import { Button, Group, Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import {
  CASE_STATUSES,
  STATUS_LABEL,
  canTransition,
  isTerminal,
  type CaseStatus,
} from '../../lib/status'
import { changeCaseStatus } from '../../server/cases'

export function StatusChanger({ id, status }: { id: string; status: CaseStatus }) {
  const router = useRouter()
  const change = useServerFn(changeCaseStatus)
  const [to, setTo] = useState<CaseStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const options = CASE_STATUSES.filter((s) => canTransition(status, s)).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  }))

  async function submit() {
    if (!to) return
    if (
      isTerminal(to) &&
      !window.confirm(`「${STATUS_LABEL[to]}」にすると戻せません。よいですか？`)
    )
      return
    setSaving(true)
    try {
      const r = await change({ data: { id, to } })
      if (!r.ok) {
        notifications.show({ message: 'この遷移はできません', color: 'red' })
        return
      }
      setTo(null)
      await router.invalidate()
      notifications.show({ message: `${STATUS_LABEL[to]} にしました` })
    } catch {
      notifications.show({ message: '変更できませんでした', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  if (options.length === 0) return null
  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <Select
        label="ステータスを変更"
        placeholder="次の状態"
        data={options}
        value={to}
        onChange={(v) => setTo(v as CaseStatus | null)}
        style={{ flex: 1 }}
      />
      <Button onClick={submit} loading={saving} disabled={!to}>
        変更
      </Button>
    </Group>
  )
}
