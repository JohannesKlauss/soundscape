<script lang="ts">
import { Library, Search } from '@lucide/svelte'
import { Collapsible } from 'bits-ui'
import { liveQuery } from 'dexie'
import BottomSheet from '$lib/components/BottomSheet.svelte'
import { db } from '$lib/db'
import CreateNew from '$lib/domain/soundSample/ui/CreateNew.svelte'
import List from '$lib/domain/soundSample/ui/List.svelte'
import ReindexLibrary from '$lib/domain/soundSample/ui/ReindexLibrary.svelte'
import {fade} from "svelte/transition";
import Fuse from "fuse.js";

let open = $state(false)
let searchText = $state('')

const samples = liveQuery(() => db.sample.toArray())

const filteredSamples = $derived.by(() => {
  if (searchText.length < 2) {
    return $samples
  }

  const f = new Fuse($samples, {
    keys: ['name'],
    minMatchCharLength: 2,
  })

  return f.search(searchText).map(r => r.item).toSorted((a, b) => a.id - b.id)
})

$inspect(filteredSamples)
</script>

<div class="bg-base-100">
    <BottomSheet bind:open={open}>
        {#snippet title()}
            <Collapsible.Trigger class="flex-center justify-start w-full">
                <Library class="size-4"/>
                {#if $samples?.length !== filteredSamples?.length}
                    <span class="text-sm opacity-60 tracking-wide">Show {filteredSamples.length} (of {$samples?.length}) Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
                {:else}
                    <span class="text-sm opacity-60 tracking-wide">{$samples?.length} Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
                {/if}

                {#if open}
                    {@render searchInput()}
                {/if}
            </Collapsible.Trigger>

            <ReindexLibrary numSamples={$samples.length}/>
            <div class="ml-auto"><CreateNew/></div>
        {/snippet}

        <div class="max-h-[50vh] overflow-y-scroll">
            <List samples={filteredSamples}/>
        </div>
    </BottomSheet>
</div>

{#snippet searchInput()}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <label class="input input-sm ml-auto mr-2 w-80" transition:fade={{duration: 250}} onclick={e => e.stopPropagation()}>
        <Search class="size-3"/>
        <input
                type="text"
                required
                placeholder="Search Library"
                bind:value={searchText}
        />
    </label>
{/snippet}