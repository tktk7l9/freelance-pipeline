import { Button, Card, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { Row } from '../DetailRow'
import { t } from './formValues'
import { FILING_TYPE_LABEL, type BusinessInfo } from '../../lib/business'
import { extractErrorMessage } from '../../lib/formError'
import { formatDateSlash } from '../../lib/format'
import { saveBusiness } from '../../server/settings'

type BusinessValues = {
  birthDate: string
  openedOn: string
  occupation: string
  description: string
  filingType: string
  taxOffice: string
  taxAddress: string
  invoiceNumber: string
  invoiceRegisteredOn: string
  etaxUserId: string
  businessNumber: string
}

const toBusinessValues = (b: BusinessInfo): BusinessValues => ({
  birthDate: b.birthDate ?? '',
  openedOn: b.openedOn ?? '',
  occupation: b.occupation ?? '',
  description: b.description ?? '',
  filingType: b.filingType ?? '',
  taxOffice: b.taxOffice ?? '',
  taxAddress: b.taxAddress ?? '',
  invoiceNumber: b.invoiceNumber ?? '',
  invoiceRegisteredOn: b.invoiceRegisteredOn ?? '',
  etaxUserId: b.etaxUserId ?? '',
  businessNumber: b.businessNumber ?? '',
})

export function BusinessCard({
  value,
  editing,
  onEdit,
  onClose,
}: {
  value: BusinessInfo
  editing: boolean
  onEdit: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const save = useServerFn(saveBusiness)
  const [saving, setSaving] = useState(false)
  const form = useForm<BusinessValues>({ initialValues: toBusinessValues(value) })

  function startEdit() {
    form.setValues(toBusinessValues(value))
    onEdit()
  }

  function cancel() {
    form.setValues(toBusinessValues(value))
    onClose()
  }

  async function submit(v: BusinessValues) {
    setSaving(true)
    try {
      await save({
        data: {
          birthDate: t(v.birthDate),
          openedOn: t(v.openedOn),
          occupation: t(v.occupation),
          description: t(v.description),
          filingType: v.filingType === 'blue' || v.filingType === 'white' ? v.filingType : null,
          taxOffice: t(v.taxOffice),
          taxAddress: t(v.taxAddress),
          invoiceNumber: t(v.invoiceNumber),
          invoiceRegisteredOn: t(v.invoiceRegisteredOn),
          etaxUserId: t(v.etaxUserId),
          businessNumber: t(v.businessNumber),
        },
      })
      await router.invalidate()
      notifications.show({ message: '事業者情報を保存しました' })
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
          <Title order={2}>事業者情報</Title>
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
          確定申告・請求書まわりの基礎情報。
        </Text>
        {!editing && Object.values(value).every((v) => v === null) ? (
          <Text size="sm" c="dimmed">
            未入力。「編集」から入れると、ここに一覧で出ます。
          </Text>
        ) : !editing ? (
          <Stack gap="xs">
            <Row label="生年月日" value={formatDateSlash(value.birthDate)} />
            <Row label="開業日" value={formatDateSlash(value.openedOn)} />
            <Row label="職業" value={value.occupation} />
            <Row label="事業概要" value={value.description} />
            <Row
              label="申告区分"
              value={value.filingType ? FILING_TYPE_LABEL[value.filingType] : null}
            />
            <Row label="所轄税務署" value={value.taxOffice} />
            <Row label="納税地の住所" value={value.taxAddress} />
            <Row label="適格請求書発行事業者登録番号" value={value.invoiceNumber} />
            <Row label="登録年月日" value={formatDateSlash(value.invoiceRegisteredOn)} />
            <Row label="e-Tax 利用者識別番号" value={value.etaxUserId} />
            <Row label="事業者番号" value={value.businessNumber} />
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(submit)}>
            <Stack gap="sm">
              <DateInput
                label="生年月日（市場データで自分の年齢帯を出すのに使う）"
                valueFormat="YYYY/MM/DD"
                clearable
                {...form.getInputProps('birthDate')}
                value={form.values.birthDate || null}
                onChange={(v) => form.setFieldValue('birthDate', v ?? '')}
              />
              <Group grow>
                <DateInput
                  label="開業日"
                  valueFormat="YYYY/MM/DD"
                  clearable
                  {...form.getInputProps('openedOn')}
                  value={form.values.openedOn || null}
                  onChange={(v) => form.setFieldValue('openedOn', v ?? '')}
                />
                <Select
                  label="申告区分"
                  data={[
                    { value: 'blue', label: FILING_TYPE_LABEL.blue },
                    { value: 'white', label: FILING_TYPE_LABEL.white },
                  ]}
                  clearable
                  value={form.values.filingType || null}
                  onChange={(v) => form.setFieldValue('filingType', v ?? '')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="職業"
                  placeholder="例: ソフトウェア開発"
                  {...form.getInputProps('occupation')}
                />
                <TextInput
                  label="事業概要"
                  placeholder="事業の概要"
                  {...form.getInputProps('description')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="所轄税務署"
                  placeholder="◯◯税務署"
                  {...form.getInputProps('taxOffice')}
                />
                <TextInput label="納税地の住所" {...form.getInputProps('taxAddress')} />
              </Group>
              <Group grow>
                <TextInput
                  label="適格請求書発行事業者登録番号"
                  placeholder="T1234567890123"
                  {...form.getInputProps('invoiceNumber')}
                />
                <DateInput
                  label="登録年月日"
                  valueFormat="YYYY/MM/DD"
                  clearable
                  {...form.getInputProps('invoiceRegisteredOn')}
                  value={form.values.invoiceRegisteredOn || null}
                  onChange={(v) => form.setFieldValue('invoiceRegisteredOn', v ?? '')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="e-Tax 利用者識別番号"
                  placeholder="1234567890123456"
                  {...form.getInputProps('etaxUserId')}
                />
                <TextInput label="事業者番号" {...form.getInputProps('businessNumber')} />
              </Group>
              <Group justify="flex-end">
                <Button variant="default" onClick={cancel} disabled={saving}>
                  キャンセル
                </Button>
                <Button type="submit" loading={saving}>
                  保存
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </Card>
  )
}
