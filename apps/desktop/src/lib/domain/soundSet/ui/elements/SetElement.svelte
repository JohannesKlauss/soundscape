<script lang="ts">
  import type {SoundPad} from "$lib/domain/soundPad/_types";
  import {padIcons} from "$lib/components/padIcons";
  import {readBufferFromSamplesFile} from "$lib/fileSystem";
  import {db} from "$lib/db";
  import {getContext, Players} from "tone";
  import {volumeToDb} from "$lib/engine/volume";
  import {onMount} from "svelte";
  import {XIcon} from "@lucide/svelte";

  interface Props {
    pad: SoundPad
    onDelete?: (padId: number) => void
    editable?: boolean
  }

  let {pad, editable = false, onDelete}: Props = $props()

  let isPlaying = $state(false)
  let lastPlayedSampleId = $state<number>()
  let volume = $state(1)
  let progress = $state(0)

  let players = new Players().toDestination()
  let duration: number = 0
  let startedAt: number = 0
  let animationFrame: number

  onMount(() => {
    return () => {
      players.stopAll().dispose()
    }
  })

  $effect(() => {
    players.volume.value = volumeToDb(volume)
  })

  $effect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationFrame)
    }
  })

  $inspect(isPlaying)

  // Load Pad Samples into Tone Player
  $effect(async () => {
    const samples = await db.sample.where('id').anyOf(pad.sampleIds).toArray()
    const map: Record<string, AudioBuffer> = {}

    await Promise.all(samples.map(async s => {
      map[s.id.toString()] = await getContext().decodeAudioData(await readBufferFromSamplesFile(s.src))
    }))

    players.stopAll().dispose()
    isPlaying = false
    lastPlayedSampleId = undefined
    players = new Players(map).toDestination()
    players.fadeOut = pad.fadeOutSeconds
  })

  function playElement() {
    const sampleId = getNextSampleId()

    const player = players.player(sampleId.toString())

    player.onstop = () => {
      if (pad.sampleIds.length > 1) {
        playElement()
      } else {
        isPlaying = false
      }
    }

    player.fadeIn = lastPlayedSampleId ? 0 : pad.fadeInSeconds
    player.start()

    startedAt = player.now()
    isPlaying = true
    lastPlayedSampleId = sampleId
    duration = player.buffer.duration

    updateProgress()
  }

  function stopElement() {
    if (!lastPlayedSampleId) {
      throw new Error('Tried to stop SetElement player, but the played sampleId is undefined')
    }

    const player = players.player(lastPlayedSampleId.toString())
    player.onstop = () => {
      isPlaying = false
      lastPlayedSampleId = undefined
    }

    players.stopAll()
  }

  function togglePlay() {
    if (isPlaying) {
      stopElement()
    } else {
      playElement()
    }
  }

  function getNextSampleId(): number {
    const index = pad.sampleIds.findIndex(id => id === lastPlayedSampleId)

    if (pad.playbackType === 'round_robin') {
      if (index === -1) {
        return pad.sampleIds[0]
      }

      return pad.sampleIds[(index + 1) % pad.sampleIds.length]
    } else {
      return pad.sampleIds[Math.floor(Math.random() * pad.sampleIds.length)]
    }
  }

  function updateProgress() {
    if (!lastPlayedSampleId) {
      return
    }

    const player = players.player(lastPlayedSampleId.toString())

    if (isPlaying) {
      const currentTime = player.now() - startedAt

      progress = Math.max(0, Math.min(1, currentTime / duration))

      animationFrame = requestAnimationFrame(updateProgress)
    }
  }
</script>

<div class="flex flex-col gap-2 items-center group">
    <div class="flex-center relative">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
        <div class={["radial-progress text-zinc-400 cursor-pointer", progress <= 0 || !isPlaying && "text-transparent!"]} onclick={togglePlay}
             style="--size:4.4rem; --thickness: 2px;" style:--value={100 - progress * 100} role="progressbar">
            <div class={["rounded-full size-16 bg-linear-75 flex justify-center items-center", !isPlaying && "from-zinc-400 to-base-content", isPlaying && "to-primary from-primary/70"]}>
                {#key pad.type}
                    {@const Icon = padIcons[pad.type]}

                    <Icon class="size-8 text-base-100"/>
                {/key}
            </div>
        </div>

        <div class="h-16 w-4 -mt-2">
            <input type="range" class="range range-xs range-vertical w-16" min="0" max="1" value="1" step="0.01"
                   oninput={e => volume = parseFloat(e.target.value)}/>
        </div>

        {#if editable}
            <button onclick={() => onDelete?.(pad.id)} type="button"
                    class="opacity-0 group-hover:opacity-100 transition-opacity btn btn-xs btn-ghost btn-error btn-circle absolute -left-4 -top-1">
                <XIcon class="size-3"/>
            </button>
        {/if}
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <span class={["text-sm cursor-pointer", isPlaying && "text-primary"]} onclick={togglePlay}>{pad.name}</span>
</div>
