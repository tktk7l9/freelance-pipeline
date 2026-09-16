import { Stack, Text } from '@mantine/core'

/**
 * 単価・時給の 2 行表示。上段=太字、下段=dimmed の小さい字。表・カード・詳細・比較で共用。
 * size="xl" はホームの見出し数値と並べる用（上段 fz=28・下段 sm）。既定は変えない。
 */
export function RateLines({
  main,
  sub,
  align,
  size,
}: {
  main: string
  sub: string
  align?: 'left' | 'right'
  size?: 'md' | 'xl'
}) {
  return (
    <Stack gap={0} align={align === 'right' ? 'flex-end' : undefined}>
      <Text
        fw={700}
        fz={size === 'xl' ? 28 : undefined}
        ta={align === 'right' ? 'right' : undefined}
      >
        {main}
      </Text>
      <Text
        size={size === 'xl' ? 'sm' : 'xs'}
        c="dimmed"
        ta={align === 'right' ? 'right' : undefined}
      >
        {sub}
      </Text>
    </Stack>
  )
}
