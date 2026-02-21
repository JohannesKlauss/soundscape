<script lang="ts">
import type { Snippet } from 'svelte'
import { onMount } from 'svelte'

interface Props {
  children: Snippet
  dragInstanceId: string
  offset?: { x: number; y: number }
}

let { children, dragInstanceId, offset = { x: 12, y: 12 } }: Props = $props()

let visible = $state(false)
let x = $state(0)
let y = $state(0)

onMount(() => {
  function handleDragStart(e: CustomEvent<{ dragInstanceId: string }>) {
    if (e.detail.dragInstanceId === dragInstanceId) {
      visible = true
    }
  }

  function handleDragEnd(e: CustomEvent<{ dragInstanceId: string }>) {
    if (e.detail.dragInstanceId === dragInstanceId) {
      visible = false
    }
  }

  function handleDragOver(e: DragEvent) {
    if (visible) {
      x = e.clientX
      y = e.clientY
    }
  }

  document.addEventListener('dnd:dragstart', handleDragStart as EventListener)
  document.addEventListener('dnd:dragend', handleDragEnd as EventListener)
  document.addEventListener('dragover', handleDragOver)

  return () => {
    document.removeEventListener(
      'dnd:dragstart',
      handleDragStart as EventListener,
    )
    document.removeEventListener('dnd:dragend', handleDragEnd as EventListener)
    document.removeEventListener('dragover', handleDragOver)
  }
})
</script>

{#if visible}
  <div
    class="fixed z-9999 pointer-events-none"
    style="left: {x + offset.x}px; top: {y + offset.y}px;"
  >
    {@render children()}
  </div>
{/if}
