<script module lang="ts">
import { writable } from 'svelte/store'

let confirmPromise: Promise<boolean>
let confirmCallback: (() => void) | undefined
let cancelCallback: (() => void) | undefined

let confirmTitle = writable('')
let confirmMessage = writable('')
let isOpen = writable(false)

export async function confirmModal(title: string, message: string) {
  confirmTitle.set(title)
  confirmMessage.set(message)

  isOpen.set(true)

  confirmPromise = new Promise((resolve) => {
    confirmCallback = () => {
      resolve(true)

      isOpen.set(false)

      confirmCallback = undefined
    }

    cancelCallback = () => {
      resolve(false)

      isOpen.set(false)

      cancelCallback = undefined
    }
  })

  return confirmPromise
}

export function closeConfirmModal() {
  isOpen.set(false)
}
</script>

<script lang="ts">
  import { AlertDialog } from 'bits-ui'

  function cancel() {
    cancelCallback?.()
  }

  function confirm() {
    confirmCallback?.()
  }
</script>

<AlertDialog.Root open={$isOpen}>
    <AlertDialog.Portal>
        <AlertDialog.Overlay class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"/>
        <AlertDialog.Content
                class="card bg-base-100 shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] p-5 sm:max-w-[490px] md:w-full"
        >
            <div class="card-body">
                <AlertDialog.Title class="card-title flex w-full items-center justify-center text-lg font-semibold tracking-tight">
                    {$confirmTitle}
                </AlertDialog.Title>
                <AlertDialog.Description class="text-sm text-muted">
                    {$confirmMessage}
                </AlertDialog.Description>
            </div>
            <div class="card-actions flex w-full gap-2 justify-end">
                <AlertDialog.Cancel class="btn btn-ghost" onclick={cancel}>
                    Cancel
                </AlertDialog.Cancel>
                <AlertDialog.Action class="btn btn-error" onclick={confirm}>
                    Confirm
                </AlertDialog.Action>
            </div>
        </AlertDialog.Content>
    </AlertDialog.Portal>
</AlertDialog.Root>