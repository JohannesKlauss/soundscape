<script lang="ts">
  import List from "$lib/domain/soundPad/ui/List.svelte";
  import Form from "$lib/domain/soundPad/ui/Form.svelte";
  import {PlusIcon} from "@lucide/svelte";
  import {fly} from "svelte/transition";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import {page} from "$app/state";

  let showForm = $derived(!!page.state.editPad)
</script>

<div class="flex flex-col h-full">
    <List>
        <Tooltip triggerProps={{class:"btn btn-sm btn-circle btn-ghost", onclick: () => showForm = true}}>
            {#snippet trigger()}
                <PlusIcon class="size-4"/>
            {/snippet}

            Create new Sound Pad
        </Tooltip>
    </List>

    {#if showForm}
        <div class="mt-auto p-4 border-base-content/10 border-t" transition:fly={{y: 200}}>
            <Form onCancel={() => showForm = false}/>
        </div>
    {/if}
</div>