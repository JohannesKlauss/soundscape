<script lang="ts">
  import {readFileFromSamplesDirectory} from "$lib/fileSystem";
  import {Player} from "tone";
  import {toast} from "svelte-sonner";
  import {Play, Pause} from "@lucide/svelte";
  import type {ClassValue} from "svelte/elements";

  interface Props {
    src: string
    contentType: string
    class?: ClassValue
  }

  let {src, contentType, class: customClass}: Props = $props()

  let isPlaying = $state(false)

  const player = new Player().toDestination()

  async function load() {
    if (!player.loaded) {
      try {
        const file = await readFileFromSamplesDirectory(src)

        const blob = new Blob([await file.arrayBuffer()], {type: contentType});
        const url = window.URL.createObjectURL(blob);

        await player.load(url)
      } catch (e) {
        console.log('error while loading file', e)

        toast.error(`Unable to load sample ${src}`)
      }
    }
  }

  async function togglePlay() {
    if (isPlaying) {
      isPlaying = false
      player.stop()

      return
    }

    if (!player.loaded) {
      await load()
    }

    player.start(undefined, 0)
    isPlaying = true
  }
</script>

<button class={["btn btn-primary btn-sm btn-circle btn-ghost", customClass]} onclick={togglePlay}>
    {#if isPlaying}
        <Pause class="size-3" />
    {:else}
        <Play class="size-3" />
    {/if}
</button>