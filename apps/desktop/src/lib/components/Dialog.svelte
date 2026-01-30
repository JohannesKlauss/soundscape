<script lang="ts">
  import type { Snippet } from "svelte";
  import { Dialog, type WithoutChild } from "bits-ui";

  type Props = Dialog.RootProps & {
    button: Snippet<[Record<string, any>]>;
    title: Snippet;
    description: Snippet;
    contentProps?: WithoutChild<Dialog.ContentProps>;
  };

  let {
    open = $bindable(false),
    children,
    button,
    contentProps,
    title,
    description,
    ...restProps
  }: Props = $props();
</script>

<Dialog.Root bind:open {...restProps}>
    <Dialog.Trigger>
        {#snippet child({ props })}
            {@render button(props)}
        {/snippet}
    </Dialog.Trigger>
    <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content {...contentProps}>
            <Dialog.Title>
                {@render title()}
            </Dialog.Title>
            <Dialog.Description>
                {@render description()}
            </Dialog.Description>
            {@render children?.()}
            <Dialog.Close class="btn btn-ghost">Close Dialog</Dialog.Close>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>