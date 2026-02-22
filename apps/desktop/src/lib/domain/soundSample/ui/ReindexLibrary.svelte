<script lang="ts">
import { RotateCcw } from '@lucide/svelte'
import { getContext, Player } from 'tone'
import Dialog from '$lib/components/Dialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import type { SoundSample } from '$lib/domain/soundSample/_types'
import { readBufferFromSamplesFile } from '$lib/fileSystem'

interface Props {
  numSamples: number
}

let { numSamples }: Props = $props()

let open = $state(false)
let isReindexing = $state(false)
let i = $state(0)
let currentlyIndexing = $state<SoundSample>()
let closeInSeconds = $state<number>()

async function rebuild() {
  isReindexing = true

  const samples = await db.sample.toArray()

  for (i = 0; i < samples.length; i++) {
    const sample = samples[i]

    currentlyIndexing = sample

    const buffer = await getContext().decodeAudioData(await readBufferFromSamplesFile(sample.src))
    const player = new Player(buffer)

    const newSample: SoundSample = {
      ...sample,
      duration: player.buffer.duration,
    }

    await db.sample.update(sample.id, newSample)
  }

  isReindexing = false
  closeInSeconds = 5

  const h = setInterval(() => {
    if (closeInSeconds! <= 1) {
      open = false
      isReindexing = false
      currentlyIndexing = undefined

      clearInterval(h)
    }

    if (closeInSeconds) {
      closeInSeconds--
    }
  }, 1000)
}
</script>

<Dialog bind:open={open} onConfirm={rebuild} confirmDisabled={isReindexing || (!!closeInSeconds && closeInSeconds > 0)} confirmText="Reindex">
    {#snippet trigger(props)}
        <Tooltip triggerProps={{class: "btn btn-sm btn-circle btn-ghost", ...props}}>
            {#snippet trigger()}
                <RotateCcw class="size-3 text-muted"/>
            {/snippet}

            Reindex Library
        </Tooltip>
    {/snippet}

    {#snippet title()}
      Reindex Your Library
    {/snippet}

    {#snippet description()}
        <p>Reindexing your library extracts all metadata from your library, so that soundscape can display all relevant information of
        your sound files like duration, name, etc.</p>
        <p>If sounds in your library appear broken, use reindexing, to fix your library.</p>
        <p>Depending on the size of your library this can take a while.</p>
    {/snippet}

    {#if isReindexing || closeInSeconds}
        <div class="divider"></div>
        <div class="space-y-2">
            <span>Reindexed {i} of {numSamples} samples.</span>
            <progress class="progress w-full mt-2" value={i / numSamples}></progress>
            {#if isReindexing}
                <span class="text-muted text-sm">
                    Reindexing {currentlyIndexing?.name}
                    <span class="loading loading-bars loading-xs"></span>
                </span>
            {/if}
        </div>
    {/if}

    {#if !isReindexing && !!closeInSeconds && closeInSeconds > 0}
        Reindexing successful! Closing window {closeInSeconds}...
    {/if}
</Dialog>