<script lang="ts">
import type { PageProps } from './$types'
import ElementList from '$lib/domain/soundSet/ui/elements/ElementList.svelte'
import { LockIcon, LockOpenIcon } from '@lucide/svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { page } from '$app/state'
import { watch } from 'runed'
import { db } from '$lib/db'
import { replaceState } from '$app/navigation'

let { data }: PageProps = $props()

let editMode = $state(false)

let editingMood = $state(structuredClone(page.state.editMood))

watch(
  () => page.state.editMood,
  () => {
    editingMood = page.state.editMood
  },
)

const isEditingMoodDirty = $derived(
  editingMood
    ? JSON.stringify(editingMood) !== JSON.stringify(page.state.editMood)
    : false,
)

function onChangeSettingsForMood(
  padId: number,
  volume: number,
  playAtMoodStart: boolean,
) {
  if (!editingMood) {
    return
  }

  const tmp = editingMood

  if (playAtMoodStart) {
    tmp.elements[padId] = {
      volume,
    }
  } else {
    delete tmp.elements[padId]

    editingMood = tmp
  }
}

async function saveMood() {
  if (!editingMood) {
    return
  }

  await db.mood.update(editingMood.id, $state.snapshot(editingMood))

  replaceState('', {
    editMood: $state.snapshot(editingMood),
  })
}
</script>

<div class="relative">
    <div class="flex-center justify-start mb-4">
        <h1 class="text-2xl">All Elements</h1>
        {#if page.state.editMood && isEditingMoodDirty}
            <button type="button" onclick={saveMood} class="btn btn-neutral hover:btn-primary btn-sm ml-4">
                Save Mood
            </button>
        {/if}
        <Tooltip triggerProps={{class:"btn btn-ghost btn-neutral btn-circle ml-auto", onclick: () => editMode = !editMode}}>
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
        <ElementList editable={editMode} setId={data.set.id} {onChangeSettingsForMood}/>
    {/if}
</div>