<script lang="ts">
  import {liveQuery} from "dexie";
  import {db} from "$lib/db";
  import {useDroppable} from "$lib/dnd";
  import type {SoundPad} from "$lib/domain/soundPad/_types";
  import SetElement from "$lib/domain/soundSet/ui/elements/SetElement.svelte";

  interface Props {
    setId: number
  }

  let {setId}: Props = $props()

  const pads = liveQuery(async () => {
    const padIds = await db.setHasPads.where('setId').equals(setId).toArray()

    return db.pad.where('id').anyOf(padIds.map(v => v.padId)).toArray()
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
</script>

<div class="outline-0 outline-primary rounded" class:!outline={isDropTarget.current} {@attach ref}>
    <div class="grid grid-cols-8 w-full justify-evenly items-center place-content-center place-items-center">
        {#each $pads as pad}
            <SetElement {pad}/>
        {/each}
    </div>

    <div class="text-lg text-muted text-center">Drop pads to add them to this Sound Set</div>
</div>
