<script lang="ts">
import List from "$lib/domain/soundSet/ui/List.svelte";
import CreateNew from "$lib/domain/soundSet/ui/CreateNew.svelte";
</script>

<div class="flex h-full flex-col gap-2">
    <List/>
    <div class="mt-auto p-4">
        <CreateNew/>
    </div>
</div>