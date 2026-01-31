<script lang="ts">
    import type {SoundPad} from "$lib/domain/soundPad/_types";
    import {padIcons} from "$lib/components/padIcons";

    interface Props {
      pad: SoundPad
    }

    let {pad}: Props = $props()
</script>

<div class="flex flex-col gap-2 items-center">
    <div class="rounded-full size-16 bg-linear-75 from-zinc-400 to-zinc-50 flex justify-center items-center">
        {#key pad.type}
            {@const Icon = padIcons[pad.type]}

            <Icon class="size-8 text-base-100"/>
        {/key}
    </div>

    <span class="text-sm">{pad.name}</span>
</div>
