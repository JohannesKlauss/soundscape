<script lang="ts">
import { PauseIcon, Pen, PlayIcon, Trash } from '@lucide/svelte'
import { goto } from '$app/navigation'
import { page } from '$app/state'
import { useInlineRename } from '$lib/attachments'
import { confirmModal } from '$lib/components/AlertDialog.svelte'
import Tooltip from '$lib/components/Tooltip.svelte'
import { db } from '$lib/db'
import type { Mood } from '$lib/domain/soundSet/mood/_types'
import { engineState, playMood } from '$lib/engine/engine.svelte.js'
import {toast} from "svelte-sonner";

interface Props {
  setId: number
  mood: Mood
}

let { setId, mood }: Props = $props()

const isActive = $derived(engineState.activeMoodId === mood.id)
const isFadingOut = $derived(isActive && engineState.isFadingOut)

let isRenaming = $state(false)
let renameValue = $state(mood.name)

async function saveName() {
  const trimmed = renameValue.trim()
  if (trimmed.length >= 3 && trimmed !== mood.name) {
    await db.mood.update(mood.id, { name: trimmed })
  } else {
    renameValue = mood.name
  }
  isRenaming = false
}

function cancelRename() {
  renameValue = mood.name
  isRenaming = false
}

const { ref: renameRef } = useInlineRename({ onSave: saveName, onCancel: cancelRename })

let clickTimer: ReturnType<typeof setTimeout> | null = null

function handleNameClick() {
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickTimer = null
    playMood(mood)
  }, 250)
}

function handleNameDblClick() {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
  isRenaming = true
  renameValue = mood.name
}

async function deleteMood() {
  const confirmed = await confirmModal(
    'Delete Mood',
    'Are you sure you want to delete this Mood? You cannot undo this!',
  )

  if (confirmed) {
    const set = await db.set.where('id').equals(setId).first()

    if (!set) {
      return
    }

    const index = set.moodIds.indexOf(mood.id)

    await db.set.update(set.id, {
      moodIds: set.moodIds.toSpliced(index, 1),
    })
    await db.mood.where('id').equals(mood.id).delete()
  }
}

function editMood() {
  if (engineState.activeMoodId) {
    toast.warning('Soundscape is currently playing. To edit a mood first stop the playback.')

    return
  }

  goto(`?viewMoodId=${mood.id}`, {
    state: {
      editMood: {
        ...mood,
        elements: {
          ...mood.elements,
        },
      },
    },
  })
}
</script>

<div class={["group w-full flex-center py-2 px-4 pl-8 hover:bg-base-300 flex-center justify-start text-sm", page.url.searchParams.get('viewMoodId') === mood.id.toString() && "bg-primary/30 hover:bg-primary/30"]}>
    <button class={["btn btn-circle btn-xs hover:btn-secondary", isActive && !isFadingOut && "btn-secondary", isFadingOut && "btn-secondary animate-pulse"]}
            type="button" onclick={() => playMood(mood)}>
        {#if isActive && !isFadingOut}
            <PauseIcon class="size-3"/>
        {:else}
            <PlayIcon class="size-3"/>
        {/if}
    </button>

    {#if isRenaming}
        <input
            type="text"
            class="input input-xs w-32"
            bind:value={renameValue}
            {@attach renameRef}
        />
    {:else}
        <span class={["cursor-pointer", isActive && !isFadingOut && "text-secondary", isFadingOut && "text-secondary animate-pulse"]}
              onclick={handleNameClick}
              ondblclick={handleNameDblClick}>{mood.name}</span>
    {/if}

    <div class="flex-center ml-auto">
        <Tooltip
                triggerProps={{class:"btn btn-circle btn-ghost btn-xs ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: editMood}}>
            {#snippet trigger()}
                <Pen class="size-3"/>
            {/snippet}

            Edit Mood
        </Tooltip>

        <Tooltip
                triggerProps={{class:"btn btn-circle btn-ghost btn-error btn-xs ml-2 opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => deleteMood()}}>
            {#snippet trigger()}
                <Trash class="size-3"/>
            {/snippet}

            Delete Mood
        </Tooltip>
    </div>
</div>