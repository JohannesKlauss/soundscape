<script lang="ts">
  import { PlusIcon } from '@lucide/svelte';
  import Dialog from "$lib/components/Dialog.svelte";
</script>

<Dialog>
    {#snippet button(props)}
      <button class="btn btn-primary btn-block" {...props}>
          <PlusIcon/>
          Soundscape
      </button>
    {/snippet}

    {#snippet title()}
      New Soundscape
    {/snippet}

    {#snippet description()}
      Create a new soundscape
    {/snippet}
</Dialog>