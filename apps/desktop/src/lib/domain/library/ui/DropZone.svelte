<script lang="ts">
import { Upload } from '@lucide/svelte'
import { toast } from 'svelte-sonner'
import { mimeToExt } from '$lib/fileSystem'

interface Props {
  file: File | null
  onFileSelected: (file: File) => void
  onClear: () => void
}

let { file, onFileSelected, onClear }: Props = $props()

let isDraggingOver = $state(false)
let fileInputEl: HTMLInputElement | undefined = $state()

const acceptedMimes = Object.keys(mimeToExt).join(',')

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const selected = input.files?.[0]
  if (!selected) return

  if (!mimeToExt[selected.type]) {
    toast.error(`Unsupported file type: ${selected.type}`)
    return
  }

  onFileSelected(selected)
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDraggingOver = false

  const dropped = e.dataTransfer?.files?.[0]
  if (!dropped) return

  if (!mimeToExt[dropped.type]) {
    toast.error(`Unsupported file type: ${dropped.type || 'unknown'}`)
    return
  }

  onFileSelected(dropped)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDraggingOver = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDraggingOver = false
}

function clear(e: MouseEvent) {
  e.stopPropagation()
  onClear()
  if (fileInputEl) {
    fileInputEl.value = ''
  }
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
  class={["border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer", isDraggingOver ? "border-primary bg-primary/10" : "border-base-content/20 hover:border-base-content/40"]}
  role="button"
  tabindex="0"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  onclick={() => fileInputEl?.click()}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputEl?.click() }}
>
  <input
    bind:this={fileInputEl}
    type="file"
    accept={acceptedMimes}
    class="hidden"
    onchange={handleFileSelect}
  />

  {#if file}
    <div class="flex flex-col items-center gap-1">
      <Upload class="size-6 text-primary" />
      <span class="text-sm font-medium">{file.name}</span>
      <span class="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</span>
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <span class="text-xs text-error cursor-pointer underline" onclick={clear}>Remove</span>
    </div>
  {:else}
    <div class="flex flex-col items-center gap-1">
      <Upload class="size-6 text-muted" />
      <span class="text-sm text-muted">Drop an audio file here or click to browse</span>
      <span class="text-xs text-muted">MP3, WAV, OGG, FLAC, AAC, M4A, WebM</span>
    </div>
  {/if}
</div>
