<script lang="ts">
    import type {SoundPad} from "$lib/domain/soundPad/_types";
    import {padIcons} from "$lib/components/padIcons";
    import {readBufferFromSamplesFile} from "$lib/fileSystem";
    import {db} from "$lib/db";
    import {getContext, Players} from "tone";
    import {volumeToDb} from "$lib/engine/volume";
    import {onMount} from "svelte";

    interface Props {
      pad: SoundPad
    }

    let {pad}: Props = $props()

    let isPlaying = $state(false)
    let lastPlayedSampleId = $state<number>()
    let volume = $state(1)
    let players = new Players().toDestination()

    onMount(() => {
      return () => {
        players.stopAll().dispose()
      }
    })

    $effect(() => {
      players.volume.value = volumeToDb(volume)
    })

    $effect(async () => {
      const samples = await db.sample.where('id').anyOf(pad.sampleIds).toArray()
      const map: Record<string, AudioBuffer> = {}

      await Promise.all(samples.map(async s => {
        map[s.id.toString()] = await getContext().decodeAudioData(await readBufferFromSamplesFile(s.src))
      }))

      players = new Players(map).toDestination()
      players.fadeIn = pad.fadeInSeconds
      players.fadeOut = pad.fadeOutSeconds
    })

    function playElement() {
      const sampleId = getNextSampleId()

      const player = players.player(sampleId.toString())
      player.fadeIn = pad.fadeInSeconds

      player.onstop = () => {
        if (pad.sampleIds.length > 1) {
          playElement()
        } else {
          isPlaying = false
        }
      }

      player.start()
      isPlaying = true
      lastPlayedSampleId = sampleId
    }

    function stopElement() {
      if (!lastPlayedSampleId) {
        throw new Error('Tried to stop SetElement player, but the played sampleId is undefined')
      }

      const player = players.player(lastPlayedSampleId.toString())
      player.fadeOut = pad.fadeOutSeconds
      player.onstop = () => {
        isPlaying = false
        lastPlayedSampleId = undefined
      }
      player.stop(pad.fadeOutSeconds)
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
</script>

<div class="flex flex-col gap-2 items-center">
    <div class="flex-center">
        <div class={["rounded-full size-16 bg-linear-75 flex justify-center items-center cursor-pointer", !isPlaying && "from-zinc-400 to-base-content", isPlaying && "to-primary from-primary/70"]} onclick={togglePlay}>
            {#key pad.type}
                {@const Icon = padIcons[pad.type]}

                <Icon class="size-8 text-base-100"/>
            {/key}
        </div>

        <div class="h-16 w-4 -mt-2">
            <input type="range" class="range range-xs range-vertical w-16" min="0" max="1" value="1" step="0.01" oninput={e => volume = parseFloat(e.target.value)} />
        </div>
    </div>

    <span class={["text-sm cursor-pointer", isPlaying && "text-primary"]} onclick={togglePlay}>{pad.name}</span>
</div>
