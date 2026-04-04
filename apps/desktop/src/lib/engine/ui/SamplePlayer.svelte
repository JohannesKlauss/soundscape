<script lang="ts">
import { Pause, Play, Volume2, VolumeX } from '@lucide/svelte'
import { onDestroy, onMount } from 'svelte'

import Tooltip from '$lib/components/Tooltip.svelte'
import { formatTime } from '$lib/engine/volume'

interface Props {
  audio: HTMLAudioElement
}

let { audio }: Props = $props()

let isPlaying = $state(false)
let currentTime = $state(0)
let duration = $state(0)
let volume = $state(1)
let isMuted = $state(false)

let animationFrame: number

function onTimeUpdate() {
  currentTime = audio.currentTime

  animationFrame = requestAnimationFrame(onTimeUpdate)
}

function onLoadedMetadata() {
  duration = audio.duration
}

function onEnded() {
  isPlaying = false
  currentTime = 0
}

function onPlay() {
  isPlaying = true

  animationFrame = requestAnimationFrame(onTimeUpdate)
}

function onPause() {
  isPlaying = false

  cancelAnimationFrame(animationFrame)
}

function togglePlay() {
  if (isPlaying) {
    audio.pause()
  } else {
    audio.play()
  }
}

function handleSeek(e: Event) {
  const target = e.target as HTMLInputElement
  audio.currentTime = parseFloat(target.value)
}

function handleVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement
  volume = parseFloat(target.value)
  audio.volume = volume
  if (volume > 0) isMuted = false
}

function toggleMute() {
  isMuted = !isMuted
  audio.muted = isMuted
}

onMount(() => {
  audio.addEventListener('loadedmetadata', onLoadedMetadata)
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('play', onPlay)
  audio.addEventListener('pause', onPause)

  // If metadata is already loaded (e.g. from a previous load)
  if (audio.readyState >= 1) {
    duration = audio.duration
  }

  audio.volume = volume
  audio.play()
})

onDestroy(() => {
  audio.pause()
  audio.removeEventListener('loadedmetadata', onLoadedMetadata)
  audio.removeEventListener('ended', onEnded)
  audio.removeEventListener('play', onPlay)
  audio.removeEventListener('pause', onPause)

  cancelAnimationFrame(animationFrame)
})
</script>

<div class="flex flex-col gap-3 p-4 bg-base-200 rounded-xl">
  <div class="flex items-center justify-between">
    <button type="button" onclick={togglePlay} class="btn btn-circle btn-primary btn-sm">
      {#if isPlaying}
          <Pause class="w-4 h-4" />
      {:else}
          <Play class="w-4 h-4 ml-0.5" />
      {/if}
    </button>

      <span class="text-sm font-medium tabular-nums w-12 ml-2 text-base-content/70">
      {formatTime(currentTime)}
    </span>

      <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              bind:value={currentTime}
              oninput={handleSeek}
              class="range range-primary range-xs flex-1"
      />

      <span class="text-sm font-medium tabular-nums w-12 text-base-content/70 text-right">
      {formatTime(duration)}
    </span>

    <div class="flex items-center gap-2">
        <Tooltip triggerProps={{onclick: toggleMute, class: "btn btn-ghost btn-circle btn-sm"}}>
            {#snippet trigger()}
                {#if isMuted || volume === 0}
                    <VolumeX class="w-4 h-4" />
                {:else}
                    <Volume2 class="w-4 h-4" />
                {/if}
            {/snippet}

            <div class="flex-center">
                <input type="range" min="0" max="1" step="0.01" bind:value={volume} oninput={handleVolumeChange} class="range range-xs w-24"/>
                <span class="tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
        </Tooltip>
    </div>
  </div>
</div>
