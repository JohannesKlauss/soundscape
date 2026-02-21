const MIME_TYPE = 'application/x-dnd-sortable'

export interface UseSortableOptions<T> {
  id: string
  get items(): T[]
  onSort: (items: T[]) => void
}

export interface UseSortableReturn {
  containerRef: (element: HTMLElement) => (() => void) | void
  activeIndex: { current: number }
  overIndex: { current: number }
  previewIndex: { current: number }
}

export function useSortable<T>(
  options: UseSortableOptions<T>,
): UseSortableReturn {
  const activeIndex = $state<{ current: number }>({ current: -1 })
  const overIndex = $state<{ current: number }>({ current: -1 })
  const previewIndex = $state<{ current: number }>({ current: -1 })

  function containerRef(container: HTMLElement): (() => void) | void {
    let draggedIndex = -1
    let currentPreviewIndex = -1
    let children: HTMLElement[] = []
    let itemHeights: number[] = []
    let itemTops: number[] = [] // Original top positions (without transforms)
    let dropHandled = false // Flag to indicate drop was successful

    function updateChildren() {
      children = Array.from(container.children) as HTMLElement[]
      children.forEach((child, index) => {
        child.draggable = true
        child.dataset.sortableIndex = String(index)
        // Ensure smooth transitions for transforms
        child.style.transition = 'transform 200ms ease'
      })
      // Cache item heights for transform calculations
      itemHeights = children.map((child) => child.offsetHeight)
    }

    // Initial setup
    updateChildren()

    // Observe for child changes
    const observer = new MutationObserver(() => {
      updateChildren()
    })
    observer.observe(container, { childList: true })

    function updatePreviewPositions() {
      if (draggedIndex === -1) {
        // Reset all transforms
        children.forEach((child) => {
          child.style.transform = ''
        })
        return
      }

      const draggedHeight = itemHeights[draggedIndex] || 0
      const computedStyle = getComputedStyle(container)
      const gap = parseFloat(computedStyle.gap) || 0
      const shiftAmount = draggedHeight + gap

      const targetIndex =
        currentPreviewIndex === -1 ? draggedIndex : currentPreviewIndex

      // The dragged element stays in place (visibility: hidden) keeping its space.
      // We shift other elements to show where the dragged item would go.
      //
      // If dragging item from index 1 to index 0:
      //   - Item 0 should move DOWN (to make room at position 0)
      // If dragging item from index 0 to index 2:
      //   - Item 1 and 2 should move UP (to fill the gap at 0, making room after 2)

      children.forEach((child, index) => {
        if (index === draggedIndex) {
          // The dragged item stays in its DOM position (hidden)
          child.style.transform = ''
          return
        }

        let translateY = 0

        if (targetIndex < draggedIndex) {
          // Dragging UP: items between targetIndex and draggedIndex-1 shift DOWN
          if (index >= targetIndex && index < draggedIndex) {
            translateY = shiftAmount
          }
        } else if (targetIndex > draggedIndex) {
          // Dragging DOWN: items between draggedIndex+1 and targetIndex shift UP
          if (index > draggedIndex && index <= targetIndex) {
            translateY = -shiftAmount
          }
        }
        // If targetIndex === draggedIndex, nothing moves

        child.style.transform =
          translateY !== 0 ? `translateY(${translateY}px)` : ''
      })
    }

    function calculatePreviewIndex(e: DragEvent): number {
      if (draggedIndex === -1) return -1

      const containerRect = container.getBoundingClientRect()
      const cursorY = e.clientY - containerRect.top

      // Use original positions (stored at drag start) to determine where cursor is
      // This avoids issues with transformed elements
      for (let i = 0; i < children.length; i++) {
        if (i === draggedIndex) continue // Skip the dragged item

        const top = itemTops[i]
        const height = itemHeights[i]
        const bottom = top + height
        const midY = top + height / 2

        // Check if cursor is within this element's original vertical bounds
        if (cursorY >= top && cursorY <= bottom) {
          const isAbove = cursorY < midY

          if (isAbove) {
            // Insert before this item
            return i < draggedIndex ? i : i
          } else {
            // Insert after this item
            return i < draggedIndex ? i + 1 : i
          }
        }
      }

      // If cursor is above all items
      if (cursorY < (itemTops[0] ?? 0)) {
        return 0
      }

      // If cursor is below all items
      const lastIndex = children.length - 1
      const lastBottom =
        (itemTops[lastIndex] ?? 0) + (itemHeights[lastIndex] ?? 0)
      if (cursorY > lastBottom) {
        return lastIndex
      }

      return currentPreviewIndex
    }

    function handleDragStart(e: DragEvent) {
      const target = e.target as HTMLElement
      const index = getIndexFromElement(target)
      if (index === -1) return

      if (!e.dataTransfer) return

      e.dataTransfer.setData(
        MIME_TYPE,
        JSON.stringify({ id: options.id, index }),
      )
      e.dataTransfer.effectAllowed = 'move'

      draggedIndex = index
      currentPreviewIndex = index
      activeIndex.current = index
      previewIndex.current = index

      // Recalculate heights and positions at drag start (before hiding)
      itemHeights = children.map((child) => child.offsetHeight)
      const containerRect = container.getBoundingClientRect()
      itemTops = children.map(
        (child) => child.getBoundingClientRect().top - containerRect.top,
      )

      // Add dragging class for styling
      target.classList.add('sortable-dragging')

      // Hide the original element after a brief delay to allow drag image to be captured
      requestAnimationFrame(() => {
        target.style.visibility = 'hidden'
      })
    }

    function handleDragEnd(e: DragEvent) {
      const target = e.target as HTMLElement
      target.classList.remove('sortable-dragging')

      // If drop was handled successfully, don't reset everything here
      // The drop handler takes care of the cleanup
      if (!dropHandled) {
        // Restore the dragged element's visibility
        target.style.visibility = ''

        // Reset all transforms and classes
        children.forEach((child) => {
          child.style.transform = ''
          child.classList.remove(
            'sortable-over',
            'sortable-over-top',
            'sortable-over-bottom',
          )
        })
      }

      draggedIndex = -1
      currentPreviewIndex = -1
      activeIndex.current = -1
      overIndex.current = -1
      previewIndex.current = -1
      dropHandled = false
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault()
      if (!e.dataTransfer) return
      e.dataTransfer.dropEffect = 'move'

      if (draggedIndex === -1) return

      const target = findSortableChild(e.target as HTMLElement)
      if (target) {
        const targetIndex = getIndexFromElement(target)
        if (targetIndex !== -1) {
          overIndex.current = targetIndex
        }
      }

      // Calculate and update preview position
      const newPreviewIndex = calculatePreviewIndex(e)
      if (newPreviewIndex !== -1 && newPreviewIndex !== currentPreviewIndex) {
        currentPreviewIndex = newPreviewIndex
        previewIndex.current = newPreviewIndex
        updatePreviewPositions()
      }

      // Update visual indicators on target
      if (target) {
        const rect = target.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        const isAbove = e.clientY < midY

        children.forEach((child) => {
          child.classList.remove(
            'sortable-over',
            'sortable-over-top',
            'sortable-over-bottom',
          )
        })
        target.classList.add('sortable-over')
        target.classList.add(
          isAbove ? 'sortable-over-top' : 'sortable-over-bottom',
        )
      }
    }

    function handleDragLeave(e: DragEvent) {
      const target = findSortableChild(e.target as HTMLElement)
      if (!target) return

      // Only remove if actually leaving the element
      const relatedTarget = e.relatedTarget as HTMLElement
      if (target.contains(relatedTarget)) return

      target.classList.remove(
        'sortable-over',
        'sortable-over-top',
        'sortable-over-bottom',
      )

      // Check if we're leaving the container entirely
      if (!container.contains(relatedTarget)) {
        // Reset preview when leaving container
        currentPreviewIndex = draggedIndex
        previewIndex.current = draggedIndex
        updatePreviewPositions()
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault()

      if (draggedIndex === -1 || currentPreviewIndex === -1) return
      if (currentPreviewIndex === draggedIndex) return

      // Use the preview index as the final position
      const newIndex = currentPreviewIndex

      // Reorder items
      const newItems = [...options.items]
      const [removed] = newItems.splice(draggedIndex, 1)
      newItems.splice(newIndex, 0, removed)

      // Mark that drop was handled so dragEnd doesn't reset everything
      dropHandled = true

      // Make the dragged element visible again at its current position
      const draggedElement = children[draggedIndex]
      if (draggedElement) {
        draggedElement.style.visibility = ''
      }

      // Disable transitions temporarily so the DOM update doesn't animate
      children.forEach((child) => {
        child.style.transition = 'none'
      })

      // Call onSort to trigger the re-render
      options.onSort(newItems)

      // Clean up classes (but keep transforms until DOM updates)
      children.forEach((child) => {
        child.classList.remove(
          'sortable-over',
          'sortable-over-top',
          'sortable-over-bottom',
        )
      })

      // Reset transforms and re-enable transitions after DOM has updated
      requestAnimationFrame(() => {
        children.forEach((child) => {
          child.style.transform = ''
        })
        // Re-enable transitions after a frame
        requestAnimationFrame(() => {
          children.forEach((child) => {
            child.style.transition = 'transform 200ms ease'
          })
        })
      })
    }

    function getIndexFromElement(el: HTMLElement): number {
      const sortableChild = findSortableChild(el)
      if (!sortableChild) return -1
      return parseInt(sortableChild.dataset.sortableIndex ?? '-1', 10)
    }

    function findSortableChild(el: HTMLElement | null): HTMLElement | null {
      while (el && el !== container) {
        if (el.parentElement === container) {
          return el
        }
        el = el.parentElement
      }
      return null
    }

    container.addEventListener('dragstart', handleDragStart)
    container.addEventListener('dragend', handleDragEnd)
    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)

    return () => {
      observer.disconnect()
      container.removeEventListener('dragstart', handleDragStart)
      container.removeEventListener('dragend', handleDragEnd)
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    }
  }

  return {
    containerRef,
    activeIndex,
    overIndex,
    previewIndex,
  }
}
