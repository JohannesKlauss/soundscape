<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import { SwordsIcon } from "@lucide/svelte";
    import { page } from '$app/state';
    import CreateNew from "$lib/domain/soundSet/mood/ui/CreateNew.svelte";

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
</script>

<div class="p-4 space-y-2 text-muted">
    <div>Sound Sets</div>
</div>

<ul class="text-lg">
    {#each $soundSets as set}
        {@const pathname = `/sets/${set.id}`}
        {@const isActive = page.url.pathname === pathname}
        <li>
            <a href={pathname} data-sveltekit-noscroll class="py-2 px-4 hover:bg-base-300 flex-center justify-start cursor-pointer" class:bg-primary={isActive}>
                <SwordsIcon class="size-5"/>
                {set.name}
            </a>
        </li>

        {#if isActive}
            <li>
                <CreateNew setId={set.id}/>
            </li>

            {#each set.moods as mood}
                <li class="w-full flex-center py-2 px-4 pl-8 hover:bg-base-300 flex-center justify-start cursor-pointer text-sm">
                    {mood.name}
                </li>
            {/each}
        {/if}
    {/each}
</ul>