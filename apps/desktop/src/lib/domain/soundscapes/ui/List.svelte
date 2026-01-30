<script lang="ts">
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";

    const soundscapes = liveQuery(() => db.soundscapes.toArray())
</script>

List

<ul>
    {#each $soundscapes as soundscape}
        <li>{soundscape.name}</li>
    {/each}
</ul>