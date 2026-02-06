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

  interface Props {
    pad: SoundPad
    volume?: number
    onDelete?: (padId: number) => void
    editable?: boolean
  }

  let {pad, volume: initVolume = 1, editable = false, onDelete}: Props = $props()

  let isPlaying = $state(false)
  let isStopping = $state(false)
  let lastPlayedSampleId = $state<string>()
  let volume = $state(initVolume)
  let progress = $state(0)

  let players = new Players()
  let crossfader = new CrossFade({fade: 0}).toDestination()
  let duration: number = 0
  let startedAt: number = 0
  let animationFrame: number

  const sampleMap: Record<string, AudioBuffer> = {}

  onMount(() => {
    getTransport().on('stop', () => {
      isPlaying = false
      lastPlayedSampleId = undefined
    })

    return () => {
      players.stopAll().dispose()
      crossfader.dispose()
    }
  })

  // Sync to players volume
  $effect(() => {
    if (lastPlayedSampleId) {
      players.player(lastPlayedSampleId).volume.value = volumeToDb(volume)
    } else {
      players.volume.value = volumeToDb(volume)
    }
  })

  // Stop animation
  $effect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationFrame)
    }
  })

  // Load Pad Samples into Tone Player
  $effect(async () => {
    const samples = await db.sample.where('id').anyOf(pad.sampleIds).toArray()

    await Promise.all(samples.map(async s => {
      sampleMap[s.id.toString()] = await getContext().decodeAudioData(await readBufferFromSamplesFile(s.src))

      if (pad.type === 'loop' && pad.sampleIds.length === 1) {
        sampleMap[(s.id + 1).toString()] = sampleMap[s.id.toString()]
      }
    }))

    players.stopAll().dispose()
    isPlaying = false
    lastPlayedSampleId = undefined
    players = new Players(sampleMap).toDestination()
    players.fadeOut = pad.fadeOutSeconds
  })

  function crossfadeToNextSample(time: number) {
    if (!isPlaying) {
      return
    }

    const nextSampleId = getNextSampleId()
    const fade = crossfader.fade.value
    const nextPlayer = players.player(nextSampleId.toString())

    nextPlayer.fadeIn = 0
    nextPlayer.onstop = () => {
      if (pad.sampleIds.length === 1 && pad.type !== 'loop') {
        isPlaying = false
      }

      nextPlayer.fadeIn = 0
      nextPlayer.disconnect().unsync()
    }

    getTransport().schedule(crossfadeToNextSample, `+${Math.max(0, nextPlayer.buffer.duration - pad.crossfade)}`)

    nextPlayer.disconnect().connect(fade < 0.5 ? crossfader.b : crossfader.a).sync().start(time)

    crossfader.fade.rampTo(fade < 0.5 ? 1 : 0, Math.min(pad.crossfade, nextPlayer.buffer.duration), time)

    lastPlayedSampleId = nextSampleId

    getTransport().schedule(t => {
      startedAt = t
      duration = Math.max(0, nextPlayer.buffer.duration - pad.crossfade)
    }, `+${pad.crossfade}`)
  }

  function play() {
    const sampleId = getNextSampleId()
    const player = players.player(sampleId)

    player.onstop = () => {
      if (pad.sampleIds.length === 1 && pad.type !== 'loop') {
        isPlaying = false
      }

      player.fadeIn = 0
      player.disconnect().unsync()
    }

    crossfader.fade.value = 0
    player.fadeIn = pad.fadeInSeconds
    player.disconnect().connect(crossfader.a).sync().start()

    startedAt = player.now()
    isPlaying = true
    lastPlayedSampleId = sampleId
    duration = player.buffer.duration

    if (pad.sampleIds.length > 1 || pad.type === 'loop') {
      getTransport().schedule(crossfadeToNextSample, `+${Math.max(0, player.buffer.duration - pad.crossfade)}`)
    } else {
      player.fadeOut = pad.fadeOutSeconds
    }

    updateProgress()
  }

  function manualStopElement() {
    if (!lastPlayedSampleId) {
      throw new Error('Tried to stop SetElement player, but the lastPlayedSampleId is undefined')
    }

    const player = players.player(lastPlayedSampleId)
    player.onstop = () => {
      isPlaying = false
      isStopping = false
      lastPlayedSampleId = undefined
    }

    isStopping = true
    players.stopAll()
  }

  function togglePlay() {
    if (isPlaying) {
      manualStopElement()
    } else {
      play()
    }
  }

  function getNextSampleId(): string {
    const sampleIds = Object.keys(sampleMap)
    const index = sampleIds.findIndex(id => id.toString() === lastPlayedSampleId?.toString())

    if (pad.playbackType === 'round_robin') {
      if (index === -1) {
        return sampleIds[0]
      }

      return sampleIds[(index + 1) % sampleIds.length]
    } else {
      return sampleIds[Math.floor(Math.random() * sampleIds.length)]
    }
  }

  function updateProgress() {
    if (!lastPlayedSampleId) {
      return
    }

    const player = players.player(lastPlayedSampleId)

    if (isPlaying) {
      const currentTime = player.now() - startedAt

      progress = Math.max(0, Math.min(1, currentTime / duration))

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
        <div class={["radial-progress text-zinc-400 cursor-pointer transition-colors duration-250", !isPlaying && "text-transparent!"]} onclick={togglePlay}
             style="--size:4.4rem; --thickness: 2px;" style:--value={100 - progress * 100}>
            <div class="relative rounded-full size-16">
                <!-- Base layer: gray gradient -->
                <div class="absolute inset-0 rounded-full bg-linear-75 from-zinc-300 to-base-content to-90%"></div>
                <!-- Primary layer: fades in when playing, pulses when stopping -->
                <div class={["absolute inset-0 rounded-full bg-linear-75 to-primary/80 to-90% from-primary transition-opacity", !isPlaying && "opacity-0", isPlaying && !isStopping && "opacity-100", isStopping && "animate-pulse-overlay"]}></div>
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
    <span class={["text-sm cursor-pointer transition-colors duration-250", isPlaying && "text-primary"]} onclick={togglePlay}>{pad.name}</span>
</div>
