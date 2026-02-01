<script lang="ts">
    import {RotateCcw} from "@lucide/svelte";
    import Tooltip from "$lib/components/Tooltip.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import type {SoundSample} from "$lib/domain/soundSample/_types";
    import {db} from "$lib/db";
    import {readBufferFromSamplesFile} from "$lib/fileSystem";
    import {getContext, Player} from "tone";

    interface Props {
      numSamples: number
    }

    let {numSamples}: Props = $props()

    let open = $state(false)
    let isReindexing = $state(false)
    let i = $state(0)
    let currentlyIndexing = $state<SoundSample>()
    let closeIn = $state<number>()

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

        isReindexing = false
        closeIn = 5
      }

      const h = setInterval(() => {
        if (closeIn! <= 1) {
          open = false
          isReindexing = false
          currentlyIndexing = undefined

          clearInterval(h)
        }

        if (closeIn) {
          closeIn--
        }
      }, 1000)
    }
</script>

<Dialog bind:open={open} onConfirm={rebuild} confirmDisabled={isReindexing || closeIn > 0} confirmText="Reindex">
    {#snippet trigger(props)}
        <Tooltip triggerProps={{class: "btn btn-sm btn-circle btn-ghost", ...props}}>
            {#snippet trigger()}
                <RotateCcw class="size-3 text-muted"/>
            {/snippet}

            Reindex Library
        </Tooltip>
    {/snippet}

    {#snippet title()}
      Reindex Library
    {/snippet}

    {#snippet description()}
      Confirm reindexing {numSamples} samples in the library.
    {/snippet}

    {#if isReindexing || closeIn}
        <div class="space-y-2">
            <span class="text-muted mb-2">Reindexed {i} of {numSamples} samples.</span>
            <progress class="progress w-full" value={i / numSamples}></progress>
            <span class="text-muted text-sm">{currentlyIndexing?.name}</span>
        </div>
    {/if}

    {#if !isReindexing && closeIn > 0}
        Reindexing successful! Closing window {closeIn}...
    {/if}
</Dialog>