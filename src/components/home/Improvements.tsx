import { Anchor, Card, List, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

/** "Things to improve" on home. Written in settings, one item per line. Hidden if empty */
export function Improvements({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <Card withBorder padding="md">
      <Stack gap="xs">
        <Title order={2}>改善したいこと</Title>
        <List size="sm" spacing={6}>
          {items.map((item, i) => (
            <List.Item key={i}>{item}</List.Item>
          ))}
        </List>
        <Text size="xs" c="dimmed">
          <Anchor component={Link} to="/settings" size="xs">
            設定
          </Anchor>{' '}
          で書き換えられます。
        </Text>
      </Stack>
    </Card>
  )
}
