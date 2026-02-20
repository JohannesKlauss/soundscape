<script lang="ts">
  import {db} from "$lib/db";
  import {confirmModal} from "$lib/components/AlertDialog.svelte";
  import type {Mood} from "$lib/domain/soundSet/mood/_types";
  import {PlayIcon, PauseIcon, Trash} from "@lucide/svelte";
  import Tooltip from "$lib/components/Tooltip.svelte";
  import {page} from "$app/state";
  import {engineState, playMood} from "$lib/engine/engine.svelte.js";
  import {pushState} from "$app/navigation";

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

<div class={["group w-full flex-center py-2 px-4 pl-8 hover:bg-base-300 flex-center justify-start text-sm", page.state.editMood?.id === mood.id && "bg-primary/50 hover:bg-primary/50"]}>
    <button class={["btn btn-circle btn-xs hover:btn-secondary", engineState.activeMoodId === mood.id && "btn-secondary"]} type="button" onclick={() => playMood(mood.id)}>
        {#if engineState.activeMoodId === mood.id}
            <PauseIcon class="size-3"/>
        {:else}
            <PlayIcon class="size-3"/>
        {/if}
    </button>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <span class={["cursor-pointer", engineState.activeMoodId === mood.id && "text-secondary"]} onclick={() => pushState('', {editMood: mood})}>{mood.name}</span>

    <div class="flex-center ml-auto">
        <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-xs ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => deleteMood()}}>
            {#snippet trigger()}
                <Trash class="size-3"/>
            {/snippet}

            Delete Mood
        </Tooltip>
    </div>
</div>