<script lang="ts">
  import { Tooltip } from "bits-ui";
  import { type Snippet } from "svelte";

  type Props = Tooltip.RootProps & {
    trigger: Snippet;
    triggerProps?: Tooltip.TriggerProps;
  };

  let {
    open = $bindable(false),
    children,
    trigger,
    triggerProps = {},
    ...restProps
  }: Props = $props();
</script>

<Tooltip.Root bind:open {...restProps}>
    <Tooltip.Trigger {...triggerProps}>
        {@render trigger()}
    </Tooltip.Trigger>
    <Tooltip.Portal>
        <Tooltip.Content sideOffset={8} class="animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-tooltip-content-transform-origin)">
            <Tooltip.Arrow class="text-base-300" />
            <div
                    class="rounded-input bg-base-300 rounded shadow-popover outline-hidden z-0 flex items-center justify-center p-3 text-xs font-medium"
            >
                {@render children?.()}
            </div>
        </Tooltip.Content>
    </Tooltip.Portal>
</Tooltip.Root>