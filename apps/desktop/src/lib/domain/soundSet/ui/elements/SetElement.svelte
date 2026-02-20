<script lang="ts">
  import type {SoundPad} from "$lib/domain/soundPad/_types";
  import {padIcons} from "$lib/domain/soundPad/ui/padIcons";
  import {readBufferFromSamplesFile} from "$lib/fileSystem";
  import {db} from "$lib/db";
  import {CrossFade, getContext, getTransport, type Player, Players} from "tone";
  import {volumeToDb} from "$lib/engine/volume";
  import {onMount} from "svelte";
  import {XIcon} from "@lucide/svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import type {ElementPlayer} from "$lib/engine/ElementPlayer.svelte";
  import {getElementPlayer} from "$lib/engine/engine.svelte";

  interface Props {
    pad: SoundPad
    volume?: number
    onDelete?: (padId: number) => void
    editable?: boolean
  }

  let {pad, volume: initVolume = 1, editable = false, onDelete}: Props = $props()

  let progress = $state(0)
  let volume = $derived(initVolume)

  const player = $derived.by(() => getElementPlayer(pad.id))

  let animationFrame: number

  $effect(() => {
    player.volume = volume
  })

  $effect(() => {
    if (!player.isPlaying) {
      cancelAnimationFrame(animationFrame)
    }
  })

  function togglePlay() {
    if (player.isPlaying) {
      player.stop()
    } else {
      player.play()

      updateProgress()
    }
  }

  function updateProgress() {
    if (!player.lastPlayedSampleId) {
      return
    }

    if (player.isPlaying && player.currentPlayer) {
      const currentTime = player.currentPlayer.now() - player.startedAt

      progress = Math.max(0, Math.min(1, currentTime / player.duration))

      animationFrame = requestAnimationFrame(updateProgress)
    }
  }

  function handleRangeWheel(
    e: WheelEvent,
  ) {
    e.preventDefault()

    const delta = e.deltaY < 0 ? -0.01 : 0.01

    volume = Math.round(Math.max(0, Math.min(1, volume + delta)) * 100) / 100
  }
</script>

<div class="flex flex-col gap-2 items-center group">
    <div class="flex-center relative">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class={["radial-progress text-zinc-400 cursor-pointer transition-colors duration-250", !player.isPlaying && "text-transparent!"]} onclick={togglePlay}
             style="--size:4.4rem; --thickness: 2px;" style:--value={100 - progress * 100}>
            <div class="relative rounded-full size-16">
                <!-- Base layer: gray gradient -->
                <div class="absolute inset-0 rounded-full bg-linear-75 from-zinc-300 to-base-content to-90%"></div>
                <!-- Primary layer: fades in when playing, pulses when stopping -->
                <div class={["absolute inset-0 rounded-full bg-linear-75 to-primary/80 to-90% from-primary transition-opacity", !player.isPlaying && "opacity-0", player.isPlaying && !player.isStopping && "opacity-100", player.isStopping && "animate-pulse-overlay"]}></div>
                <!-- Icon -->
                <div class="absolute inset-0 flex justify-center items-center">
                    {#key pad.type}
                        {@const Icon = padIcons[pad.type]}
                        <Icon class="size-8 text-base-100"/>
                    {/key}
                </div>
            </div>
        </div>

        <Tooltip triggerProps={{class: "h-16 w-4 -mt-12"}} disableCloseOnTriggerClick side="right">
            {#snippet trigger()}
                <input type="range" class="range range-xs range-vertical w-16" min="0" max="1" step="0.01"
                       bind:value={volume}
                       oninput={e => volume = parseFloat(e.target.value)}
                       onwheel={handleRangeWheel}/>
            {/snippet}

            {Math.round(volume * 100)}%
        </Tooltip>

        {#if editable}
            <button onclick={() => onDelete?.(pad.id)} type="button"
                    class="opacity-0 group-hover:opacity-100 transition-opacity btn btn-xs btn-ghost btn-error btn-circle absolute -left-4 -top-1">
                <XIcon class="size-3"/>
            </button>
        {/if}
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <span class={["text-sm cursor-pointer transition-colors duration-250", player.isPlaying && "text-primary"]} onclick={togglePlay}>{pad.name}</span>
</div>
