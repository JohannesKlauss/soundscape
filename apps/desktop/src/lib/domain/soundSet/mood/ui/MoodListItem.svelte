<script lang="ts">
  import {db} from "$lib/db";
  import {confirmModal} from "$lib/components/AlertDialog.svelte";
  import type {Mood} from "$lib/domain/soundSet/mood/_types";
  import {PlayIcon, PauseIcon, Trash} from "@lucide/svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import {page} from "$app/state";
  import {playMood} from "$lib/engine/ui/engine.svelte";

  interface Props {
    setId: number
    mood: Mood
  }

  let {setId, mood}: Props = $props()

  async function deleteMood() {
    const confirmed = await confirmModal('Delete Mood', 'Are you sure you want to delete this Mood? You cannot undo this!')

    if (confirmed) {
      const set = await db.set.where('id').equals(setId).first()

      if (!set) {
        return
      }

      const index = set.moodIds.findIndex(id => id === mood.id)

      await db.set.update(set.id, {
        moodIds: [...set.moodIds.toSpliced(index, 1)]
      })
      await db.mood.where('id').anyOf(set.moodIds).delete()
    }
  }
</script>

<div class="group w-full flex-center py-2 px-4 pl-8 hover:bg-base-300 flex-center justify-start cursor-pointer text-sm">
    <button class={["btn btn-circle btn-xs hover:btn-secondary", page.state.activeMoodId === mood.id && "btn-secondary"]} type="button" onclick={() => playMood(mood.id)}>
        {#if page.state.activeMoodId === mood.id}
            <PauseIcon class="size-3"/>
        {:else}
            <PlayIcon class="size-3"/>
        {/if}
    </button>

    {mood.name}

    <div class="flex-center ml-auto">
        <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-xs ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => deleteMood()}}>
            {#snippet trigger()}
                <Trash class="size-3"/>
            {/snippet}

            Delete Mood
        </Tooltip>
    </div>
</div>