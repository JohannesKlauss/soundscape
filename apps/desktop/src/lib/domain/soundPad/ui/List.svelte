<script lang="ts">
import { ChevronLeft, Pen, Trash, Search } from '@lucide/svelte'
import { liveQuery } from 'dexie'
import type { Snippet } from 'svelte'
import { replaceState } from '$app/navigation'
import { page } from '$app/state'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import { padToForm, padTypeToLabel, type SoundPad } from '$lib/domain/soundPad/_types'
import { padIcons } from '$lib/domain/soundPad/ui/padIcons'
import {ensureElementPlayer} from "$lib/engine/engine.svelte";
import {fade} from "svelte/transition";
import Fuse from "fuse.js";

interface Props {
  children?: Snippet
}

let { children }: Props = $props()

let searchText = $state('')

const pads = liveQuery(() => db.pad.toArray())

const filteredPads = $derived.by(() => {
  if (searchText.length < 2) {
    return $pads
  }

  const f = new Fuse($pads, {
    keys: ['name'],
    minMatchCharLength: 2,
    threshold: 0.3,
  })

  return f.search(searchText).map(r => r.item).toSorted((a, b) => a.id - b.id)
})

async function moveToSet(padId: number) {
  const setId = parseInt(page.params?.id ?? '0', 10)

  await ensureElementPlayer(padId)

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

    {@render searchInput()}

    {@render children?.()}
</div>

<ul class="text-lg">
    {#each filteredPads as pad}
        {@const Icon = padIcons[pad.type]}

        <li>
            <div class="py-2 px-4 text-sm hover:bg-base-300 flex-center justify-start cursor-pointer group">
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

                <span class="text-ellipsis line-clamp-1" onclick={() => editPad(pad)}>{pad.name}</span>

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
    {/each}
</ul>

{#snippet searchInput()}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <label class="input input-sm w-40" transition:fade={{duration: 250}} onclick={e => e.stopPropagation()}>
        <Search class="size-3"/>
        <input
                type="text"
                required
                placeholder="Search Pads"
                bind:value={searchText}
        />
    </label>
{/snippet}