<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import { SwordsIcon } from "@lucide/svelte";
    import { page } from '$app/state';

    const soundSets = liveQuery(() => db.set.toArray())
</script>

<div class="p-4 space-y-2 text-muted">
    <div>Sound Sets</div>
</div>

<ul class="text-lg">
    {#each $soundSets as set}
        {@const pathname = `/sets/${set.id}`}
        <li>
            <a href={pathname} data-sveltekit-noscroll class="py-2 px-4 hover:bg-base-300 flex-center justify-start cursor-pointer" class:bg-primary={page.url.pathname === pathname}>
                <SwordsIcon class="size-5"/>
                {set.name}
            </a>
        </li>
    {/each}
</ul>