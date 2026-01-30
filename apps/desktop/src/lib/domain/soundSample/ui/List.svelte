<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import type {Snippet} from "svelte";
    import {AudioWaveform, PlayIcon} from "@lucide/svelte";
    import QuickPreviewPlayer from "$lib/domain/soundSample/ui/QuickPreviewPlayer.svelte";

    interface Props {
      children?: Snippet
    }

    let {children}: Props = $props()

    const samples = liveQuery(() => db.sample.toArray())
</script>

<div class="flex-center justify-between p-4 pb-2">
    <span class="text-sm opacity-60 tracking-wide">{$samples?.length} Sample{$samples?.length !== 1 ? 's' : null} in Library</span>

    {@render children?.()}
</div>

<ul class="list">
    {#each $samples as sample}
        <li class="list-row hover:bg-base-300 flex-center">
            <AudioWaveform/>
            <div class="text-lg">{sample.name}</div>

            <QuickPreviewPlayer src={sample.src} contentType={sample.contentType} />
        </li>
    {/each}
</ul>