import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  TagsInput,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import type { Case } from '../../db/schema'
import { parseMonthOrDateInput } from '../../lib/dates'
import { REMOTE_LABEL, REMOTE_TYPES, ROUTES, ROUTE_LABEL } from '../../lib/enums'
import { extractFormError } from '../../lib/formError'
import { saveCase } from '../../server/cases'

/** フォームは税込で入力する。NumberInput の空欄は '' で来るので送信時に null へ */
type Num = number | ''
type Values = {
  company: string
  title: string
  companyUrl: string
  route: Case['route']
  agentName: string
  monthlyMax: Num
  monthlyMin: Num
  settlementMinH: Num
  settlementMaxH: Num
  remoteType: Case['remoteType']
  onsiteNote: string
  startDate: string
  endDate: string
  daysPerWeek: string
  workLocation: string
  supplyChain: string
  paymentSiteDays: Num
  sourceUrl: string
  mustSkills: string[]
  niceSkills: string[]
  rawText: string
  fitScores: Num[]
  actualMonthlyIncl: Num
  note: string
}

const n = (v: Num) => (v === '' ? null : v)
const s = (v: string) => v.trim() || null

export function CaseForm({
  item,
  companyUrl = null,
  axes,
  onSaved,
}: {
  item: Case | null
  /** 会社の公式サイト（companies 表）。案件の列ではないので別に受ける */
  companyUrl?: string | null
  axes: string[]
  onSaved: (id: string) => void
}) {
  const router = useRouter()
  const save = useServerFn(saveCase)
  const [saving, setSaving] = useState(false)
  const form = useForm<Values>({
    initialValues: {
      company: item?.company ?? '',
      companyUrl: companyUrl ?? '',
      title: item?.title ?? '',
      route: item?.route ?? 'findy',
      agentName: item?.agentName ?? '',
      monthlyMax: item?.monthlyMaxIncl ?? '',
      monthlyMin: item?.monthlyMinIncl ?? '',
      settlementMinH: item?.settlementMinH ?? '',
      settlementMaxH: item?.settlementMaxH ?? '',
      remoteType: item?.remoteType ?? 'full',
      onsiteNote: item?.onsiteNote ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      daysPerWeek: item?.daysPerWeek ?? '',
      workLocation: item?.workLocation ?? '',
      supplyChain: item?.supplyChain ?? '',
      paymentSiteDays: item?.paymentSiteDays ?? '',
      sourceUrl: item?.sourceUrl ?? '',
      mustSkills: item?.mustSkills ?? [],
      niceSkills: item?.niceSkills ?? [],
      rawText: item?.rawText ?? '',
      fitScores: axes.map((_, i) => item?.fitScores?.[i] ?? ''),
      actualMonthlyIncl: item?.actualMonthlyIncl ?? '',
      note: item?.note ?? '',
    },
    validate: {
      company: (v) => (v.trim() ? null : '企業名は必須です'),
      title: (v) => (v.trim() ? null : '案件名は必須です'),
      monthlyMax: (v) => (v === '' ? '単価上限は必須です' : null),
      startDate: (v) =>
        parseMonthOrDateInput(v) ? null : '2030/11 や 2030/11/16 の形で入れてください',
      endDate: (v) =>
        v.trim() === '' || parseMonthOrDateInput(v)
          ? null
          : '2030/12 や 2030/12/31 の形で入れてください',
      rawText: (v) => (v.trim() ? null : '原文は必須です'),
    },
  })

  async function submit(v: Values) {
    setSaving(true)
    try {
      const scores = v.fitScores.map(n)
      const { id } = await save({
        data: {
          id: item?.id ?? null,
          values: {
            company: v.company,
            companyUrl: s(v.companyUrl),
            title: v.title,
            route: v.route,
            agentName: s(v.agentName),
            monthlyMax: v.monthlyMax === '' ? 0 : v.monthlyMax,
            monthlyMin: n(v.monthlyMin),
            taxBasis: 'incl',
            settlementMinH: n(v.settlementMinH),
            settlementMaxH: n(v.settlementMaxH),
            remoteType: v.remoteType,
            onsiteNote: s(v.onsiteNote),
            startDate: parseMonthOrDateInput(v.startDate) ?? v.startDate,
            endDate: parseMonthOrDateInput(v.endDate),
            daysPerWeek: s(v.daysPerWeek),
            workLocation: s(v.workLocation),
            supplyChain: s(v.supplyChain),
            paymentSiteDays: n(v.paymentSiteDays),
            sourceUrl: s(v.sourceUrl),
            mustSkills: v.mustSkills,
            niceSkills: v.niceSkills,
            rawText: v.rawText,
            status: item?.status ?? 'saved',
            nextAction: item?.nextAction ?? null,
            nextActionDue: item?.nextActionDue ?? null,
            fitScores: scores.every((x) => x === null) ? null : scores.map((x) => x ?? 0),
            actualMonthlyIncl: n(v.actualMonthlyIncl),
            note: s(v.note),
          },
        },
      })
      await router.invalidate()
      notifications.show({ message: item ? '更新しました' : '登録しました' })
      onSaved(id)
    } catch (e) {
      const { message, path } = extractFormError(e)
      if (path && path in form.values) form.setFieldError(path, message)
      else notifications.show({ message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="md">
        <TextInput label="企業名" required {...form.getInputProps('company')} />
        <TextInput
          label="会社の公式サイト（同じ会社の案件すべてに効く）"
          type="url"
          placeholder="https://"
          {...form.getInputProps('companyUrl')}
        />
        <TextInput label="案件名" required {...form.getInputProps('title')} />
        <Group grow>
          <Select
            label="経路"
            data={ROUTES.map((r) => ({ value: r, label: ROUTE_LABEL[r] }))}
            {...form.getInputProps('route')}
          />
          <TextInput label="担当エージェント" {...form.getInputProps('agentName')} />
        </Group>
        <Title order={3}>条件（金額は税込）</Title>
        <Group grow>
          <NumberInput
            label="単価上限（税込・円）"
            required
            min={1}
            thousandSeparator=","
            {...form.getInputProps('monthlyMax')}
          />
          <NumberInput
            label="単価下限（税込・円）"
            min={1}
            thousandSeparator=","
            {...form.getInputProps('monthlyMin')}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="精算 下限（h）"
            min={1}
            max={400}
            {...form.getInputProps('settlementMinH')}
          />
          <NumberInput
            label="精算 上限（h）"
            min={1}
            max={400}
            {...form.getInputProps('settlementMaxH')}
          />
        </Group>
        <Group grow>
          <Select
            label="リモート"
            data={REMOTE_TYPES.map((r) => ({ value: r, label: REMOTE_LABEL[r] }))}
            {...form.getInputProps('remoteType')}
          />
          <TextInput
            label="出社の実態"
            placeholder="例: 月4回出社"
            {...form.getInputProps('onsiteNote')}
          />
        </Group>
        <Group grow>
          <TextInput label="開始（月だけでも可）" required {...form.getInputProps('startDate')} />
          <TextInput label="終了（月だけでも可）" {...form.getInputProps('endDate')} />
        </Group>
        <Group grow>
          <TextInput label="稼働" placeholder="例: 週4〜5" {...form.getInputProps('daysPerWeek')} />
          <TextInput label="作業場所" {...form.getInputProps('workLocation')} />
        </Group>
        <Group grow>
          <TextInput label="商流" {...form.getInputProps('supplyChain')} />
          <NumberInput
            label="支払サイト（日）"
            min={0}
            max={365}
            {...form.getInputProps('paymentSiteDays')}
          />
        </Group>
        <TextInput label="案件 URL" type="url" {...form.getInputProps('sourceUrl')} />
        <TagsInput
          label="必須スキル"
          splitChars={[',', '、']}
          {...form.getInputProps('mustSkills')}
        />
        <TagsInput
          label="歓迎スキル"
          splitChars={[',', '、']}
          {...form.getInputProps('niceSkills')}
        />
        {axes.length > 0 ? (
          <>
            <Title order={3}>軸（0〜2）</Title>
            <Group grow>
              {axes.map((axis, i) => (
                <NumberInput
                  key={axis}
                  label={axis}
                  min={0}
                  max={2}
                  {...form.getInputProps(`fitScores.${i}`)}
                />
              ))}
            </Group>
          </>
        ) : null}
        <NumberInput
          label="実単価（税込・参画した案件）"
          min={1}
          thousandSeparator=","
          {...form.getInputProps('actualMonthlyIncl')}
        />
        <Textarea label="判断メモ" autosize minRows={2} {...form.getInputProps('note')} />
        <Textarea
          label="原文"
          required
          autosize
          minRows={6}
          maxRows={20}
          className="rawtext"
          {...form.getInputProps('rawText')}
        />
        <Button type="submit" loading={saving} fullWidth>
          保存
        </Button>
      </Stack>
    </form>
  )
}
