<script lang="ts">
import { AudioWaveform, Loader2, Music, PlusIcon, Sparkle } from '@lucide/svelte'
import { untrack } from 'svelte'
import { toast } from 'svelte-sonner'

import Dialog from '$lib/components/Dialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import type { SoundSampleCategory } from '$lib/domain/library/_types'
import DropZone from '$lib/domain/library/ui/DropZone.svelte'
import TagInput from '$lib/domain/library/ui/TagInput.svelte'
import YoutubeImport from '$lib/domain/library/youtube/YoutubeImport.svelte'
import { ytDlpState } from '$lib/domain/library/youtube/ytDlpState.svelte.js'
import SamplePlayer from '$lib/engine/ui/SamplePlayer.svelte'
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
let isFetching = $state(false)

let youtubeImport: ReturnType<typeof YoutubeImport> | undefined

const audio = new Audio()

const isReady = $derived((isAudio || isYoutube) && name.trim().length >= 3)
const source = $derived<'url' | 'file' | null>(file ? 'file' : url.length > 0 ? 'url' : null)

$effect(() => {
  if (url.length > 0 && url.startsWith('http') && !file) {
    untrack(() => loadAudioFromUrl())
  }
})

$effect(() => {
  if (file) {
    loadAudioFromFile(file)
  }
})

function tryLoadAudio(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    function onCanPlay() {
      cleanup()
      resolve()
    }
    function onError() {
      cleanup()
      reject(new Error('Not a playable audio URL'))
    }
    function cleanup() {
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }

    audio.addEventListener('canplay', onCanPlay, { once: true })
    audio.addEventListener('error', onError, { once: true })
    audio.src = src
  })
}

async function loadAudioFromUrl() {
  if (isFetching) return

  isAudio = false
  isYoutube = false
  name = ''
  tags = []

  try {
    isFetching = true
    await tryLoadAudio(url)
    isAudio = true
    isFetching = false
  } catch {
    isFetching = false

    await youtubeImport?.probe()
  }
}

async function loadAudioFromFile(f: File) {
  try {
    const objectUrl = URL.createObjectURL(f)
    await tryLoadAudio(objectUrl)
    isAudio = true
    isYoutube = false
    youtubeImport?.reset()

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
    await youtubeImport?.add()
  } else if (source === 'file' && file) {
    try {
      await addFromFile()
    } catch(_) {
      toast.error('Could not load file from disk.')
    }
  } else if (source === 'url') {
    try {
      await addFromUrl()
    } catch (e) {
      toast.error('Could not load sound from URL.')
    }
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
    duration: audio.duration,
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
    duration: audio.duration,
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
  audio.pause()
  audio.removeAttribute('src')
  youtubeImport?.reset()
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
        Add a sample from a URL, YouTube link, or drop a file from your computer to add it to your library.
    {/snippet}

    <DropZone {file} onFileSelected={handleFileSelected} onClear={clearFile} />

    <div class="divider text-xs text-muted my-2">OR</div>

    <div class="fieldset">
        <label class="label" for="url">Link to URL</label>
        <div class="relative">
            <input type="text" class="input w-full pr-10" name="url"
                   placeholder="https://example.com/media.mp3 or YouTube link"
                   bind:value={url} disabled={!!file || isFetching}/>
            {#if isFetching}
                <Loader2 class="size-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            {/if}
        </div>
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

    <YoutubeImport bind:this={youtubeImport}
                   {url} bind:name bind:tags {category}
                   bind:isYoutube bind:isFetching
                   disabled={!!file}
                   onAdded={resetForm} />

    {#if isAudio}
        <div class="divider"></div>
        <SamplePlayer {audio}/>
    {/if}
</Dialog>
