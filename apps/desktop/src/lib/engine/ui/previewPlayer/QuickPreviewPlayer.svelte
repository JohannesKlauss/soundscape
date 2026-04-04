<script lang="ts">
import { Pause, Play } from '@lucide/svelte'
import type { ClassValue } from 'svelte/elements'
import { previewFromUrl, previewPlayerState, previewSource, stopPreviewSource } from '$lib/engine/ui/previewPlayer/previewPlayer.svelte.js'

interface Props {
  src: string
  contentType: string
  class?: ClassValue
}

let { src, contentType, class: customClass }: Props = $props()

const isPlaying = $derived(previewPlayerState.currentPlayingSource === src)

async function togglePlay() {
  if (isPlaying) {
    stopPreviewSource()

    return
  }

  if (src.startsWith('https')) {
    await previewFromUrl(src)
  } else {
    await previewSource(src, contentType)
  }
}
</script>

<button type="button" class={["btn btn-primary btn-sm btn-circle", !isPlaying && "btn-ghost", customClass]} onclick={togglePlay}>
    {#if isPlaying}
      <Pause class="size-3" />
    {:else}
      <Play class="size-3" />
    {/if}
</button>