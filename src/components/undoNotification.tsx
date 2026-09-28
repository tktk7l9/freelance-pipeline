import { Button, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

/**
 * "Act now, undo later" notification. Used instead of confirm dialogs (SHIG 57: act silently /
 * 54: fail-safe over foolproof). Only irreversible deletion (deleting a whole case) keeps a confirm.
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
