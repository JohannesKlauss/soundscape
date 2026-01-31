<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import {AudioWaveform, GripVertical} from "@lucide/svelte";
    import QuickPreviewPlayer from "$lib/domain/soundSample/ui/QuickPreviewPlayer.svelte";
    import {useDraggable, DragOverlay} from "$lib/dnd";
    import type {SoundSample} from "$lib/domain/soundSample/_types";

    const samples = liveQuery(() => db.sample.toArray())
</script>

<ul class="list">
    {#each $samples as sample}
        {@const {ref, dragInstanceId} = useDraggable<SoundSample>({id: 'sample', data: sample})}

        <li class="list-row hover:bg-base-300 flex-center">
            <div class="flex-center">
                <AudioWaveform class="size-5"/>
                <div class="text-lg">{sample.name}</div>
                <div {@attach ref}>
                    <GripVertical class="size-5 text-muted cursor-grab"/>
                </div>
            </div>

            <div class="ml-auto">
                <QuickPreviewPlayer src={sample.src} contentType={sample.contentType} />
            </div>
        </li>

        <DragOverlay {dragInstanceId}>
            <div class="flex-center min-w-50 bg-base-300 drop-shadow-2xl border border-base-content/10 px-2 py-2 rounded w-fit max-w-fit">
                <AudioWaveform class="size-5"/>
                <div>{sample.name}</div>
            </div>
        </DragOverlay>
    {/each}
</ul>