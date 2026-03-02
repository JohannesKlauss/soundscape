<script lang="ts">
import { AudioWaveform, Music, PlusIcon, Sparkle, Upload } from '@lucide/svelte'
import { toast } from 'svelte-sonner'
import { Player } from 'tone'
import Dialog from '$lib/components/Dialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import type { SoundSampleCategory } from '$lib/domain/library/_types'
import SamplePlayer from '$lib/domain/library/ui/SamplePlayer.svelte'
import TagInput from '$lib/domain/library/ui/TagInput.svelte'
import { getExtensionFromContentType, mimeToExt, writeFileToSamplesDirectory } from '$lib/fileSystem'

interface Props {
  open?: boolean
  url?: string
  name?: string
  file?: File | null
  tags?: string[]
  showTrigger?: boolean
}

let { open = $bindable(false), url = $bindable(''), name = $bindable(''), file = $bindable<File | null>(null), tags = $bindable<string[]>([]), showTrigger = true }: Props = $props()

let category = $state<SoundSampleCategory>('music')
let isAudio = $state(false)
let isYoutube = $state(false)
let isDraggingOver = $state(false)
let fileInputEl: HTMLInputElement | undefined = $state()

const player = new Player().toDestination()

const acceptedMimes = Object.keys(mimeToExt).join(',')

const isReady = $derived(isAudio && name.trim().length >= 3)
const source = $derived<'url' | 'file' | null>(file ? 'file' : url.length > 0 ? 'url' : null)

$effect(() => {
  if (url.length > 0 && url.startsWith('http') && !file) {
    loadAudioFromUrl()
  }
})

$effect(() => {
  if (file) {
    loadAudioFromFile(file)
  }
})

async function loadAudioFromUrl() {
  try {
    await player.load(url)
    isAudio = true
    isYoutube = false
  } catch {
    toast.error('URL is not an audio file.')
    isAudio = false
  }
}

async function loadAudioFromFile(f: File) {
  try {
    const objectUrl = URL.createObjectURL(f)
    await player.load(objectUrl)
    isAudio = true
    isYoutube = false

    if (!name || name.length === 0) {
      name = f.name.replace(/\.[^.]+$/, '')
    }
  } catch {
    toast.error('File is not a valid audio file.')
    file = null
    isAudio = false
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const selected = input.files?.[0]
  if (!selected) return

  if (!mimeToExt[selected.type]) {
    toast.error(`Unsupported file type: ${selected.type}`)
    return
  }

  url = ''
  file = selected
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

  url = ''
  file = dropped
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDraggingOver = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDraggingOver = false
}

function clearFile() {
  file = null
  isAudio = false
  if (fileInputEl) fileInputEl.value = ''
}

async function onAddAudio() {
  if (source === 'file' && file) {
    await addFromFile()
  } else if (source === 'url') {
    await addFromUrl()
  }
}

async function addFromUrl() {
  const res = await fetch(url)

  if (!res.ok) {
    toast.error('Unable to download audio')
    return
  }

  if (!res.headers.get('content-type')) {
    toast.error('Unable to identify file type')
    return
  }

  const ext = getExtensionFromContentType(res.headers.get('content-type')!)
  const fileName = `${name}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  await writeFileToSamplesDirectory(fileName, await res.blob())

  db.sample.add({
    category,
    name,
    contentType: res.headers.get('content-type')!,
    src: fileName,
    duration: player.buffer.duration,
    type: 'web',
    tags: $state.snapshot(tags),
  })

  resetForm()
}

async function addFromFile() {
  if (!file) return

  const contentType = file.type
  const ext = getExtensionFromContentType(contentType)
  const fileName = `${name}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  await writeFileToSamplesDirectory(fileName, file)

  db.sample.add({
    category,
    name,
    contentType,
    src: fileName,
    duration: player.buffer.duration,
    type: 'local',
    tags: $state.snapshot(tags),
  })

  resetForm()
}

function resetForm() {
  open = false
  name = ''
  url = ''
  file = null
  tags = []
  isAudio = false
  isYoutube = false
  category = 'music'

  if (fileInputEl) {
    fileInputEl.value = ''
  }
}
</script>

<Dialog bind:open={open} onConfirm={isReady ? onAddAudio : () => null} confirmDisabled={!isReady}
        confirmText="Add to library" onCancel={() => resetForm()}>
    {#snippet trigger(props)}
        {#if showTrigger}
            <Tooltip>
                {#snippet trigger()}
                    <button type="button" class="btn btn-ghost btn-circle btn-sm tooltip" {...props}>
                        <PlusIcon class="w-4 h-4"/>
                    </button>
                {/snippet}

                Add Sample
            </Tooltip>
        {/if}
    {/snippet}

    {#snippet title()}
        Add Sample
    {/snippet}

    {#snippet description()}
        Add a sample from a URL or drop a file from your computer
    {/snippet}

    {@render dropZone()}

    <div class="divider text-xs text-muted my-2">OR</div>

    <div class="fieldset">
        <label class="label" for="url">Link to URL</label>
        <input type="text" class="input w-full" name="url" placeholder="https://example.com/media.mp3" bind:value={url}
               disabled={!!file}/>
    </div>

    <div class="fieldset">
        <label class="label" for="name">Name</label>
        <input type="text" class="input w-full" name="name" placeholder="Sample Name (min 3 characters)" bind:value={name}/>
    </div>

    <div class="fieldset">
        <span class="label">Type</span>
        <div class="grid grid-cols-3 gap-4">
            <label class="label">
                <input type="radio" class="radio" name="category" value="music"
                       bind:group={category}/>
                <Music/>
                Music
            </label>
            <label class="label">
                <input type="radio" class="radio" name="category" value="fx"
                       bind:group={category}/>
                <Sparkle/>
                FX
            </label>
            <label class="label">
                <input type="radio" class="radio" name="category"
                       value="atmosphere" bind:group={category}/>
                <AudioWaveform/>
                Atmosphere
            </label>
        </div>

    </div>

    <div class="fieldset">
        <span class="label">Tags</span>
        <TagInput bind:tags placeholder="Add tag and press Enter..."/>
    </div>

    {#if isAudio}
        <div class="divider"></div>
        <SamplePlayer {player}/>
    {/if}
</Dialog>

{#snippet dropZone()}
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
                <span class="text-xs text-error cursor-pointer underline" onclick={(e) => { e.stopPropagation(); clearFile() }}>Remove</span>
            </div>
        {:else}
            <div class="flex flex-col items-center gap-1">
                <Upload class="size-6 text-muted" />
                <span class="text-sm text-muted">Drop an audio file here or click to browse</span>
                <span class="text-xs text-muted">MP3, WAV, OGG, FLAC, AAC, M4A, WebM</span>
            </div>
        {/if}
    </div>
{/snippet}