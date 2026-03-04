<script lang="ts">
import { AudioWaveform, Loader2, Music, PlusIcon, Sparkle } from '@lucide/svelte'
import { toast } from 'svelte-sonner'
import { Player } from 'tone'
import { readFile, remove } from '@tauri-apps/plugin-fs'

import Dialog from '$lib/components/Dialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import type { SoundSampleCategory } from '$lib/domain/library/_types'
import DropZone from '$lib/domain/library/ui/DropZone.svelte'
import SamplePlayer from '$lib/domain/library/ui/SamplePlayer.svelte'
import TagInput from '$lib/domain/library/ui/TagInput.svelte'
import { ytDlpState, fetchAudioInfo, downloadAudio } from '$lib/domain/library/ui/ytDlpState.svelte'
import { getExtensionFromContentType, writeFileToSamplesDirectory } from '$lib/fileSystem'

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
let ytInfo = $state<{ title: string; duration: number; tags: string[] } | null>(null)

const player = new Player().toDestination()

const isReady = $derived((isAudio || isYoutube) && name.trim().length >= 3)
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
    ytInfo = null
  } catch {
    // Not a direct audio URL — try yt-dlp if dependencies are ready
    isAudio = false

    if (ytDlpState.ready) {
      try {
        const info = await fetchAudioInfo(url)
        isYoutube = true
        ytInfo = info

        if (!name || name.length === 0) {
          name = info.title
        }
        if (tags.length === 0 && info.tags.length > 0) {
          tags = info.tags
        }
      } catch {
        toast.error('URL is not a recognized audio source.')
        isYoutube = false
        ytInfo = null
      }
    } else {
      toast.error('URL is not an audio file.')
    }
  }
}

async function loadAudioFromFile(f: File) {
  try {
    const objectUrl = URL.createObjectURL(f)
    await player.load(objectUrl)
    isAudio = true
    isYoutube = false
    ytInfo = null

    if (!name || name.length === 0) {
      name = f.name.replace(/\.[^.]+$/, '')
    }
  } catch {
    toast.error('File is not a valid audio file.')
    file = null
    isAudio = false
  }
}

function handleFileSelected(f: File) {
  url = ''
  file = f
}

function clearFile() {
  file = null
  isAudio = false
}

async function onAddAudio() {
  if (isYoutube) {
    await addFromYoutube()
  } else if (source === 'file' && file) {
    await addFromFile()
  } else if (source === 'url') {
    await addFromUrl()
  }
}

async function addFromYoutube() {
  try {
    const result = await downloadAudio(url)

    const fileBytes = await readFile(result.file_path)
    const blob = new Blob([fileBytes], { type: result.content_type })

    const fileName = `${name}-${crypto.randomUUID().slice(0, 8)}.mp3`
    await writeFileToSamplesDirectory(fileName, blob)

    db.sample.add({
      category,
      name,
      contentType: result.content_type,
      src: fileName,
      duration: result.duration,
      type: 'yt',
      tags: $state.snapshot(tags),
    })

    await remove(result.file_path).catch(() => {})

    resetForm()
  } catch (e) {
    toast.error(`Download failed: ${e}`)
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
  ytInfo = null
  category = 'music'
}
</script>

<Dialog bind:open={open}
        onConfirm={isReady && !ytDlpState.isDownloading ? onAddAudio : () => null}
        confirmDisabled={!isReady || ytDlpState.isDownloading}
        confirmText={ytDlpState.isDownloading ? 'Downloading...' : 'Add to library'}
        onCancel={() => resetForm()}>
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
        Add a sample from a URL, YouTube link, or drop a file from your computer
    {/snippet}

    <DropZone {file} onFileSelected={handleFileSelected} onClear={clearFile} />

    <div class="divider text-xs text-muted my-2">OR</div>

    <div class="fieldset">
        <label class="label" for="url">Link to URL</label>
        <input type="text" class="input w-full" name="url"
               placeholder="https://example.com/media.mp3 or YouTube link"
               bind:value={url} disabled={!!file}/>
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

    {#if ytDlpState.isDownloading}
        <div class="divider"></div>
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-sm text-muted">
                <Loader2 class="size-4 animate-spin" />
                <span>{ytDlpState.downloadStatus}</span>
            </div>
            {#if ytDlpState.downloadPercent != null}
                <progress class="progress progress-primary w-full" value={ytDlpState.downloadPercent} max="100"></progress>
            {/if}
        </div>
    {:else if isYoutube && ytInfo}
        <div class="divider"></div>
        <div class="text-sm text-muted space-y-1">
            <p>Audio will be extracted from: <strong class="text-base-content">{ytInfo.title}</strong></p>
            {#if ytInfo.duration > 0}
                <p>Duration: {Math.floor(ytInfo.duration / 60)}:{String(Math.floor(ytInfo.duration % 60)).padStart(2, '0')}</p>
            {/if}
        </div>
    {:else if isAudio}
        <div class="divider"></div>
        <SamplePlayer {player}/>
    {/if}
</Dialog>
