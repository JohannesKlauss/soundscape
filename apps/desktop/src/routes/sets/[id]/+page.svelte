<script lang="ts">
import { LockIcon, LockOpenIcon } from '@lucide/svelte'
import { watch } from 'runed'
import { replaceState } from '$app/navigation'
import { page } from '$app/state'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import ElementList from '$lib/domain/soundSet/ui/elements/ElementList.svelte'
import type { PageProps } from './$types'

let { data }: PageProps = $props()

let editingMood = $state(structuredClone(page.state.editMood))

watch(
  () => page.state.editMood,
  () => {
    editingMood = page.state.editMood
  },
)

const isStateDirty = $derived(
  editingMood ? JSON.stringify(editingMood) !== JSON.stringify(page.state.editMood) : false,
)

function onChangeSettingsForMood(padId: number, volume: number, playAtMoodStart: boolean) {
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
        <h1 class="text-2xl">All Sound Pads In Set</h1>
        {#if page.state.editMood && isStateDirty}
            <button type="button" onclick={saveMood} class="btn btn-neutral hover:btn-primary btn-sm ml-4">
                Save Mood
            </button>
        {/if}
    </div>

    {#if data.set}
        <ElementList setId={data.set.id} {onChangeSettingsForMood}/>
    {/if}
</div>