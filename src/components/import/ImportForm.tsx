import { Alert, Button, Card, Code, Stack, Text, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'

import { Row } from '../DetailRow'
import { RateLines } from '../cases/RateLines'
import { CASE_JSON_EXAMPLE, parseCaseJson, toCaseRow } from '../../lib/caseInput'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatDateSlash } from '../../lib/format'
import { formatRateLines } from '../../lib/rate'
import { importCase } from '../../server/cases'

export function ImportForm({ onSaved }: { onSaved: (id: string) => void }) {
  const save = useServerFn(importCase)
  const [json, setJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string; company: string; title: string } | null>(
    null,
  )
  const parsed = useMemo(() => (json.trim() ? parseCaseJson(json) : null), [json])
  const preview = parsed?.ok ? toCaseRow(parsed.input) : null
  const rateLines = preview ? formatRateLines(preview.monthlyMaxIncl, preview.monthlyMinIncl) : null

  async function submit() {
    setSaving(true)
    setDuplicate(null)
    try {
      const r = await save({ data: { json } })
      if (r.ok) {
        notifications.show({ message: '登録しました' })
        onSaved(r.id)
        return
      }
      if ('duplicate' in r) setDuplicate(r.duplicate ?? null)
      else
        notifications.show({
          message: '検証に失敗しました（内容を確認してください）',
          color: 'red',
        })
    } catch {
      notifications.show({ message: '保存できませんでした', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap="md">
      <Textarea
        label="案件票の JSON"
        description="Claude Code が出した JSON をそのまま貼る。金額は案件票の表示のまま、taxBasis で税込/税抜を宣言"
        placeholder={CASE_JSON_EXAMPLE}
        autosize
        minRows={8}
        maxRows={24}
        className="rawtext"
        value={json}
        onChange={(e) => setJson(e.currentTarget.value)}
      />
      {parsed && !parsed.ok ? (
        <Alert color="red" title="検証エラー">
          <Stack gap={2}>
            {parsed.issues.map((i, n) => (
              <Text key={n} size="sm">
                <Code>{i.path || '(root)'}</Code> {i.message}
              </Text>
            ))}
          </Stack>
        </Alert>
      ) : null}
      {preview ? (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Row label="企業 / 案件" value={`${preview.company} / ${preview.title}`} />
            <Row label="経路" value={ROUTE_LABEL[preview.route]} />
            <Row
              label="税込上限"
              value={
                rateLines ? (
                  <RateLines
                    main={rateLines.main}
                    sub={`${rateLines.sub}（案件票は${preview.sourceTaxBasis === 'excl' ? '税抜' : '税込'}表示）`}
                    align="right"
                  />
                ) : null
              }
            />
            <Row
              label="リモート"
              value={`${REMOTE_LABEL[preview.remoteType]}${preview.onsiteNote ? `（${preview.onsiteNote}）` : ''}`}
            />
            <Row label="開始" value={formatDateSlash(preview.startDate)} />
            <Row label="必須" value={preview.mustSkills.join('、') || '—'} />
            <Row label="原文" value={`${preview.rawText.length.toLocaleString('ja-JP')} 文字`} />
          </Stack>
        </Card>
      ) : null}
      {duplicate ? (
        <Alert color="orange" title="同じ案件が既にあります">
          <Link to="/cases/$id" params={{ id: duplicate.id }}>
            {duplicate.company} / {duplicate.title} を開く
          </Link>
        </Alert>
      ) : null}
      <Button onClick={submit} loading={saving} disabled={!preview} fullWidth>
        この内容で登録
      </Button>
    </Stack>
  )
}
