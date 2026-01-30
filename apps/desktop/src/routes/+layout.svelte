<script lang="ts">
    import List from "$lib/domain/soundscapes/ui/List.svelte";
    import CreateNew from "$lib/domain/soundscapes/ui/CreateNew.svelte";

    interface Props {
      children: import('svelte').Snippet
    }

    let {children}: Props = $props()
</script>

<div class="flex flex-col h-screen">
    <div class="h-32 flex items-center p-8">
        <h1 class="text-5xl">Soundscape</h1>
    </div>

    <div class="flex relative flex-1">
        <div class="flex relative flex-col basis-1/5 shrink-0 z-10 bg-base-100 p-4 border-r">
            <div class="flex h-full flex-col gap-2">
                <List/>
                <div class="mt-auto">
                    <CreateNew/>
                </div>
            </div>
        </div>
        <div class="grow overflow-x-hidden overflow-y-auto p-4 w-full border-r bg-base-300">
            {@render children()}
        </div>
        <div class="w-full overflow-x-hidden overflow-y-scroll p-4">
            Right Container
        </div>
    </div>
</div>
