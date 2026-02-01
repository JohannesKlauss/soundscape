<script lang="ts">
  import {Infinity, AudioWaveform, Music, Crosshair, PlusIcon, Trash} from "@lucide/svelte";
  import {defaults, superForm} from "sveltekit-superforms";
  import {zod4} from 'sveltekit-superforms/adapters';
  import {useDroppable} from "$lib/dnd";
  import type {SoundSample} from "$lib/domain/soundSample/_types";
  import {SoundPadCreationSchema} from "$lib/domain/soundPad/_types";
  import {db} from "$lib/db";
  import {toast} from "svelte-sonner";

  const validators = zod4(SoundPadCreationSchema)

  const {form, constraints, enhance, reset} = superForm(defaults(validators), {
    validators,
    SPA: true,
    onSubmit: async () => {
      const data = {
        ...$form,
        sampleIds: $form.samples.map(val => val.id)
      }

      delete data.samples

      await db.pad.add(data)

      reset()

      toast.success('Created pad')
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

    const delta = e.deltaY < 0 ? -$constraints[key]!.step : $constraints[key]!.step
    const newValue = Math.round(($form[key]! + delta) * 10) / 10

    $form[key] = Math.max($constraints[key]!.min, Math.min($constraints[key]!.max, newValue))
  }

  function removeSample(id: number) {
    const index = $form.samples.findIndex(val => val.id === id)

    $form.samples = $form.samples.toSpliced(index, 1)
  }
</script>

<form use:enhance>
    <div class="space-y-4">
       <div class="fieldset">
           <label class="label" for="name">Name</label>
           <input type="text" class="input" name="url" placeholder="Name of the pad" {...$constraints.name} bind:value={$form.name}/>
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
                <span class="label">Fade In <span class="tabular-nums ml-auto">{$form.fadeInSeconds} seconds</span></span>
                <input
                  type="range"
                  {...$constraints.fadeInSeconds}
                  bind:value={$form.fadeInSeconds}
                  class="range range-xs"
                  onwheel={(e) => handleRangeWheel(e, 'fadeInSeconds')}
                />
            </div>

            <div>
                <span class="label">Fade Out <span class="tabular-nums ml-auto">{$form.fadeOutSeconds} seconds</span></span>
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
                <div class="space-y-2 mb-2">
                    {#each $form.samples as sample}
                        <div class="card card-sm bg-base-100">
                            <div class="card-body">
                                <div class="flex-center justify-between">
                                    {sample.name}

                                    <button type="button" class="btn btn-error btn-ghost btn-xs btn-circle" onclick={() => removeSample(sample.id)}>
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

        <button type="submit" class="btn btn-primary btn-block">
            <PlusIcon/>
            Add Sound Pad
        </button>
    </div>
</form>