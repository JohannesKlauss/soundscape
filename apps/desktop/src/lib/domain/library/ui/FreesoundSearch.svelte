<script lang="ts">
  import {freesoundState, loadNextFreesoundPage} from "$lib/freesound";
  import FreesoundList from "$lib/domain/library/ui/FreesoundList.svelte";

  interface Props {
    scrollContainer?: HTMLElement
    isSearchActive: boolean
  }

  let {scrollContainer, isSearchActive = false}: Props = $props()

  let sentinel: HTMLDivElement | undefined = $state()

  $effect(() => {
    if (!sentinel || !scrollContainer) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && freesoundState.hasMore && !freesoundState.isLoadingMore) {
          loadNextFreesoundPage()
        }
      },
      {root: scrollContainer, threshold: 0.1},
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  })
</script>

{#if freesoundState.results.length > 0}
    <div class="divider text-xs text-muted px-4 my-0">freesound.org ({freesoundState.totalCount} results)</div>
    <FreesoundList sounds={freesoundState.results}/>
{/if}

{#if freesoundState.isSearching || freesoundState.isLoadingMore}
    <div class="flex items-center justify-center py-4">
        <span class="loading loading-spinner loading-sm"></span>
    </div>
{:else if isSearchActive && freesoundState.totalCount === 0}
    <div class="flex items-center justify-center py-4 text-muted">
        No additional results found.
    </div>
{/if}

{#if freesoundState.error}
    <div class="text-xs text-error text-center py-2">{freesoundState.error}</div>
{/if}

<!-- Sentinel element for infinite scroll -->
<div bind:this={sentinel} class="h-1"></div>