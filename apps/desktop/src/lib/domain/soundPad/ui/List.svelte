<script lang="ts">
import { ChevronLeft, Pen, Trash } from '@lucide/svelte'
import { liveQuery } from 'dexie'
import type { Snippet } from 'svelte'
import { replaceState } from '$app/navigation'
import { page } from '$app/state'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import { DragOverlay, useDraggable } from '$lib/dnd'
import { padToForm, padTypeToLabel, type SoundPad } from '$lib/domain/soundPad/_types'
import { padIcons } from '$lib/domain/soundPad/ui/padIcons'

interface Props {
  children?: Snippet
}

let { children }: Props = $props()

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
  replaceState('', { editPad: await padToForm(pad) })
}

async function deletePad(padId: number) {
  const confirmed = await confirmModal(
    'Delete Pad',
    'Are you sure you want to delete this Pad? It will be removed from all Sound Sets that are currently using it',
  )

  if (confirmed) {
    await db.setHasPads.where('padId').equals(padId).delete()
    await db.pad.delete(padId)
  }
}
</script>

<div class="p-4 text-muted flex-center justify-between sticky top-0 bg-base-100">
    <span>Sound Pads</span>

    {@render children?.()}
</div>

<ul class="text-lg">
    {#each $pads as pad}
        {@const {ref, dragInstanceId} = useDraggable({id: 'pad', data: pad})}
        {@const Icon = padIcons[pad.type]}

        <li>
            <div class="py-2 px-4 text-sm hover:bg-base-300 flex-center justify-start cursor-pointer group" {@attach ref}>
                {#if page.route.id?.startsWith('/sets/[id]')}
                    <Tooltip triggerProps={{onclick: () => moveToSet(pad.id), class: "btn btn-primary btn-ghost btn-circle btn-sm"}}>
                        {#snippet trigger()}
                            <ChevronLeft class="size-5"/>
                        {/snippet}

                        Add to Set
                    </Tooltip>
                {/if}

                <Tooltip>
                    {#snippet trigger()}
                        <Icon class="size-5"/>
                    {/snippet}

                    {padTypeToLabel[pad.type]}
                </Tooltip>

                <span onclick={() => editPad(pad)}>{pad.name}</span>

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-sm ml-auto opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => editPad(pad)}}>
                    {#snippet trigger()}
                        <Pen class="size-4"/>
                    {/snippet}

                    Edit Pad
                </Tooltip>

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-sm ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => deletePad(pad.id)}}>
                    {#snippet trigger()}
                        <Trash class="size-4"/>
                    {/snippet}

                    Delete Pad
                </Tooltip>
            </div>
        </li>

        <DragOverlay {dragInstanceId} offset={{x: 0, y: 0}}>
            <div class="flex-center min-w-50 bg-base-300 drop-shadow-2xl border border-base-content/10 px-2 py-2 text-sm rounded w-fit max-w-fit">
                <div>{pad.name}</div>
            </div>
        </DragOverlay>
    {/each}
</ul>