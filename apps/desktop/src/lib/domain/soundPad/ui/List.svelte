<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import {GripVertical, ChevronLeft} from "@lucide/svelte";
    import {DragOverlay, useDraggable} from "$lib/dnd";
    import {page} from "$app/state";
    import Tooltip from "$lib/components/Tooltip.svelte";

    const pads = liveQuery(() => db.pad.toArray())

    async function moveToSet(padId: number) {
      const setId = parseInt(page.params?.id ?? '0', 10)

      if (setId > 0) {
        await db.setHasPads.add({
          setId,
          padId,
        })
      }
    }
</script>

<div class="p-4 space-y-2 text-muted">
    <div>Sound Pads</div>
</div>

<ul class="text-lg">
    {#each $pads as pad}
        {@const {ref, dragInstanceId} = useDraggable({id: 'pad', data: pad})}

        <li>
            <div class="py-2 px-4 text-sm hover:bg-base-300 flex-center justify-start cursor-pointer" {@attach ref}>
                <Tooltip triggerProps={{onclick: () => moveToSet(pad.id), class:"btn btn-primary btn-ghost btn-circle btn-sm"}}>
                    {#snippet trigger()}
                        <ChevronLeft class="size-5"/>
                    {/snippet}

                    Add to Set
                </Tooltip>
                <GripVertical class="size-3 cursor-drag"/>
                {pad.name} ({pad.type})
            </div>
        </li>

        <DragOverlay {dragInstanceId} offset={{x: 0, y: 0}}>
            <div class="flex-center min-w-50 bg-base-300 drop-shadow-2xl border border-base-content/10 px-2 py-2 text-sm rounded w-fit max-w-fit">
                <GripVertical class="size-3 cursor-drag"/>
                <div>{pad.name}</div>
            </div>
        </DragOverlay>
    {/each}
</ul>