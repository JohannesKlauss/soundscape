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
