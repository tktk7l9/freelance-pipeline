import { Alert, Button, Code, Group, Stack, Text, Title } from '@mantine/core'
import { Link, useRouter } from '@tanstack/react-router'
import { CircleAlert, House, RotateCw, SearchX } from 'lucide-react'

/**
 * Screen shown when loading failed.
 *
 * This is a ledger, so "could not fetch" is never silently shown as empty.
 * Mistaking an empty list for an unreadable one leads to wrong decisions.
 */
export function RouteErrorState({ error }: { error: unknown }) {
  const router = useRouter()
  // TanStack Router's errorComponent passes error as unknown (implementations do not always throw an Error).
  const message = error instanceof Error ? error.message : String(error)

  return (
    <Stack gap="lg" p="md">
      <Stack gap={4}>
        <Title order={1}>表示できませんでした</Title>
        <Text c="dimmed" size="sm">
          データの読み込みに失敗しました。表示されていない情報がある状態です。
        </Text>
      </Stack>

      <Alert
        variant="light"
        color="red"
        icon={<CircleAlert size={18} aria-hidden />}
        title="この画面の内容は信用しないでください"
      >
        一覧が空に見えても、データが無いとは限りません。読み直しても直らない場合は、
        時間をおくか、デプロイ直後であれば少し待ってから開いてください。
      </Alert>

      {message ? (
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            エラーの内容
          </Text>
          <Code block className="breakable">
            {message}
          </Code>
        </Stack>
      ) : null}

      <Group>
        <Button
          leftSection={<RotateCw size={16} aria-hidden />}
          onClick={() => router.invalidate()}
        >
          読み直す
        </Button>
        <Button
          variant="default"
          component={Link}
          to="/"
          leftSection={<House size={16} aria-hidden />}
        >
          ホームへ
        </Button>
      </Group>
    </Stack>
  )
}

/** When a URL that does not exist is opened. */
export function RouteNotFoundState() {
  return (
    <Stack gap="lg" p="md">
      <Stack gap={4}>
        <Title order={1}>見つかりません</Title>
        <Text c="dimmed" size="sm">
          指定されたページはありません。削除されたか、URL が違う可能性があります。
        </Text>
      </Stack>

      <Alert variant="light" color="gray" icon={<SearchX size={18} aria-hidden />}>
        案件やメモを削除したあとの古いリンクを開くと、この画面になります。
      </Alert>

      <Group>
        <Button component={Link} to="/" leftSection={<House size={16} aria-hidden />}>
          ホームへ
        </Button>
      </Group>
    </Stack>
  )
}
