<script lang="ts">
  import Dialog from "$lib/components/Dialog.svelte";
  import {PlusIcon, Music, AudioLines, AudioWaveform, Sparkles} from '@lucide/svelte';
  import Tooltip from "$lib/components/Tooltip.svelte";
  import type {SoundSampleCategory} from "$lib/domain/soundSample/_types";
  import {Player} from "tone";
  import {toast} from "svelte-sonner";
  import SamplePlayer from "$lib/domain/soundSample/ui/SamplePlayer.svelte";
  import {getExtensionFromContentType, getSamplesDirectory} from "$lib/fileSystem";
  import {db} from "$lib/db";

  let open = $state(false)
  let url = $state('')
  let name = $state('')
  let category = $state<SoundSampleCategory>('music')
  let isAudio = $state(false)
  let isYoutube = $state(false)

  const player = new Player().toDestination()

  $effect(() => {
    if (url.length > 0 && url.startsWith('http')) {
      loadAudio().then((success) => {
        if (success) {
          isYoutube = false
          isAudio = true
        } else {
          loadYoutube()
        }
      })
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

  async function onAddAudio() {
    const res = await fetch(url)

    if (!res.ok) {
      toast.error('Unable to download audio')

      return
    }

    if (!res.headers.get('content-type')) {
      toast.error('Unable to identify file type')

      return
    }

    const ext = getExtensionFromContentType(res.headers.get('content-type')!)
    const fileName = `${name}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    const sampleDir = await getSamplesDirectory()
    const file = await sampleDir.getFileHandle(fileName, { create: true })
    const writer = await file.createWritable()

    await writer.write(await res.blob())
    await writer.close()

    db.sample.add({
      category,
      name,
      contentType: res.headers.get('content-type')!,
      src: fileName,
      type: 'local',
    })

    open = false
    name = ''
    url = ''
    isAudio = false
    isYoutube = false
    category = 'music'
  }
</script>

<Dialog bind:open={open} onConfirm={isAudio ? onAddAudio : () => null} confirmDisabled={name.trim().length < 3} confirmText="Add to library">
    {#snippet trigger(props)}
        <Tooltip>
            {#snippet trigger()}
                <button class="btn btn-ghost btn-circle btn-sm tooltip" {...props}>
                    <PlusIcon class="w-4 h-4"/>
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

        {#if isAudio || isYoutube}
            <div class="divider"></div>

            <label class="label" for="name">Name</label>
            <input type="text" class="input" name="name" placeholder="Sample Name (min 3 characters)" bind:value={name}/>

            {#if isAudio}
                <SamplePlayer {player}/>
            {/if}
        {/if}
    </fieldset>
</Dialog>