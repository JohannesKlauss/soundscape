<script lang="ts">
import { ArrowUpDown, Library, Search, Upload, X } from '@lucide/svelte'
import { Collapsible, Select } from 'bits-ui'
import { liveQuery } from 'dexie'
import Fuse from 'fuse.js'
import { SvelteSet } from 'svelte/reactivity'
import BottomSheet from '$lib/components/BottomSheet.svelte'
import { db } from '$lib/db'
import type { SoundSampleCategory } from '$lib/domain/library/_types'
import CreateNew from '$lib/domain/library/ui/CreateNew.svelte'
import {dropNewSampleDnd, dropNewSampleState} from "$lib/domain/library/ui/dropNewSample.svelte";
import FreesoundSearch from "$lib/domain/library/ui/FreesoundSearch.svelte";
import List from '$lib/domain/library/ui/List.svelte'
import ReindexLibrary from '$lib/domain/library/ui/ReindexLibrary.svelte'
import { sampleIcons } from '$lib/domain/library/ui/sampleIcons'
import {stopPreviewSource} from "$lib/domain/previewPlayer/previewPlayer.svelte";
import { clearFreesoundResults, searchFreesound } from '$lib/freesound'

const categoryLabels: Record<SoundSampleCategory, string> = {
  music: 'Music',
  fx: 'SFX',
  atmosphere: 'Ambience',
}

