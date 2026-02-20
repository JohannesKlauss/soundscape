<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import {Pen, SwordsIcon, Trash} from "@lucide/svelte";
    import { page } from '$app/state';
    import { goto } from "$app/navigation";
    import CreateNewMood from "$lib/domain/soundSet/mood/ui/CreateNew.svelte";
    import FormSet from "$lib/domain/soundSet/ui/Form.svelte";
    import Tooltip from "$lib/components/Tooltip.svelte";
    import {confirmModal} from "$lib/components/AlertDialog.svelte";
    import type {Mood} from "$lib/domain/soundSet/mood/_types";
    import MoodListItem from "$lib/domain/soundSet/mood/ui/MoodListItem.svelte";

    type SoundSet = {
      moods: Mood[]
      id: number
      name: string
      moodIds: number[]
    }

    const soundSets = liveQuery(async () => {
      const sets = await db.set.toArray()

      return Promise.all(sets.map(async set => {
        const moods = await db.mood.where('id').anyOf(set.moodIds).toArray()

        return {
          ...set,
          moods,
        }
      }))
    })

    async function deleteSet(set: SoundSet) {
      const confirmed = await confirmModal('Delete Set', 'Are you sure you want to delete this Set? You cannot undo this!')

      if (confirmed) {
        await db.setHasPads.where('setId').equals(set.id).delete()
        await db.mood.where('id').anyOf(set.moodIds).delete()
        await db.set.delete(set.id)
      }
    }
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

                <Tooltip triggerProps={{class:"btn btn-circle btn-ghost btn-sm ml-auto opacity-0 transition-opacity group-hover:opacity-100", type: 'button', onclick: () => goto(`/sets/${set.id}/edit`)}}>
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
                <CreateNewMood setId={set.id}/>
            </li>

            {#each set.moods as mood}
                <li>
                    <MoodListItem setId={set.id} {mood} />
                </li>
            {/each}
        {/if}
    {/each}
</ul>