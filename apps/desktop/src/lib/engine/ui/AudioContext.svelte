<script lang="ts">
  import {getContext, start} from "tone";
    import {onMount} from "svelte";
  import {toast} from "svelte-sonner";
  import {TriangleAlert} from "@lucide/svelte";

  let audioCtxState = $state<AudioContextState | undefined>()

    onMount(() => {
      setTimeout(() => {
        audioCtxState = getContext().state
      }, 3000)
    })

    async function startAudioContext() {
      await start()

      audioCtxState = getContext().state

      if (audioCtxState !== 'running') {
        toast.error('Error while starting audio engine.')
      }
    }
</script>

{#if audioCtxState && audioCtxState !== 'running'}
    <div role="alert" class="alert alert-warning rounded-none">
        <TriangleAlert />
        <span>
            Audio Engine is not running!
        </span>

        <button class="btn btn-ghost btn-sm" onclick={startAudioContext}>
            Click to start audio engine.
        </button>
    </div>
{/if}