<script lang="ts">
import { PlusIcon } from '@lucide/svelte'
import Dialog from '$lib/components/Dialog.svelte'
import { db } from '$lib/db'
import { toast } from 'svelte-sonner'
import Tooltip from '$lib/components/Tooltip.svelte'
import { defaults, superForm } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import {
  type SoundSet,
  SoundSetCreationSchema,
} from '$lib/domain/soundSet/_types'

interface Props {
  set?: SoundSet
  open?: boolean
}

let { set, open = $bindable(false) }: Props = $props()

const validators = zod4(SoundSetCreationSchema)

const { form, constraints, submit, reset, errors, validateForm, enhance } =
  superForm(defaults(set, validators), {
    validators,
    SPA: true,
    validationMethod: 'oninput',
    id: set ? `edit-set-${set.id}` : 'new-set',
    onSubmit: async () => {
      const res = await validateForm()

      if (!res.valid) {
        return
      }

      try {
        if (set) {
          db.set.update(set.id, {
            name: $form.name,
          })
        } else {
          db.set.add({
            name: $form.name,
            moodIds: [],
          })
        }

        open = false
        reset()
      } catch (e) {
        toast.error('Could not create Sound Set')
      }
    },
  })
</script>

<form use:enhance>
    <Dialog bind:open={open} onConfirm={() => submit()} confirmDisabled={$form.name.trim().length < 3}>
        {#snippet trigger(props)}
            <Tooltip triggerProps={{class:"btn btn-sm btn-circle btn-ghost", ...props}}>
                {#snippet trigger()}
                    <PlusIcon class="size-4"/>
                {/snippet}

                Create new Sound Set
            </Tooltip>
        {/snippet}

        {#snippet title()}
          New Sound Set
        {/snippet}

        {#snippet description()}
          Create a new Sound Set
        {/snippet}

        <fieldset class="fieldset">
            <label class="label" for="name">Name</label>
            <input type="text" class="input" name="name" {...$constraints.name} placeholder="Name (min 3 characters long)" bind:value={$form.name} onkeyup={e => e.key === 'Enter' && submit()} />
            {#if $errors.name}<span class="text-error">{$errors.name}</span>{/if}
        </fieldset>
    </Dialog>
</form>