<script lang="ts">
  import type { Snippet } from "svelte";
  import { Dialog, type WithoutChild } from "bits-ui";

  type Props = Dialog.RootProps & {
    trigger: Snippet<[Record<string, any>]>;
    title: Snippet;
    description: Snippet;
    confirmText?: string
    onConfirm: () => void
    confirmDisabled?: boolean
    contentProps?: WithoutChild<Dialog.ContentProps>;
  };

  let {
    open = $bindable(false),
    children,
    trigger,
    contentProps,
    title,
    description,
    confirmText = 'Save',
    onConfirm,
    confirmDisabled = false,
    ...restProps
  }: Props = $props();
</script>

<Dialog.Root bind:open {...restProps}>
    <Dialog.Trigger>
        {#snippet child({ props })}
            {@render trigger(props)}
        {/snippet}
    </Dialog.Trigger>
    <Dialog.Portal>
        <Dialog.Overlay class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
            class="card bg-base-100 shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] p-5 sm:max-w-[490px] md:w-full"
            {...contentProps}
        >
            <div class="card-body">
                <Dialog.Title class="card-title flex w-full items-center justify-center text-lg font-semibold tracking-tight">
                    {@render title()}
                </Dialog.Title>
                <Dialog.Description class="text-muted text-sm">
                    {@render description()}
                </Dialog.Description>
                {@render children?.()}
            </div>
            <div class="card-actions flex w-full gap-2 justify-end">
                <Dialog.Close
                        class="btn btn-ghost"
                >
                    Cancel
                </Dialog.Close>

                <button class="btn btn-primary" onclick={() => onConfirm()} disabled={confirmDisabled}>
                    {confirmText}
                </button>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>