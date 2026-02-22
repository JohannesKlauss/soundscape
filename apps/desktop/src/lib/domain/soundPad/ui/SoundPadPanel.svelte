<script lang="ts">
import { PlusIcon } from '@lucide/svelte'
import { fly } from 'svelte/transition'
import { page } from '$app/state'
import Tooltip from '$lib/components/Tooltip.svelte'
import Form from '$lib/domain/soundPad/ui/Form.svelte'
import List from '$lib/domain/soundPad/ui/List.svelte'

let showForm = $derived(!!page.state.editPad)
</script>

<div class="flex flex-col h-full">
    <div class="flex-1 min-h-0 overflow-y-auto">
        <List>
            <Tooltip triggerProps={{class:"btn btn-sm btn-circle btn-ghost", onclick: () => showForm = true}}>
                {#snippet trigger()}
                    <PlusIcon class="size-4"/>
                {/snippet}

                Create new Sound Pad
            </Tooltip>
        </List>
    </div>

    {#if showForm}
        <div class="shrink-0 p-4 border-base-content/10 border-t" transition:fly={{y: 200}}>
            <Form onCancel={() => showForm = false}/>
        </div>
    {/if}
</div>