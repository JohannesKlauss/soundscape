<script lang="ts">
import { SwordsIcon, Trash } from '@lucide/svelte'
import { liveQuery } from 'dexie'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { useInlineRename } from '$lib/attachments'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import { useSortable } from '$lib/dnd'
import type { Mood } from '$lib/domain/soundSet/mood/_types'
import AddMood from '$lib/domain/soundSet/mood/ui/AddMood.svelte'
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

let renamingSetId = $state<number | null>(null)
let renameSetValue = $state('')

async function saveSetName() {
  if (renamingSetId == null) return
  const set = $soundSets?.find(s => s.id === renamingSetId)
  if (!set) { renamingSetId = null; return }
  const trimmed = renameSetValue.trim()
  if (trimmed.length >= 3 && trimmed !== set.name) {
    await db.set.update(set.id, { name: trimmed })
  }
  renamingSetId = null
}

function cancelSetRename() {
  renamingSetId = null
}

const { ref: setRenameRef } = useInlineRename({ onSave: saveSetName, onCancel: cancelSetRename })

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
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div class={["group py-2 px-4 hover:bg-base-300 flex-center justify-start cursor-pointer", isActive && "bg-primary hover:bg-primary"]}
                 onclick={() => goto(pathname, { noScroll: true })}>
                <SwordsIcon class="size-5"/>

                {#if renamingSetId === set.id}
                    <input
                        type="text"
                        class="input input-sm w-40"
                        bind:value={renameSetValue}
                        onclick={(e) => e.stopPropagation()}
                        {@attach setRenameRef}
                    />
                {:else}
                    <span ondblclick={(e) => { e.stopPropagation(); renamingSetId = set.id; renameSetValue = set.name }}>{set.name}</span>
                {/if}

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-sm ml-auto opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: (e) => { e.stopPropagation(); deleteSet(set) }}}>
                    {#snippet trigger()}
                        <Trash class="size-4"/>
                    {/snippet}

                    Delete Set
                </Tooltip>
            </div>
        </li>

        {#if page.url.pathname.startsWith(pathname)}
            <li>
                <AddMood setId={set.id}/>
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