type SortOption = 'name-asc' | 'name-desc' | 'duration-asc' | 'duration-desc' | 'newest' | 'oldest'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'duration-asc', label: 'Shortest first' },
  { value: 'duration-desc', label: 'Longest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

let open = $state(false)
let searchText = $state('')
let scrollContainer: HTMLDivElement | undefined = $state()
let activeCategoryFilters = new SvelteSet<SoundSampleCategory>()
let activeTagFilters = new SvelteSet<string>()
let sortValue = $state<SortOption>('name-asc')

function toggleCategoryFilter(cat: SoundSampleCategory) {
  if (activeCategoryFilters.has(cat)) activeCategoryFilters.delete(cat)
  else activeCategoryFilters.add(cat)
}

function toggleTagFilter(tag: string) {
  if (activeTagFilters.has(tag)) activeTagFilters.delete(tag)
  else activeTagFilters.add(tag)
}

const samples = liveQuery(() => db.sample.toArray())

const {handleOverlayDragOver, handleOverlayDrop} = dropNewSampleDnd()

function applySorting<T extends { name: string; duration: number; id: number }>(items: T[], sort: SortOption): T[] {
  return items.toSorted((a, b) => {
    switch (sort) {
      case 'name-asc': return a.name.localeCompare(b.name)
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'duration-asc': return a.duration - b.duration
      case 'duration-desc': return b.duration - a.duration
      case 'newest': return b.id - a.id
      case 'oldest': return a.id - b.id
      default: return b.id - a.id
    }
  })
}

const categoryFilteredSamples = $derived.by(() => {
  return activeCategoryFilters.size > 0
    ? $samples?.filter(s => activeCategoryFilters.has(s.category))
    : $samples
})

const availableTags = $derived.by(() => {
  if (!categoryFilteredSamples) {
    return []
  }

  const tagSet = new Set<string>()

  for (const s of categoryFilteredSamples) {
    for (const t of s.tags ?? []) tagSet.add(t)
  }

  return [...tagSet].sort()
})

const filteredSamples = $derived.by(() => {
  let result = categoryFilteredSamples

  if (result && activeTagFilters.size > 0) {
    result = result.filter(s => {
      const sampleTags = s.tags ?? []

      for (const tag of activeTagFilters) {
        if (!sampleTags.includes(tag)) {
          return false
        }
      }

      return true
    })
  }

  if (result && searchText.length >= 2) {
    const f = new Fuse(result, {
      keys: ['name', 'tags'],
      minMatchCharLength: 2,
      threshold: 0.3,
    })

    result = f.search(searchText).map(r => r.item)
  }

  return result && sortValue ? applySorting(result, sortValue) : result
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
</script>

<div class="bg-base-100 relative">
    <BottomSheet bind:open={open}>
        {#snippet header()}
            <div class="flex-center justify-start w-full">
                <Collapsible.Trigger class="flex-center justify-start w-full">
                    <Library class="size-4"/>
                    {#if $samples?.length !== filteredSamples?.length}
                        <span class="text-sm opacity-60 tracking-wide">Show {filteredSamples.length} (of {$samples?.length}) Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
                    {:else}
                        <span class="text-sm opacity-60 tracking-wide">{$samples?.length} Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
                    {/if}
                </Collapsible.Trigger>

                {@render searchInput()}
            </div>

            <ReindexLibrary numSamples={$samples.length}/>
            <div class="ml-auto">
                <CreateNew bind:open={dropNewSampleState.createNewOpen} bind:name={dropNewSampleState.createNewName} bind:file={dropNewSampleState.createNewFile}/>
            </div>
        {/snippet}

        <div class="bg-base-300">
            {@render filter()}

            {#if availableTags.length > 0}
                {@render tagFilter()}
            {/if}

            <div class="min-h-[50vh] max-h-[50vh] overflow-y-scroll" bind:this={scrollContainer}>
                <List samples={filteredSamples}/>

                <FreesoundSearch {scrollContainer} isSearchActive={searchText.length >= 2}/>
            </div>
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
        {#if searchText.length > 0}
            <button type="button" class="btn btn-ghost btn-circle btn-xs" onclick={() => { searchText = '' }}>
                <X class="size-3"/>
            </button>
        {/if}
    </label>
{/snippet}

{#snippet sortSelect()}
    <Select.Root type="single" value={sortValue ?? 'name-asc'} onValueChange={(v) => { sortValue = (v ?? 'name-asc') as SortOption }}>
        <Select.Trigger class={["btn btn-circle btn-sm", sortValue ? 'btn-primary' : 'btn-ghost']}>
            <ArrowUpDown class="size-4"/>
        </Select.Trigger>
        <Select.Portal>
            <Select.Content class="z-50 rounded-box bg-base-200 shadow-xl p-2 min-w-40 animate-in fade-in-0 zoom-in-95" sideOffset={4} side="top">
                {#each sortOptions as option}
                    <Select.Item value={option.value} class={["cursor-pointer rounded px-3 py-1.5 text-sm hover:bg-base-300 outline-none data-[highlighted]:bg-base-300", sortValue === option.value && 'text-primary font-medium']}>
                        {option.label}
                    </Select.Item>
                {/each}
                {#if sortValue}
                    <div class="border-t border-base-content/10 mt-1 pt-1">
                        <button type="button" class="cursor-pointer rounded px-3 py-1.5 text-sm text-error hover:bg-base-300 w-full text-left outline-none" onclick={() => sortValue = 'name-asc'}>
                            Remove sort
                        </button>
                    </div>
                {/if}
            </Select.Content>
        </Select.Portal>
    </Select.Root>
{/snippet}

{#snippet filter()}
    <div class="px-4 py-2 flex-center gap-1 border-b border-base-content/10">
        <div class="join">
            <button type="button"
                class={["btn btn-xs join-item", activeCategoryFilters.size === 0 ? 'btn-primary' : 'btn-ghost']}
                onclick={() => activeCategoryFilters.clear()}
            >
                All
            </button>
            {#each Object.entries(sampleIcons) as [cat, Icon]}
                {@const category = cat as SoundSampleCategory}
                <button type="button"
                    class={["btn btn-xs join-item", activeCategoryFilters.has(category) ? 'btn-primary' : 'btn-ghost']}
                    onclick={() => toggleCategoryFilter(category)}
                >
                    <Icon class="size-3"/>
                    {categoryLabels[category]}
                </button>
            {/each}
        </div>

        <div class="ml-auto">
            {@render sortSelect()}
        </div>
    </div>
{/snippet}

{#snippet tagFilter()}
    <div class="px-4 py-1.5 flex items-center gap-1 overflow-x-auto border-b border-base-content/10">
        {#each availableTags as tag (tag)}
            <button type="button"
                class={["btn btn-xs shrink-0", activeTagFilters.has(tag) ? 'btn-primary' : 'btn-ghost bg-base-content/5']}
                onclick={() => toggleTagFilter(tag)}
            >
                {tag}
            </button>
        {/each}
        {#if activeTagFilters.size > 0}
            <button type="button" class="btn btn-xs btn-ghost text-error shrink-0 ml-1" onclick={() => activeTagFilters.clear()}>
                <X class="size-3"/> Clear
            </button>
        {/if}
    </div>
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