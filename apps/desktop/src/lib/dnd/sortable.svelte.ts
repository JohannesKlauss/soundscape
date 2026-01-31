const MIME_TYPE = "application/x-dnd-sortable";

export interface UseSortableOptions<T> {
  id: string;
  items: T[];
  onSort: (items: T[]) => void;
}

export interface UseSortableReturn {
  containerRef: (element: HTMLElement) => (() => void) | void;
  activeIndex: { current: number };
  overIndex: { current: number };
}

export function useSortable<T>(
  options: UseSortableOptions<T>,
): UseSortableReturn {
  const activeIndex = $state<{ current: number }>({ current: -1 });
  const overIndex = $state<{ current: number }>({ current: -1 });

  function containerRef(container: HTMLElement): (() => void) | void {
    let draggedIndex = -1;
    let children: HTMLElement[] = [];

    function updateChildren() {
      children = Array.from(container.children) as HTMLElement[];
      children.forEach((child, index) => {
        child.draggable = true;
        child.dataset.sortableIndex = String(index);
      });
    }

    // Initial setup
    updateChildren();

    // Observe for child changes
    const observer = new MutationObserver(() => {
      updateChildren();
    });
    observer.observe(container, { childList: true });

    function handleDragStart(e: DragEvent) {
      const target = e.target as HTMLElement;
      const index = getIndexFromElement(target);
      if (index === -1) return;

      if (!e.dataTransfer) return;

      e.dataTransfer.setData(
        MIME_TYPE,
        JSON.stringify({ id: options.id, index }),
      );
      e.dataTransfer.effectAllowed = "move";

      draggedIndex = index;
      activeIndex.current = index;

      // Add dragging class for styling
      target.classList.add("sortable-dragging");
    }

    function handleDragEnd(e: DragEvent) {
      const target = e.target as HTMLElement;
      target.classList.remove("sortable-dragging");

      // Remove all over classes
      children.forEach((child) => {
        child.classList.remove(
          "sortable-over",
          "sortable-over-top",
          "sortable-over-bottom",
        );
      });

      draggedIndex = -1;
      activeIndex.current = -1;
      overIndex.current = -1;
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      if (!e.dataTransfer) return;
      e.dataTransfer.dropEffect = "move";

      const target = findSortableChild(e.target as HTMLElement);
      if (!target) return;

      const targetIndex = getIndexFromElement(target);
      if (targetIndex === -1 || targetIndex === draggedIndex) return;

      overIndex.current = targetIndex;

      // Determine position (top or bottom half)
      const rect = target.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isAbove = e.clientY < midY;

      // Update visual indicators
      children.forEach((child) => {
        child.classList.remove(
          "sortable-over",
          "sortable-over-top",
          "sortable-over-bottom",
        );
      });
      target.classList.add("sortable-over");
      target.classList.add(
        isAbove ? "sortable-over-top" : "sortable-over-bottom",
      );
    }

    function handleDragLeave(e: DragEvent) {
      const target = findSortableChild(e.target as HTMLElement);
      if (!target) return;

      // Only remove if actually leaving the element
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (target.contains(relatedTarget)) return;

      target.classList.remove(
        "sortable-over",
        "sortable-over-top",
        "sortable-over-bottom",
      );
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();

      const target = findSortableChild(e.target as HTMLElement);
      if (!target) return;

      const targetIndex = getIndexFromElement(target);
      if (
        targetIndex === -1 ||
        draggedIndex === -1 ||
        targetIndex === draggedIndex
      )
        return;

      // Determine final position
      const rect = target.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isAbove = e.clientY < midY;

      let newIndex = targetIndex;
      if (isAbove && targetIndex > draggedIndex) {
        newIndex = targetIndex - 1;
      } else if (!isAbove && targetIndex < draggedIndex) {
        newIndex = targetIndex + 1;
      }

      // Reorder items
      const newItems = [...options.items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(newIndex, 0, removed);

      options.onSort(newItems);

      // Clean up classes
      children.forEach((child) => {
        child.classList.remove(
          "sortable-over",
          "sortable-over-top",
          "sortable-over-bottom",
        );
      });
    }

    function getIndexFromElement(el: HTMLElement): number {
      const sortableChild = findSortableChild(el);
      if (!sortableChild) return -1;
      return parseInt(sortableChild.dataset.sortableIndex ?? "-1", 10);
    }

    function findSortableChild(el: HTMLElement | null): HTMLElement | null {
      while (el && el !== container) {
        if (el.parentElement === container) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    }

    container.addEventListener("dragstart", handleDragStart);
    container.addEventListener("dragend", handleDragEnd);
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("dragleave", handleDragLeave);
    container.addEventListener("drop", handleDrop);

    return () => {
      observer.disconnect();
      container.removeEventListener("dragstart", handleDragStart);
      container.removeEventListener("dragend", handleDragEnd);
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("dragleave", handleDragLeave);
      container.removeEventListener("drop", handleDrop);
    };
  }

  return {
    containerRef,
    activeIndex,
    overIndex,
  };
}
