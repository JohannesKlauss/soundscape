<script lang="ts">
  import {
    Infinity,
    AudioWaveform,
    Music,
    Crosshair,
    PlusIcon,
    Trash,
    XIcon,
    Check,
    Dices,
    ListOrdered
  } from "@lucide/svelte";
  import {defaults, superForm} from "sveltekit-superforms";
  import {zod4} from 'sveltekit-superforms/adapters';
  import {useDroppable, useSortable} from "$lib/dnd";
  import type {SoundSample} from "$lib/domain/soundSample/_types";
  import {SoundPadCreationSchema} from "$lib/domain/soundPad/_types";
  import {db} from "$lib/db";
  import {toast} from "svelte-sonner";
  import {page} from "$app/state";
  import {replaceState} from "$app/navigation";
  import QuickPreviewPlayer from "$lib/domain/soundSample/ui/QuickPreviewPlayer.svelte";

  interface Props {
    onCancel?: () => void
  }

  let {onCancel}: Props = $props()

  $effect(() => {
    reset({
      data: page.state.editPad,
    })
  })

  const validators = zod4(SoundPadCreationSchema)

  const {form, constraints, enhance, reset} = superForm(page.state.editPad ?? defaults(validators), {
    validators,
    SPA: true,
    dataType: 'json',
    onSubmit: async () => {
      const data = {
        ...$form,
        sampleIds: $form.samples.map(val => val.id)
      }

      delete data.samples

      if (page.state.editPad) {
        await db.pad.update(page.state.editPad.id, data)
        toast.success('Updated pad')
      } else {
        await db.pad.add(data)
        toast.success('Created pad')
        reset()
        onCancel?.()
      }
    }
  })

  const {isDropTarget, ref} = useDroppable<SoundSample>({
    id: 'sample',
    onDrop(sample) {
      if ($form.samples.findIndex(val => val.id === sample.id) === -1) {
        $form.samples = [...$form.samples, sample]
      }
    }
  })

  function handleRangeWheel(
    e: WheelEvent,
    key: 'fadeInSeconds' | 'fadeOutSeconds',
  ) {
    e.preventDefault()

    const delta = e.deltaY < 0 ? -0.1 : 0.1
    const newValue = Math.round(($form[key]! + delta) * 10) / 10

    $form[key] = Math.max(0, Math.min(100, newValue))
  }

  function removeSample(id: number) {
    const index = $form.samples.findIndex(val => val.id === id)

    $form.samples = $form.samples.toSpliced(index, 1)
  }

  function cancel() {
    replaceState('', {editPad: undefined})
    reset()
    onCancel?.()
  }

  const {containerRef} = useSortable({
    id: 'sample',
    items: $form.samples,
    onSort(items) {
      console.log('items', items)

      $form.samples = [...items]
    }
  })
</script>

<form use:enhance>
    <div class="space-y-4">
        <div class="flex-center justify-between text-sm">
            Create a new Sound Pad
            <button type="button" class="btn btn-ghost btn-circle btn-sm" onclick={cancel}>
                <XIcon class="size-4 text-muted"/>
            </button>
        </div>

        <div class="fieldset">
            <label class="label" for="name">Name</label>
            <input type="text" class="input" name="url" placeholder="Name of the pad" {...$constraints.name}
                   bind:value={$form.name}/>
        </div>

        <div class="fieldset">
            <span class="label">Type</span>
            <div class="grid grid-cols-2 gap-4">
                <label class="label">
                    <input type="radio" class="radio" name="type" value="music" bind:group={$form.type}/>
                    <Music class="size-5"/>
                    Music
                </label>
                <label class="label">
                    <input type="radio" class="radio" name="type" value="loop" bind:group={$form.type}/>
                    <Infinity class="size-5"/>
                    Loop
                </label>
                <label class="label">
                    <input type="radio" class="radio" name="type" value="fx" bind:group={$form.type}/>
                    <AudioWaveform class="size-5"/>
                    FX
                </label>
                <label class="label">
                    <input type="radio" class="radio" name="type" value="one_shot" bind:group={$form.type}/>
                    <Crosshair class="size-5"/>
                    One Shot
                </label>
            </div>
        </div>

        <div class="fieldset space-y-4">
            <div>
                <span class="label">Fade In <span class="tabular-nums ml-auto">{$form.fadeInSeconds}
                    seconds</span></span>
                <input
                        type="range"
                        {...$constraints.fadeInSeconds}
                        bind:value={$form.fadeInSeconds}
                        class="range range-xs"
                        onwheel={(e) => handleRangeWheel(e, 'fadeInSeconds')}
                />
            </div>

            <div>
                <span class="label">Fade Out <span class="tabular-nums ml-auto">{$form.fadeOutSeconds}
                    seconds</span></span>
                <input
                        type="range"
                        {...$constraints.fadeOutSeconds}
                        bind:value={$form.fadeOutSeconds}
                        class="range range-xs"
                        onwheel={(e) => handleRangeWheel(e, 'fadeOutSeconds')}
                />
            </div>
        </div>

        <div class="card bg-base-300 outline-primary outline-0" class:!outline={isDropTarget.current} {@attach ref}>
            <div class="card-body text-center">
                <div class="space-y-2 mb-2" {@attach containerRef}>
                    {#each $form.samples as sample}
                        <div class="card card-sm bg-base-100">
                            <div class="card-body">
                                <div class="flex-center justify-between">
                                    <QuickPreviewPlayer class="btn btn-xs" src={sample.src}
                                                        contentType={sample.contentType}/>
                                    {sample.name}

                                    <button type="button" class="btn btn-error btn-ghost btn-xs btn-circle"
                                            onclick={() => removeSample(sample.id)}>
                                        <Trash class="size-3"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>

                Drop sample from Library
            </div>
        </div>

        <div class="fieldset">
            <span class="label">Multisample Playback Type</span>
            <div class="grid grid-cols-2 gap-4">
                <label class="label">
                    <input type="radio" class="radio" name="playbackType" value="random"
                           disabled={$form.samples.length < 2} bind:group={$form.playbackType}/>
                    <Dices class="size-5"/>
                    Random
                </label>
                <label class="label">
                    <input type="radio" class="radio" name="playbackType" value="round_robin"
                           disabled={$form.samples.length < 2} bind:group={$form.playbackType}/>
                    <ListOrdered class="size-5"/>
                    Round Robin
                </label>
            </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">
            {#if page.state.editPad}
                <Check/>
                Update Pad
            {:else}
                <PlusIcon/>
                Add Sound Pad
            {/if}
        </button>
    </div>
</form>