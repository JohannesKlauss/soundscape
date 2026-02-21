const MIME_TYPE = 'application/x-dnd-data'

export interface UseDroppableOptions<T = unknown> {
  id: string
  onDrop?: (data: T) => void
  onDragEnter?: (data: T) => void
  onDragLeave?: () => void
}

export interface UseDroppableReturn {
  ref: (element: HTMLElement) => void | (() => void)
  isDropTarget: { current: boolean }
}

function parseData<T>(e: DragEvent): T | null {
  try {
    const raw = e.dataTransfer?.getData(MIME_TYPE)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.data as T
  } catch {
    return null
  }
}

export function useDroppable<T>(
  options: UseDroppableOptions<T>,
): UseDroppableReturn {
  const isDropTarget = $state({ current: false })
  let dragEnterCount = 0

  function ref(element: HTMLElement): (() => void) | void {
    function handleDragOver(e: DragEvent) {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move'
      }
    }

    function handleDragEnter(e: DragEvent) {
      e.preventDefault()
      dragEnterCount++

      if (dragEnterCount === 1) {
        isDropTarget.current = true
        const data = parseData<T>(e)
        if (data && options.onDragEnter) {
          options.onDragEnter(data)
        }
      }
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault()
      dragEnterCount--

      if (dragEnterCount === 0) {
        isDropTarget.current = false
        if (options.onDragLeave) {
          options.onDragLeave()
        }
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault()

      dragEnterCount = 0
      isDropTarget.current = false

      const data = parseData<T>(e)

      if (data && options.onDrop) {
        options.onDrop?.(data)
      }
    }

    element.addEventListener('dragover', handleDragOver)
    element.addEventListener('dragenter', handleDragEnter)
    element.addEventListener('dragleave', handleDragLeave)
    element.addEventListener('drop', handleDrop)

    return () => {
      element.removeEventListener('dragover', handleDragOver)
      element.removeEventListener('dragenter', handleDragEnter)
      element.removeEventListener('dragleave', handleDragLeave)
      element.removeEventListener('drop', handleDrop)
    }
  }

  return {
    ref,
    isDropTarget,
  }
}
