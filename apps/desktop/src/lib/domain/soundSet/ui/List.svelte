<script lang="ts">
import { Pen, SwordsIcon, Trash } from '@lucide/svelte'
import { liveQuery } from 'dexie'
import { page } from '$app/state'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import { useSortable } from '$lib/dnd'
import type { Mood } from '$lib/domain/soundSet/mood/_types'
import AddMoodMood from '$lib/domain/soundSet/mood/ui/AddMood.svelte'
import MoodListItem from '$lib/domain/soundSet/mood/ui/MoodListItem.svelte'
import FormSet from '$lib/domain/soundSet/ui/Form.svelte'

type SoundSet = {
  moods: Mood[]
  id: number
  name: string
  moodIds: number[]
}

const soundSets = liveQuery(async () => {
  const sets = await db.set.toArray()

  return Promise.all(
    sets.map(async (set) => {
      const moods = await db.mood.where('id').anyOf(set.moodIds).toArray()
      moods.sort((a, b) => set.moodIds.indexOf(a.id) - set.moodIds.indexOf(b.id))

      return {
        ...set,
        moods,
      }
    }),
  )
})

async function deleteSet(set: SoundSet) {
  const confirmed = await confirmModal('Delete Set', 'Are you sure you want to delete this Set? You cannot undo this!')

  if (confirmed) {
    await db.setHasPads.where('setId').equals(set.id).delete()
    await db.mood.where('id').anyOf(set.moodIds).delete()
    await db.set.delete(set.id)
  }
}

const activeSet = $derived($soundSets?.find(s => page.url.pathname.startsWith(`/sets/${s.id}`)))

let editingSet = $state<SoundSet | undefined>(undefined)
let editOpen = $state(false)

const { containerRef } = useSortable<Mood>({
  id: 'mood',
  get items() {
    return activeSet?.moods ?? []
  },
  async onSort(items) {
    if (!activeSet) return

    await db.set.update(activeSet.id, {
      moodIds: items.map(m => m.id),
    })
  },
})
</script>

<div class="p-4 text-muted flex-center justify-between">
    <div>Sound Sets</div>

    <FormSet/>
</div>

<ul class="text-lg">
    {#each $soundSets as set}
        {@const pathname = `/sets/${set.id}`}
        {@const isActive = page.url.pathname === pathname}
        <li>
            <a href={pathname} data-sveltekit-noscroll class={["group py-2 px-4 hover:bg-base-300 flex-center justify-start cursor-pointer", isActive && "bg-primary hover:bg-primary"]}>
                <SwordsIcon class="size-5"/>
                {set.name}

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-sm ml-auto opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: (e) => { e.preventDefault(); editingSet = set; editOpen = true }}}>
                    {#snippet trigger()}
                        <Pen class="size-4"/>
                    {/snippet}

                    Edit Set
                </Tooltip>

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-sm ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => deleteSet(set)}}>
                    {#snippet trigger()}
                        <Trash class="size-4"/>
                    {/snippet}

                    Delete Set
                </Tooltip>
            </a>
        </li>

        {#if page.url.pathname.startsWith(pathname)}
            <li>
                <AddMoodMood setId={set.id}/>
            </li>

            <ul {@attach containerRef}>
                {#each set.moods as mood}
                    <li>
                        <MoodListItem setId={set.id} {mood} />
                    </li>
                {/each}
            </ul>
        {/if}
    {/each}
</ul>

{#if editingSet}
    <FormSet set={editingSet} bind:open={editOpen} showTrigger={false} />
{/if}