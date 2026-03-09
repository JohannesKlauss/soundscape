<script lang="ts">
import { ChevronLeft, Pen, Search, Trash, X } from '@lucide/svelte'
import { liveQuery } from 'dexie'
import type { Snippet } from 'svelte'
import { SvelteSet } from 'svelte/reactivity'
import { replaceState } from '$app/navigation'
import { page } from '$app/state'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import { padToForm, padTypeToLabel, type SoundPad, type SoundPadType } from '$lib/domain/soundPad/_types'
import { padIcons } from '$lib/domain/soundPad/ui/padIcons'
import {ensureElementPlayer} from "$lib/engine/engine.svelte";
import {fade} from "svelte/transition";
import Fuse from "fuse.js";

interface Props {
  children?: Snippet
}

let { children }: Props = $props()

let searchText = $state('')
let activeTypeFilters = new SvelteSet<SoundPadType>()

function toggleTypeFilter(type: SoundPadType) {
  if (activeTypeFilters.has(type)) activeTypeFilters.delete(type)
  else activeTypeFilters.add(type)
}

const pads = liveQuery(() => db.pad.toArray())

const filteredPads = $derived.by(() => {
  let result = $pads

  if (activeTypeFilters.size > 0) {
    result = result?.filter(p => activeTypeFilters.has(p.type))
  }

  if (!result || searchText.length < 2) {
    return result
  }

  const f = new Fuse(result, {
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

<div class="p-4 text-muted flex-center justify-between sticky top-0 bg-base-100 z-10">
    <span>Sound Pads</span>

    {@render children?.()}
</div>

<div class="px-4 py-2 flex-center sticky top-16 bg-base-100 z-10 shadow-xl">
    {@render searchInput()}

    {#each Object.entries(padIcons) as [type, Icon]}
        {@const padType = type as SoundPadType}
        <Tooltip triggerProps={{
            class: `btn btn-xs btn-circle ${activeTypeFilters.has(padType) ? 'btn-primary' : 'btn-ghost'}`,
            type: 'button',
            onclick: () => toggleTypeFilter(padType)
        }}>
            {#snippet trigger()}
                <Icon class="size-3"/>
            {/snippet}

            {padTypeToLabel[padType]}
        </Tooltip>
    {/each}
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

                        Add to Soundscape
                    </Tooltip>
                {/if}

                <Tooltip>
                    {#snippet trigger()}
                        <Icon class="size-5"/>
                    {/snippet}

                    {padTypeToLabel[pad.type]}
                </Tooltip>

                <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <span class="text-ellipsis line-clamp-1" onclick={() => editPad(pad)}>{pad.name}</span>

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-sm ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => deletePad(pad.id)}}>
                    {#snippet trigger()}
                        <Trash class="size-4"/>
                    {/snippet}

                    Delete Pad
                </Tooltip>
            </div>
        </li>
    {:else}
        <div class="text-center text-muted mt-8 text-xs">Create Pads to add them to your Soundscapes</div>
    {/each}
</ul>

{#snippet searchInput()}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <label class="input input-sm" transition:fade={{duration: 250}} onclick={e => e.stopPropagation()}>
        <Search class="size-3"/>
        <input
                type="text"
                required
                placeholder="Search Pads"
                bind:value={searchText}
        />
        {#if searchText.length > 0}
            <button type="button" class="btn btn-ghost btn-circle btn-xs" onclick={() => { searchText = '' }}>
                <X class="size-3"/>
            </button>
        {/if}
    </label>
{/snippet}