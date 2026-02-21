<script lang="ts">
import CreateNew from '$lib/domain/soundSample/ui/CreateNew.svelte'
import List from '$lib/domain/soundSample/ui/List.svelte'
import { db } from '$lib/db'
import { liveQuery } from 'dexie'
import BottomSheet from '$lib/components/BottomSheet.svelte'
import { Library } from '@lucide/svelte'
import { Collapsible } from 'bits-ui'
import ReindexLibrary from '$lib/domain/soundSample/ui/ReindexLibrary.svelte'

const samples = liveQuery(() => db.sample.toArray())

let open = $state(false)
</script>

<div class="bg-base-100">
    <BottomSheet bind:open={open}>
        {#snippet title()}
            <Collapsible.Trigger class="flex-center justify-start w-full">
                <Library class="size-4"/>
                <span class="text-sm opacity-60 tracking-wide">{$samples?.length} Sample{$samples?.length !== 1 ? 's' : null} in Library</span>
            </Collapsible.Trigger>

            <ReindexLibrary numSamples={$samples.length}/>
            <div class="ml-auto"><CreateNew/></div>
        {/snippet}

        <div class="max-h-[50vh] overflow-y-scroll">
            <List/>
        </div>
    </BottomSheet>
</div>
