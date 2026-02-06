<script lang="ts">
  import { PlusIcon } from '@lucide/svelte';
  import Dialog from "$lib/components/Dialog.svelte";
  import {db} from "$lib/db";
  import {toast} from "svelte-sonner";
  import {defaults, superForm} from "sveltekit-superforms";
  import {MoodCreationSchema} from "$lib/domain/soundSet/mood/_types";
  import {zod4} from "sveltekit-superforms/adapters";

  interface Props {
    setId: number
  }

  let {setId}: Props = $props()

  let open = $state(false)

  const validators = zod4(MoodCreationSchema)

  const {form, constraints, submit, reset, validateForm, enhance} = superForm(defaults(validators), {
    validators,
    SPA: true,
    onSubmit: async () => {
      const res = await validateForm()

      if (!res.valid) {
        return
      }

      try {
        const id = await db.mood.add($form)
        const set = await db.set.where('id').equals(setId).first()

        if (set) {
          await db.set.update(setId, {
            moodIds: [...(set.moodIds ?? []), id]
          })
        } else {
          toast.error('Cannot find corresponding Sound Set')
        }

        open = false

        reset()
      } catch (e) {
        console.log(e)
        toast.error('Could not create Mood')
      }
    }
  })
</script>

<form use:enhance>
    <Dialog bind:open={open} onConfirm={() => submit()}>
        {#snippet trigger(props)}
            <button class="w-full flex-center py-2 px-4 pl-8 hover:bg-base-300 flex-center justify-start cursor-pointer text-sm" {...props}>
                <PlusIcon class="size-4"/>
                Mood
            </button>
        {/snippet}

        {#snippet title()}
            New Mood
        {/snippet}

        {#snippet description()}
            Create a new mood
        {/snippet}

        <fieldset class="fieldset">
            <label class="label" for="name">Name</label>
            <input type="text" class="input" name="name" placeholder="Name (min 3 characters long)"  {...$constraints.name}
                   bind:value={$form.name} />
        </fieldset>
    </Dialog>
</form>