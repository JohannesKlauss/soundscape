<script lang="ts">
  import { PlusIcon } from '@lucide/svelte';
  import Dialog from "$lib/components/Dialog.svelte";
  import {db} from "$lib/db";
  import {toast} from "svelte-sonner";

  let name = $state('')
  let open = $state(false)

  async function createNewSoundSet() {
    try {
      db.set.add({
        name,
      })

      open = false
      name = ''

      toast.success('Created Sound Set')
    } catch (e) {
      toast.error('Could not create Sound Set')
    }
  }
</script>

<Dialog bind:open={open} onConfirm={createNewSoundSet} confirmDisabled={name.trim().length < 3}>
    {#snippet trigger(props)}
      <button class="btn btn-primary btn-block" {...props}>
          <PlusIcon/>
          Sound Set
      </button>
    {/snippet}

    {#snippet title()}
      New Sound Set
    {/snippet}

    {#snippet description()}
      Create a new Sound Set
    {/snippet}

    <fieldset class="fieldset">
        <label class="label" for="name">Name</label>
        <input type="text" class="input" name="name" placeholder="Name (min 3 characters long)" bind:value={name} />
    </fieldset>
</Dialog>