<script lang="ts">
  import type { PageProps } from './$types';
  import ElementList from "$lib/domain/soundSet/ui/elements/ElementList.svelte";
  import {LockIcon, LockOpenIcon} from "@lucide/svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";

  let { data }: PageProps = $props();

  let editMode = $state(false)
</script>

<div>
    <div class="flex-center justify-between">
        <h1 class="text-2xl mb-4">All Elements</h1>
        <Tooltip triggerProps={{class:"btn btn-ghost btn-neutral btn-circle", onclick: () => editMode = !editMode}}>
            {#snippet trigger()}
                {#if editMode}
                    <LockOpenIcon class="size-4 text-warning"/>
                {:else}
                    <LockIcon class="size-4 text-muted"/>
                {/if}
            {/snippet}

            {#if editMode}
                Lock Set
            {:else}
                Edit Set
            {/if}
        </Tooltip>
    </div>

    {#if data.set}
        <ElementList editable={editMode} setId={data.set.id}/>
    {/if}
</div>