const MIME_TYPE = 'application/x-dnd-data'

export interface UseDraggableOptions<T = unknown> {
  id: string
  data?: T
}

export interface UseDraggableReturn {
  ref: (element: HTMLElement) => void | (() => void)
  isDragging: { current: boolean }
  dragInstanceId: string
}

// Offscreen element to hide default drag preview
let emptyEl: HTMLDivElement | null = null
function getEmptyElement(): HTMLDivElement {
  if (!emptyEl) {
    emptyEl = document.createElement('div')
    emptyEl.style.position = 'absolute'
    emptyEl.style.top = '-9999px'
    emptyEl.style.left = '-9999px'
    emptyEl.style.width = '1px'
    emptyEl.style.height = '1px'
    document.body.appendChild(emptyEl)
  }
  return emptyEl
}

export function useDraggable<T>(
  options: UseDraggableOptions<T>,
): UseDraggableReturn {
  const dragInstanceId = crypto.randomUUID()
  const isDragging = $state({ current: false })

  function ref(element: HTMLElement): (() => void) | void {
    element.draggable = true
    element.style.cursor = 'grab'

    function handleDragStart(e: DragEvent) {
      if (!e.dataTransfer) return

      const payload = JSON.stringify({ id: options.id, data: options.data })
      e.dataTransfer.setData(MIME_TYPE, payload)
      e.dataTransfer.effectAllowed = 'move'

      e.dataTransfer.setDragImage(getEmptyElement(), 0, 0)

      isDragging.current = true

      document.dispatchEvent(
        new CustomEvent('dnd:dragstart', {
          detail: { dragInstanceId, id: options.id, data: options.data },
        }),
      )
    }

    function handleDragEnd() {
      isDragging.current = false

      document.dispatchEvent(
        new CustomEvent('dnd:dragend', {
          detail: { dragInstanceId },
        }),
      )
    }

    element.addEventListener('dragstart', handleDragStart)
    element.addEventListener('dragend', handleDragEnd)

    return () => {
      element.removeEventListener('dragstart', handleDragStart)
      element.removeEventListener('dragend', handleDragEnd)
    }
  }

  return {
    ref,
    isDragging,
    dragInstanceId,
  }
}
