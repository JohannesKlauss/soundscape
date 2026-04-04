<script lang="ts">
import { Loader2 } from '@lucide/svelte'
import { readFile, remove } from '@tauri-apps/plugin-fs'
import { toast } from 'svelte-sonner'

import { db } from '$lib/db'
import type { SoundSampleCategory } from '$lib/domain/library/_types'
import { downloadAudio, fetchAudioInfo, ytDlpState } from '$lib/domain/library/youtube/ytDlpState.svelte.js'
import { writeFileToSamplesDirectory } from '$lib/fileSystem'
import { extractYoutubeVideoId, fetchYoutubeInfo } from '$lib/youtube/api'

interface Props {
  url: string
  name: string
  tags: string[]
  category: SoundSampleCategory
  isYoutube: boolean
  isFetching: boolean
  disabled?: boolean
  onAdded: () => void
}

let {
  url,
  name = $bindable(),
  tags = $bindable(),
  category,
  isYoutube = $bindable(false),
  isFetching = $bindable(false),
  disabled = false,
  onAdded,
}: Props = $props()

let ytInfo = $state<{ title: string; duration: number; tags: string[] } | null>(null)

export async function probe() {
  if (isFetching || disabled) return

  isFetching = true
  isYoutube = false
  ytInfo = null

  try {
    const videoId = extractYoutubeVideoId(url)

    if (videoId) {
      // Fast path: YouTube Data API (~200ms)
      const info = await fetchYoutubeInfo(videoId)
      isYoutube = true
      ytInfo = info
      name = info.title
      tags = info.tags
    } else if (ytDlpState.ready) {
      // Fallback: yt-dlp for non-YouTube URLs
      const info = await fetchAudioInfo(url)
      isYoutube = true
      ytInfo = info
      name = info.title
      tags = info.tags
    }
  } catch (e) {
    toast.error(`Failed to fetch audio info: ${e}`)
    isYoutube = false
    ytInfo = null
  } finally {
    isFetching = false
  }
}

export async function add() {
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

    onAdded()
  } catch (e) {
    toast.error(`Download failed: ${e}`)
  }
}

export function reset() {
  isYoutube = false
  ytInfo = null
}
</script>

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
{/if}
