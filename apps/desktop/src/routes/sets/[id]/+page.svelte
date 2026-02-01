<script lang="ts">
  import type { PageProps } from './$types';
  import ElementList from "$lib/domain/soundSet/ui/elements/ElementList.svelte";

  let { data }: PageProps = $props();
</script>

<div>
    <h1 class="text-2xl mb-4">All Elements</h1>

    {#if data.set}
        <ElementList setId={data.set.id}/>
    {/if}
</div>