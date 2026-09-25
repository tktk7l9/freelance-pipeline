import { Anchor, Container, Stack, Text, Title, VisuallyHidden } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

/**
 * ページの外枠。タブのページ（ホーム・案件・比較・予定・設定）の見出しは支援技術にだけ
 * 伝えて画面には出さない（下タブ／左ナビのラベルと同じ文言で冗長になり、スマホでは
 * 一等地を使いすぎるため。所有者の要望、2026-09-25）。見出し階層（h1）は保つ。
 * 案件詳細のように見出しそのものが中身のページは `heading` で画面にも出す。
 */
export function PageShell({
  title,
  back,
  heading = false,
  description,
  actions,
  fab = false,
  wide = false,
  children,
}: {
  title: string
  /** 上の階層へ戻るリンク。ホーム画面に追加した PWA にはブラウザの戻るが無いので、
   * 詳細・取込のような階層の深いページには必ず置く */
  back?: { to: '/' | '/cases' | '/calendar' | '/settings'; label: string }
  /** true なら見出しと説明文を画面に出す（案件詳細など、見出しが中身のページ） */
  heading?: boolean
  /** heading のときだけ使う */
  description?: React.ReactNode
  /** 見出しの右に置く操作（デスクトップ用。スマホは FAB を使う） */
  actions?: React.ReactNode
  /** このページが <Fab> を出すか。true なら最後のカードが隠れないよう下に余白を足す */
  fab?: boolean
  /** 表を出すページ。読み物の幅（sm）だと列が潰れるので、広い方（lg）に広げる */
  wide?: boolean
  children?: React.ReactNode
}) {
  return (
    <Container size={wide ? 'lg' : 'sm'} px={0} className={fab ? 'fab-clearance' : undefined}>
      {/* 見出しと中身の間は 24px（セクション間と同じ）。見出しの中は 4px で束ねる */}
      <Stack gap="lg">
        {back ? (
          <Anchor
            component={Link}
            to={back.to}
            size="sm"
            c="dimmed"
            underline="never"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              alignSelf: 'flex-start',
            }}
          >
            <ArrowLeft size={16} aria-hidden />
            {back.label}
          </Anchor>
        ) : null}
        {heading ? (
          <Stack gap={4}>
            <Title order={1}>{title}</Title>
            {description ? (
              <Text c="dimmed" size="sm">
                {description}
              </Text>
            ) : null}
            {actions ? <Stack pt={4}>{actions}</Stack> : null}
          </Stack>
        ) : (
          <>
            <VisuallyHidden>
              <Title order={1}>{title}</Title>
            </VisuallyHidden>
            {actions ? <Stack>{actions}</Stack> : null}
          </>
        )}
        {children}
      </Stack>
    </Container>
  )
}
