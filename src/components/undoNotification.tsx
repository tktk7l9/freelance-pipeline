import { Button, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

/**
 * 「実行してから取り消せる」通知。確認ダイアログの代わりに使う（SHIG 57 黙って実行する／
 * 54 フールプルーフよりフェールセーフ）。不可逆な削除（案件ごと消す）だけは confirm を残す。
 */
export function showUndo({ message, onUndo }: { message: string; onUndo: () => Promise<void> }) {
  const id = `undo-${Date.now()}`
  notifications.show({
    id,
    autoClose: 8000,
    withCloseButton: true,
    message: (
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text size="sm">{message}</Text>
        <Button
          size="compact-xs"
          variant="light"
          onClick={async () => {
            notifications.update({ id, message: '戻しています…', loading: true, autoClose: false })
            try {
              await onUndo()
              notifications.update({
                id,
                message: '元に戻しました',
                loading: false,
                autoClose: 3000,
              })
            } catch {
              notifications.update({
                id,
                message: '戻せませんでした',
                color: 'red',
                loading: false,
                autoClose: 5000,
              })
            }
          }}
        >
          取り消す
        </Button>
      </Group>
    ),
  })
}
