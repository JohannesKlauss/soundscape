<script lang="ts">
  import type { Player } from 'tone'
  import { Play, Pause, Volume2, VolumeX } from '@lucide/svelte'
  import { onMount, onDestroy } from 'svelte'
  import {formatTime, volumeToDb} from "$lib/engine/volume";
  import Tooltip from "$lib/components/Tooltip.svelte";

  interface Props {
    player: Player
  }

  let { player }: Props = $props()

  let isPlaying = $state(false)
  let currentTime = $state(0)
  let duration = $state(0)
  let volume = $state(1)
  let isMuted = $state(false)
  let animationFrame: number
  let startOffset = 0
  let startedAt: number = 0

  $effect(() => {
    if (player.loaded) {
      duration = player.buffer.duration
    }
  })

  $effect(() => {
    player.volume.value = isMuted ? -Infinity : volumeToDb(volume)
  })

  function updateTime() {
    if (player.state === 'started') {
      const elapsed = player.now() - startedAt
      currentTime = startOffset + elapsed
      if (currentTime < 0) currentTime = 0

      if (currentTime >= duration) {
        currentTime = duration
        isPlaying = false

        cancelAnimationFrame(animationFrame)

        return
      }

      animationFrame = requestAnimationFrame(updateTime)
    }
  }

  function play(offset = 0) {
    startOffset = offset
    player.start(undefined, offset)
    startedAt = player.now()
    isPlaying = true

    updateTime()
  }

  function stop() {
    player.stop()

    isPlaying = false

    cancelAnimationFrame(animationFrame)
  }

  function togglePlay() {
    if (isPlaying) {
      stop()
    } else {
      play(currentTime)
    }
  }

  function handleSeek(e: Event) {
    const target = e.target as HTMLInputElement
    const newTime = parseFloat(target.value)
    currentTime = newTime

    if (isPlaying) {
      stop()
      play(newTime)
    }
  }

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement
    volume = parseFloat(target.value)
    if (volume > 0) isMuted = false
  }

  function toggleMute() {
    isMuted = !isMuted
  }

  onMount(() => {
    if (player.loaded) {
      duration = player.buffer.duration
      play(0)
    }
  })

  onDestroy(() => {
    player.stop()
  })
</script>

<div class="flex flex-col gap-3 p-4 bg-base-200 rounded-xl">
  <div class="flex items-center justify-between">
    <button onclick={togglePlay} class="btn btn-circle btn-primary btn-sm">
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