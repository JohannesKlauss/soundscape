<script lang="ts">
  import Dialog from "$lib/components/Dialog.svelte";
  import {PlusIcon, Music, AudioLines, AudioWaveform, Sparkles} from '@lucide/svelte';
  import Tooltip from "$lib/components/Tooltip.svelte";
  import type {SoundSampleCategory} from "$lib/domain/soundSample/_types";
  import {Player} from "tone";
  import {toast} from "svelte-sonner";

  let open = $state(false)
  let url = $state('')
  let category = $state<SoundSampleCategory>('music')
  let isAudio = $state(false)
  let isYoutube = $state(false)

  const player = new Player().toDestination()

  $effect(async () => {
    if (url.length > 0 && url.startsWith('http')) {
      if (await loadAudio()) {
        isYoutube = false
        isAudio = true
      } else if (await loadYoutube()) {

      }
    }
  })

  async function loadAudio() {
    try {
      await player.load(url)

      toast.success('Sample loaded.')

      return true
    } catch (e) {
      toast.error('URL is no audio file.')
    }
  }

  async function loadYoutube() {

  }


  async function onAdd() {

  }
</script>

<Dialog bind:open={open} onConfirm={onAdd}>
    {#snippet trigger(props)}
        <Tooltip>
            {#snippet trigger()}
                <button class="btn btn-ghost tooltip" {...props}>
                    <PlusIcon/>
                </button>
            {/snippet}

            Add Sample
        </Tooltip>
    {/snippet}

    {#snippet title()}
        Add Sample
    {/snippet}

    {#snippet description()}
        To add a sample copy the url or drop a file
    {/snippet}

    <fieldset class="fieldset">
        <label class="label" for="url">Url</label>
        <input type="text" class="input" name="url" placeholder="https://example.com/media.mp3" bind:value={url}/>

        <div class="divider"></div>

        <span class="label">Type</span>
        <label class="label">
            <input type="radio" class="radio" name="category" placeholder="https://example.com/media.mp3" value="music"
                   bind:group={category}/>
            <Music/>
            Music
        </label>
        <label class="label">
            <input type="radio" class="radio" name="category" placeholder="https://example.com/media.mp3" value="fx"
                   bind:group={category}/>
            <Sparkles/>
            FX
        </label>
        <label class="label">
            <input type="radio" class="radio" name="category" placeholder="https://example.com/media.mp3"
                   value="one_shot" bind:group={category}/>
            <AudioLines/>
            One Shot
        </label>
        <label class="label">
            <input type="radio" class="radio" name="category" placeholder="https://example.com/media.mp3"
                   value="atmosphere" bind:group={category}/>
            <AudioWaveform/>
            Atmosphere
        </label>

        {#if player.loaded}
            <div class="divider"></div>

            <audio src={url} controls></audio>
        {/if}
    </fieldset>
</Dialog>