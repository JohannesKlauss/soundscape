<script lang="ts">
import List from "$lib/domain/soundPad/ui/List.svelte";
import CreateNew from "$lib/domain/soundPad/ui/CreateNew.svelte";
</script>

<div class="flex flex-col h-full">
    <List/>

    <div class="mt-auto p-4 border-base-content/10 border-t">
        <CreateNew/>
    </div>
</div>