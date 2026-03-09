/**
 * Reusable Svelte 5 attachment for inline rename inputs.
 *
 * Encapsulates: autofocus + select, blur-to-save (cancel-safe),
 * Enter-to-save, Escape-to-cancel, and keydown stopPropagation
 * (prevents Collapsible.Trigger from intercepting Space).
 */
export function useInlineRename(opts: { onSave: () => void; onCancel: () => void }) {
  let cancelled = false

  function ref(element: HTMLInputElement) {
    cancelled = false
    element.focus()
    element.select()

    function handleBlur() {
      if (!cancelled) opts.onSave()
    }

    function handleKeydown(e: KeyboardEvent) {
      e.stopPropagation()
      if (e.key === 'Enter') opts.onSave()
      if (e.key === 'Escape') {
        cancelled = true
        opts.onCancel()
      }
    }

    element.addEventListener('blur', handleBlur)
    element.addEventListener('keydown', handleKeydown)

    return () => {
      element.removeEventListener('blur', handleBlur)
      element.removeEventListener('keydown', handleKeydown)
    }
  }

  return { ref }
}
