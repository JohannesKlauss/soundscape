<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import {GripVertical, ChevronLeft, Pen} from "@lucide/svelte";
    import {DragOverlay, useDraggable} from "$lib/dnd";
    import {page} from "$app/state";
    import {replaceState} from "$app/navigation";
    import Tooltip from "$lib/components/Tooltip.svelte";
    import type {Snippet} from "svelte";
    import {padToForm, type SoundPad} from "$lib/domain/soundPad/_types";

    interface Props {
      children?: Snippet
    }

    let {children}: Props = $props()

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

    async function editPad(pad: SoundPad) {
      replaceState('', {editPad: await padToForm(pad)})
    }
</script>

<div class="p-4 text-muted flex-center justify-between">
    <span>Sound Pads</span>

    {@render children?.()}
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
                <GripVertical class="size-4 cursor-drag"/>
                {pad.name} ({pad.type})

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-sm ml-auto", type: 'button', onclick: () => editPad(pad)}}>
                    {#snippet trigger()}
                        <Pen class="size-4"/>
                    {/snippet}

                    Edit Pad
                </Tooltip>
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