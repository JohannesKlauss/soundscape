<script lang="ts">
  import {liveQuery} from "dexie";
  import {db} from "$lib/db";
  import {useDroppable} from "$lib/dnd";
  import type {SoundPad, SoundPadType} from "$lib/domain/soundPad/_types";
  import SetElement from "$lib/domain/soundSet/ui/elements/SetElement.svelte";
  import {confirmModal} from "$lib/components/AlertDialog.svelte";
  import {toast} from "svelte-sonner";
  import {page} from "$app/state";

  interface Props {
    setId: number
    editable?: boolean
    onChangeSettingsForMood: (padId: number, volume: number, playAtMoodStart: boolean) => void
  }

  let {setId, editable = false, onChangeSettingsForMood}: Props = $props()

  const padTypeOrder: SoundPadType[] = ['music', 'loop', 'fx', 'one_shot']

  const loadPads = (setId: number) => liveQuery(async () => {
    const padIds = await db.setHasPads.where('setId').equals(setId).toArray()
    const unsortedPads = await db.pad.where('id').anyOf(padIds.map(v => v.padId)).toArray()

    return unsortedPads.sort((a, b) => {
      return padTypeOrder.indexOf(a.type) - padTypeOrder.indexOf(b.type)
    })
  })

  const pads = $derived.by(() => loadPads(setId))

  const loadMood = (moodId: number) => liveQuery(() => db.mood.where('id').equals(moodId).first())

  const mood = $derived(loadMood(page.url.searchParams.has('viewMoodId') ? parseInt(page.url.searchParams.get('viewMoodId')!) : 0))

  const {ref, isDropTarget} = useDroppable<SoundPad>({
    id: 'pad',
    onDrop: async (data) => {
      if (!editable) {
        toast.warning('Sound Set is locked')

        return
      }

      await db.setHasPads.add({
        setId,
        padId: data.id,
      })
    }
  })

  async function onDelete(padId: number) {
    const confirm = await confirmModal('Remove Pad', `Do you really want to remove this pad from this Sound Set?`)

    if (confirm) {
      await db.setHasPads.where(['setId', 'padId']).equals([setId, padId]).delete()
    }
  }
</script>

<div class="outline-0 outline-primary rounded" class:!outline={isDropTarget.current} {@attach ref}>
    <div class="grid grid-cols-6 gap-6 w-full justify-evenly items-center place-content-center place-items-center">
        {#each $pads as pad}
            <SetElement {pad} volume={$mood?.elements?.[pad.id]?.volume} {editable} {onDelete} {onChangeSettingsForMood}/>
        {:else}
            <div class="text-lg text-muted text-center mt-12 col-span-6">Add Sound Pads to this set to create sound scape</div>
        {/each}
    </div>
</div>
