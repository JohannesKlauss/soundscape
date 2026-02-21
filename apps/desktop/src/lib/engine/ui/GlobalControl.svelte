<script lang="ts">
import { Play, Square } from '@lucide/svelte'
import { getContext, getTransport } from 'tone'
import { onMount } from 'svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { volumeToDb } from '$lib/engine/volume'

let isPlaying = $state(false)
let volume = $state(1)

onMount(() => {
  getTransport().on('start', () => {
    isPlaying = true
  })
})

$effect(() => {
  getContext().destination.volume.value = volumeToDb(volume)
})

function handleRangeWheel(e: WheelEvent) {
  e.preventDefault()

  const delta = e.deltaY < 0 ? -0.01 : 0.01

  volume = Math.round(Math.max(0, Math.min(1, volume + delta)) * 100) / 100
}

function stopAll() {
  getTransport().emit('fadeOut').stop('+5')
}
</script>

<div class="flex-center">
    <Tooltip triggerProps={{class: "btn btn-lg btn-circle", disabled: !isPlaying, onclick: stopAll}}>
        {#snippet trigger()}
            {#if isPlaying}
                <Square/>
            {:else}
                <Play/>
            {/if}
        {/snippet}

        {#if isPlaying}
            Stop All Sources
        {/if}
    </Tooltip>

    <Tooltip disableCloseOnTriggerClick>
        {#snippet trigger()}
            <input type="range" min="0" max="1" step="0.01" bind:value={volume} class="range range-lg"
                   onwheel={handleRangeWheel}
            />
        {/snippet}

        Global Volume: {Math.round(volume * 100)}%
    </Tooltip>
</div>