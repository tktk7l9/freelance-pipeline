import { Stack, Text } from '@mantine/core'

/**
 * Two-line display of rate and hourly rate. Top line bold, bottom line small and dimmed. Shared by table, card, detail, and compare.
 * size="xl" is for sitting next to the home heading numbers (top fz=28, bottom sm). The default is unchanged.
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
