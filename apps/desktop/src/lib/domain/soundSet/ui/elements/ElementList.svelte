<script lang="ts">
import { liveQuery } from 'dexie'
import { page } from '$app/state'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import { db } from '$lib/db'
import type { SoundPadType } from '$lib/domain/soundPad/_types'
import SetElement from '$lib/domain/soundSet/ui/elements/SetElement.svelte'
import { removeElementPlayer } from '$lib/engine/engine.svelte'

interface Props {
  setId: number
  editable?: boolean
  onChangeSettingsForMood: (padId: number, volume: number, playAtMoodStart: boolean) => void
}

let { setId, editable = false, onChangeSettingsForMood }: Props = $props()

const padTypeOrder: SoundPadType[] = ['music', 'loop', 'fx', 'one_shot']

const loadPads = (setId: number) =>
  liveQuery(async () => {
    const padIds = await db.setHasPads.where('setId').equals(setId).toArray()
    const unsortedPads = await db.pad
      .where('id')
      .anyOf(padIds.map((v) => v.padId))
      .toArray()

    return unsortedPads.sort((a, b) => {
      return padTypeOrder.indexOf(a.type) - padTypeOrder.indexOf(b.type)
    })
  })

const pads = $derived.by(() => loadPads(setId))

const loadMood = (moodId: number) => liveQuery(() => db.mood.where('id').equals(moodId).first())

const mood = $derived(
  loadMood(page.url.searchParams.has('viewMoodId') ? parseInt(page.url.searchParams.get('viewMoodId')!) : 0),
)

async function onDelete(padId: number) {
  const confirm = await confirmModal('Remove Pad', `Do you really want to remove the pad from this Soundscape?`)

  if (confirm) {
    removeElementPlayer(padId)

    await db.setHasPads.where(['setId', 'padId']).equals([setId, padId]).delete()

    const set = await db.set.get(setId)

    if (set?.moodIds.length) {
      const moods = await db.mood.where('id').anyOf(set.moodIds).toArray()

      await db.mood.bulkUpdate(
        moods
          .filter((mood) => padId in mood.elements)
          .map((mood) => {
            const { [padId]: _, ...rest } = mood.elements
            return { key: mood.id, changes: { elements: rest } }
          }),
      )
    }
  }
}
</script>

<div class="outline-0 outline-primary rounded">
    <div class="grid grid-cols-6 gap-6 w-full justify-evenly items-center place-content-center place-items-center">
        {#each $pads as pad (pad.id)}
            <SetElement {pad} volume={$mood?.elements?.[pad.id]?.volume} {editable} {onDelete} {onChangeSettingsForMood}/>
        {:else}
            <div class="text-lg text-muted text-center mt-12 col-span-6">Add Sound Pads to this set to create sound scape</div>
        {/each}
    </div>
</div>
