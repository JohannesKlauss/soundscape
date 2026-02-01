<script lang="ts">
  import {liveQuery} from "dexie";
  import {db} from "$lib/db";
  import {useDroppable} from "$lib/dnd";
  import type {SoundPad, SoundPadType} from "$lib/domain/soundPad/_types";
  import SetElement from "$lib/domain/soundSet/ui/elements/SetElement.svelte";
  import {confirmModal} from "$lib/components/AlertDialog.svelte";

  interface Props {
    setId: number
  }

  let {setId}: Props = $props()

  const padTypeOrder: SoundPadType[] = ['music', 'loop', 'fx', 'one_shot']

  const pads = liveQuery(async () => {
    const padIds = await db.setHasPads.where('setId').equals(setId).toArray()
    const unsortedPads = await db.pad.where('id').anyOf(padIds.map(v => v.padId)).toArray()

    return unsortedPads.sort((a, b) => {
      return padTypeOrder.indexOf(a.type) - padTypeOrder.indexOf(b.type)
    })
  })

  const {ref, isDropTarget} = useDroppable<SoundPad>({
    id: 'pad',
    onDrop: async (data) => {
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
            <SetElement {pad} editable {onDelete}/>
        {/each}
    </div>

    <div class="text-lg text-muted text-center mt-12">Add new elements by dragging Sound Pads</div>
</div>
