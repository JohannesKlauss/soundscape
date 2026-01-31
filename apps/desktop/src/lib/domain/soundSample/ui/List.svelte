<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import {AudioWaveform} from "@lucide/svelte";
    import QuickPreviewPlayer from "$lib/domain/soundSample/ui/QuickPreviewPlayer.svelte";

    const samples = liveQuery(() => db.sample.toArray())
</script>

<ul class="list">
    {#each $samples as sample}
        <li class="list-row hover:bg-base-300 flex-center">
            <AudioWaveform/>
            <div class="text-lg">{sample.name}</div>

            <QuickPreviewPlayer src={sample.src} contentType={sample.contentType} />
        </li>
    {/each}
</ul>