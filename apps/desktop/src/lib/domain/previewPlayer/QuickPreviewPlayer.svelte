<script lang="ts">
import { Pause, Play } from '@lucide/svelte'
import type { ClassValue } from 'svelte/elements'
import { previewPlayerState, previewSource, stopPreviewSource } from '$lib/domain/previewPlayer/previewPlayer.svelte'

interface Props {
  src: string
  contentType: string
  class?: ClassValue
}

let { src, contentType, class: customClass }: Props = $props()

const isPlaying = $derived(previewPlayerState.currentPlayingSource === src)

async function togglePlay() {
  if (isPlaying) {
    await stopPreviewSource()

    return
  }

  await previewSource(src, contentType)
}
</script>

<button type="button" class={["btn btn-primary btn-sm btn-circle", !isPlaying && "btn-ghost", customClass]} onclick={togglePlay}>
    {#if isPlaying}
      <Pause class="size-3" />
    {:else}
      <Play class="size-3" />
    {/if}
</button>