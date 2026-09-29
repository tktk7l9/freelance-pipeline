import { Button, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

import { focusAfterSave } from '../lib/nextAction'

/**
 * "Act now, undo later" notification. Used instead of confirm dialogs (SHIG 57: act silently /
 * 54: fail-safe over foolproof). Only irreversible deletion (deleting a whole case) keeps a confirm.
 */
export function showUndo({ message, onUndo }: { message: string; onUndo: () => Promise<void> }) {
  const id = `undo-${Date.now()}`
  // Pressing "取り消す" replaces the button with a status message, which drops keyboard focus to
  // <body>. Once the undo settles, put focus back where it settled after the action, or else where it
  // came from on its way to "取り消す" (SHIG 94).
  // "Settled": the element focused right now may be about to go away (a menu item, a button that is
  // disabled while saving), so while it is one of those, the next focus move replaces it (e.g. the
  // page moving focus to the next-step field after a status change)
  let actedFrom = document.activeElement
  let cameFrom: Element | null = null
  // A form field re-rendered by the undo is a new element; find it again by its form path
  const usable = (el: Element | null): Element | null => {
    if (el === null || el === document.body) return null
    if (el.isConnected) return el
    const path = el.getAttribute('data-path')
    return path ? document.querySelector(`[data-path="${CSS.escape(path)}"]`) : null
  }
  // Elements that will not survive the action: an open menu or list closes, a saving button is disabled
  const transient = (el: Element | null) =>
    el === null ||
    el === document.body ||
    !el.isConnected ||
    el.closest('[role="menu"], [role="listbox"]') !== null ||
    el.matches(':disabled, [data-loading]')
  const settle = (e: FocusEvent) => {
    if (!transient(actedFrom)) {
      document.removeEventListener('focusin', settle)
      return
    }
    if (e.target instanceof Element) actedFrom = e.target
  }
  document.addEventListener('focusin', settle)
  function restoreFocus() {
    document.removeEventListener('focusin', settle)
    const target = focusAfterSave<Element>({
      active: document.activeElement,
      body: document.body,
      before: usable(actedFrom),
      beforeUsable: usable(actedFrom) !== null,
      fallback: usable(cameFrom),
    })
    if (target instanceof HTMLElement) target.focus({ preventScroll: true })
  }
  notifications.show({
    id,
    autoClose: 8000,
    withCloseButton: true,
    onClose: () => document.removeEventListener('focusin', settle),
    message: (
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text size="sm">{message}</Text>
        {/* 30px tall: a 7mm touch target (SHIG 78) */}
        <Button
          size="xs"
          variant="light"
          style={{ flexShrink: 0 }}
          onFocus={(e) => {
            if (e.relatedTarget instanceof Element) cameFrom = e.relatedTarget
          }}
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
            restoreFocus()
          }}
        >
          取り消す
        </Button>
      </Group>
    ),
  })
}
