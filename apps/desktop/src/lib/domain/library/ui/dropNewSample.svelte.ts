import { toast } from 'svelte-sonner'
import { mimeToExt } from '$lib/fileSystem'

type State = {
  createNewOpen: boolean
  createNewName: string
  createNewFile: File | null
  isDraggingFile: boolean
}

const _state = $state<State>({
  createNewOpen: false,
  createNewName: '',
  createNewFile: null,
  isDraggingFile: false,
})

export const dropNewSampleState = _state as Readonly<State>

let dragCounter = 0

function hasFiles(e: DragEvent) {
  return e.dataTransfer?.types?.includes('Files') ?? false
}

function onWindowDragEnter(e: DragEvent) {
  if (!hasFiles(e)) {
    return
  }

  dragCounter++
  _state.isDraggingFile = true
}

function onWindowDragLeave(_e: DragEvent) {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    _state.isDraggingFile = false
  }
}

function onWindowDragOver(e: DragEvent) {
  if (hasFiles(e)) {
    e.preventDefault()
  }
}

function onWindowDrop(e: DragEvent) {
  dragCounter = 0
  _state.isDraggingFile = false

  if (hasFiles(e)) {
    e.preventDefault()
  }
}

function handleOverlayDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragCounter = 0
  _state.isDraggingFile = false

  const dropped = e.dataTransfer?.files?.[0]
  if (!dropped) return

  if (!mimeToExt[dropped.type]) {
    toast.error(`Unsupported file type: ${dropped.type || 'unknown'}`)
    return
  }

  _state.createNewFile = dropped
  _state.createNewName = dropped.name.replace(/\.[^.]+$/, '')
  _state.createNewOpen = true
}

function handleOverlayDragOver(e: DragEvent) {
  e.preventDefault()
}

export function dropNewSampleDnd() {
  window.addEventListener('dragenter', onWindowDragEnter)
  window.addEventListener('dragleave', onWindowDragLeave)
  window.addEventListener('dragover', onWindowDragOver)
  window.addEventListener('drop', onWindowDrop)

  const cleanup = () => {
    window.removeEventListener('dragenter', onWindowDragEnter)
    window.removeEventListener('dragleave', onWindowDragLeave)
    window.removeEventListener('dragover', onWindowDragOver)
    window.removeEventListener('drop', onWindowDrop)
  }

  return {
    handleOverlayDrop,
    handleOverlayDragOver,
    cleanup,
  }
}
