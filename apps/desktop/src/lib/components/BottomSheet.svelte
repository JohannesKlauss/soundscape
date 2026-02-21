<script lang="ts">
import { Collapsible, type WithoutChild } from 'bits-ui'
import type { Snippet } from 'svelte'
import { ChevronsUpDown } from '@lucide/svelte'
import Tooltip from '$lib/components/Tooltip.svelte'

type Props = WithoutChild<Collapsible.RootProps> & {
  title: Snippet
  trigger?: Snippet
}

let {
  open = $bindable(false),
  title,
  trigger: collapsibleTrigger,
  children,
  ...restProps
}: Props = $props()
</script>

<Collapsible.Root>
    <div class="flex items-center justify-between px-4 py-2 border-t border-base-content/10" {...restProps}>
        {@render title()}

        <Tooltip>
            {#snippet trigger()}
                <Collapsible.Trigger class="btn btn-circle btn-sm btn-ghost">
                    {#if collapsibleTrigger}
                        {@render collapsibleTrigger()}
                    {:else}
                        <ChevronsUpDown class="size-4" />
                    {/if}
                </Collapsible.Trigger>
            {/snippet}

            Expand/Collapse
        </Tooltip>
    </div>

    <Collapsible.Content class="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up space-y-2 overflow-hidden font-mono text-[15px] tracking-[0.01em]">
        {@render children?.()}
    </Collapsible.Content>
</Collapsible.Root>