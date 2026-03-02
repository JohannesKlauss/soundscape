<script lang="ts">
import { Library, Search, Upload } from '@lucide/svelte'
import { Collapsible } from 'bits-ui'
import { liveQuery } from 'dexie'
import BottomSheet from '$lib/components/BottomSheet.svelte'
import { db } from '$lib/db'
import CreateNew from '$lib/domain/soundSample/ui/CreateNew.svelte'
import FreesoundList from '$lib/domain/soundSample/ui/FreesoundList.svelte'
import List from '$lib/domain/soundSample/ui/List.svelte'
import ReindexLibrary from '$lib/domain/soundSample/ui/ReindexLibrary.svelte'
import { freesoundState, searchFreesound, loadNextFreesoundPage, clearFreesoundResults } from '$lib/freesound'
import Fuse from 'fuse.js'
import {stopPreviewSource} from "$lib/domain/previewPlayer/previewPlayer.svelte";
import {dropNewSampleDnd, dropNewSampleState} from "$lib/domain/soundSample/ui/dropNewSample.svelte";

let open = $state(false)
let searchText = $state('')
let scrollContainer: HTMLDivElement | undefined = $state()
let sentinel: HTMLDivElement | undefined = $state()

const samples = liveQuery(() => db.sample.toArray())

const {handleOverlayDragOver, handleOverlayDrop} = dropNewSampleDnd()

const filteredSamples = $derived.by(() => {
  if (searchText.length < 2) {
    return $samples
  }

  const f = new Fuse($samples, {
    keys: ['name'],
    minMatchCharLength: 2,
    threshold: 0.3,
  })

  return f.search(searchText).map(r => r.item).toSorted((a, b) => a.id - b.id)
})

$effect(() => {
  if (searchText.length >= 2) {
    open = true
    searchFreesound(searchText)
    stopPreviewSource()
  } else {
    clearFreesoundResults()
  }
})

$effect(() => {
  if (!sentinel || !scrollContainer) return

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && freesoundState.hasMore && !freesoundState.isLoadingMore) {
        loadNextFreesoundPage()
      }
    },
    { root: scrollContainer, threshold: 0.1 },
  )

  observer.observe(sentinel)

  return () => observer.disconnect()
})
</script>

<div class="bg-base-100 relative">
    <BottomSheet bind:open={open}>
        {#snippet title()}
            <Collapsible.Trigger class="flex-center justify-start w-full">
                <Library class="size-4"/>
                {#if $samples?.length !== filteredSamples?.length}
                    <span class="text-sm opacity-60 tracking-wide">Show {filteredSamples.length} (of {$samples?.length}) Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
                {:else}
                    <span class="text-sm opacity-60 tracking-wide">{$samples?.length} Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
                {/if}

                {@render searchInput()}
            </Collapsible.Trigger>

            <ReindexLibrary numSamples={$samples.length}/>
            <div class="ml-auto">
                <CreateNew bind:open={dropNewSampleState.createNewOpen} bind:name={dropNewSampleState.createNewName} bind:file={dropNewSampleState.createNewFile}/>
            </div>
        {/snippet}

        <div class="max-h-[50vh] overflow-y-scroll" bind:this={scrollContainer}>
            <List samples={filteredSamples}/>

            {#if freesoundState.results.length > 0}
                <div class="divider text-xs text-muted px-4 my-0">freesound.org ({freesoundState.totalCount} results)</div>
                <FreesoundList sounds={freesoundState.results}/>
            {/if}

            {#if freesoundState.isSearching || freesoundState.isLoadingMore}
                <div class="flex items-center justify-center py-4">
                    <span class="loading loading-spinner loading-sm"></span>
                </div>
            {:else if filteredSamples?.length === 0 && freesoundState.totalCount === 0}
                <div class="flex items-center justify-center py-4 text-muted">
                    No results found.
                </div>
            {/if}

            {#if freesoundState.error}
                <div class="text-xs text-error text-center py-2">{freesoundState.error}</div>
            {/if}

            <!-- Sentinel element for infinite scroll -->
            <div bind:this={sentinel} class="h-1"></div>
        </div>
    </BottomSheet>

    {#if dropNewSampleState.isDraggingFile}
        {@render dropzone()}
    {/if}
</div>

{#snippet searchInput()}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <label class="input input-sm ml-auto mr-2 w-80" onclick={e => e.stopPropagation()}>
        <Search class="size-3"/>
        <input
                type="text"
                required
                placeholder="Search Library & freesound.org"
                bind:value={searchText}
                onkeydown={e => e.stopPropagation()}
        />
    </label>
{/snippet}

{#snippet dropzone()}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
            class="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg backdrop-blur-sm"
            ondrop={handleOverlayDrop}
            ondragover={handleOverlayDragOver}
    >
        <div class="flex flex-col items-center gap-2 pointer-events-none">
            <Upload class="size-8 text-primary" />
            <span class="text-sm font-medium text-primary">Drop audio file to add to library</span>
            <span class="text-xs text-primary/60">MP3, WAV, OGG, FLAC, AAC, M4A, WebM</span>
        </div>
    </div>
{/snippet}