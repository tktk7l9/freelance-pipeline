import { Stack, Text } from '@mantine/core'

/** 単価・時給の 2 行表示。上段=太字、下段=dimmed の小さい字。表・カード・詳細・比較で共用 */
export function RateLines({
  main,
  sub,
  align,
}: {
  main: string
  sub: string
  align?: 'left' | 'right'
}) {
  return (
    <Stack gap={0} align={align === 'right' ? 'flex-end' : undefined}>
      <Text fw={700} ta={align === 'right' ? 'right' : undefined}>
        {main}
      </Text>
      <Text size="xs" c="dimmed" ta={align === 'right' ? 'right' : undefined}>
        {sub}
      </Text>
    </Stack>
  )
}
