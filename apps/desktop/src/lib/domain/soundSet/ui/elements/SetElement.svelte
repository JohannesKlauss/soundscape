<script lang="ts">
import { XIcon } from '@lucide/svelte'
import { watch } from 'runed'
import { Tween } from 'svelte/motion'
import { page } from '$app/state'
import Tooltip from '$lib/components/Tooltip.svelte'
import type { SoundPad } from '$lib/domain/soundPad/_types'
import { padIcons } from '$lib/domain/soundPad/ui/padIcons'
import {getElementPlayer, CROSSFADE_SECONDS_BETWEEN_MOODS} from '$lib/engine/engine.svelte'

interface Props {
  pad: SoundPad
  volume?: number
  onDelete?: (padId: number) => void
  onChangeSettingsForMood: (padId: number, volume: number, playAtMoodStart: boolean) => void
  editable?: boolean
}

let { pad, volume: volumeFromMood = .75, editable = false, onDelete, onChangeSettingsForMood }: Props = $props()

let playAtMoodStart = $derived(!!page.state.editMood?.elements?.[pad.id])
let progress = $state(0)
let volume = $state(new Tween(volumeFromMood, { duration: 0 }))

const player = $derived(getElementPlayer(pad.id))

let animationFrame: number

watch(
  () => volumeFromMood,
  () => {
    volume.set(volumeFromMood, {
      duration: player.isPlaying ? CROSSFADE_SECONDS_BETWEEN_MOODS * 1000 : 0,
    })
  },
)

$effect(() => {
  if (!player.isPlaying) {
    cancelAnimationFrame(animationFrame)
  } else {
    updateProgress()
  }
})

$effect(() => {
  onChangeSettingsForMood(pad.id, volume.current, playAtMoodStart)
})

function togglePlay() {
  if (player.isPlaying) {
    player.stop()
  } else {
    player.play()
  }
}

function updateProgress() {
  if (!player.lastPlayedSampleId) {
    return
  }

  if (player.isPlaying && player.currentAudio) {
    const currentTime = player.currentAudio.currentTime

    progress = Math.max(0, Math.min(1, currentTime / player.duration))

    animationFrame = requestAnimationFrame(updateProgress)
  }
}

function handleRangeWheel(e: WheelEvent) {
  e.preventDefault()

  const delta = e.deltaY < 0 ? -0.01 : 0.01
  const newVal = Math.round(Math.max(0, Math.min(1, volume.current + delta)) * 100) / 100

  volume.target = newVal
  player.volume = newVal
}
</script>

<div class="flex flex-col gap-2 items-center group max-w-full">
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
                       value={volume.current}
                       oninput={e => {
                         const val = parseFloat((e.target as HTMLInputElement).value)
                         volume.set(val, {duration: 50})
                         player.volume = val
                       }}
                       onwheel={handleRangeWheel}/>
            {/snippet}

            {Math.round(volume.current * 100)}%
        </Tooltip>

        {#if editable}
            <Tooltip triggerProps={{class: "transition-opacity btn btn-xs btn-ghost btn-error btn-circle absolute -left-4 -top-1", onclick: () => onDelete?.(pad.id)}}>
                {#snippet trigger()}
                    <XIcon class="size-3"/>
                {/snippet}

                Remove Sound Pad from Soundscape
            </Tooltip>
        {/if}
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="flex-center max-w-full label">
        <span class={["text-sm cursor-pointer transition-colors duration-250 text-ellipsis overflow-hidden whitespace-nowrap select-none", player.isPlaying && "text-primary"]} onclick={togglePlay}>
            {pad.name}
        </span>
    </div>

    {#if page.state.editMood}
        <Tooltip side="bottom" triggerProps={{class: "label text-sm"}}>
            {#snippet trigger()}
                <input type="checkbox" bind:checked={playAtMoodStart} class="checkbox checkbox-sm checkbox-primary" />
            {/snippet}
            Play element when Mood starts
        </Tooltip>
    {/if}
</div>
