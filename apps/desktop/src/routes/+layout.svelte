<script lang="ts">
    interface Props {
      children: import('svelte').Snippet
    }

    let {children}: Props = $props()
</script>

<div class="flex relative">
    <div class="flex relative flex-col basis-1/5 shrink-0 overflow-hidden z-10 bg-base-100 p-4 h-screen border-r">
        Left container
    </div>
    <div class="grow overflow-x-hidden overflow-y-auto p-4 w-full border-r bg-base-300">
        {@render children()}
    </div>
    <div class="w-full overflow-x-hidden overflow-y-scroll h-screen p-4">
        Right Container
    </div>
</div>