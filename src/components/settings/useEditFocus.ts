import { useEffect, useRef } from 'react'

/** A date field is skipped: focusing it pops its calendar open before the owner asked for one */
const FIRST_FIELD = 'input:not([type="hidden"], [data-dates-input]), textarea, select'

/**
 * Focus for a settings card that swaps its "編集" button for an inline form.
 *
 * Pressing "編集" removes the button that had focus, and saving or cancelling removes the form, so
 * focus used to fall to <body> both ways: a keyboard user started over from the top of the page.
 * Opening moves focus to the form's first field (skipping date fields); closing returns it to "編集" (SHIG 94, WCAG 2.4.3).
 * Nothing moves on the first render, so loading the page never steals focus.
 */
export function useEditFocus<Form extends HTMLElement>(editing: boolean) {
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const formRef = useRef<Form>(null)
  const previous = useRef(editing)

  useEffect(() => {
    if (previous.current === editing) return
    previous.current = editing
    if (editing) {
      formRef.current?.querySelector<HTMLElement>(FIRST_FIELD)?.focus()
      return
    }
    // Only reclaim focus that was lost with the form; leave it alone if the owner already moved on
    const active = document.activeElement
    if (active === null || active === document.body) editButtonRef.current?.focus()
  }, [editing])

  return { editButtonRef, formRef }
}
