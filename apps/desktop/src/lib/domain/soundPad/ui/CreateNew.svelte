<script lang="ts">
  import {Infinity, AudioWaveform, Music, Crosshair, PlusIcon} from "@lucide/svelte";
  import {z} from "zod";
  import {defaults, superForm} from "sveltekit-superforms";
  import {zod4} from 'sveltekit-superforms/adapters';
  import {useDroppable} from "@dnd-kit-svelte/svelte";

  const baseSchema = z.object({
    name: z.string().min(3),
    type: z.union([z.literal('music'), z.literal('loop'), z.literal('fx'), z.literal('one_shot')]).default('music'),
    fadeInSeconds: z.int().min(0).max(30).multipleOf(0.1).default(0.5),
    fadeOutSeconds: z.int().min(0).max(30).multipleOf(0.1).default(0.5),
  })

  const {form, constraints, enhance} = superForm(defaults(zod4(baseSchema)), {
    validators: zod4(baseSchema),
    SPA: true,
    dataType: 'json',
    onSubmit() {
      console.log('submit', $form)
    }
  })

  const {isDropTarget, ref, droppable} = useDroppable({
    id: 'sample',
    onDrop(sourceData) {

  }
  })

  function handleRangeWheel(
    e: WheelEvent,
    key: 'fadeInSeconds' | 'fadeOutSeconds',
  ) {
    e.preventDefault()

    const delta = e.deltaY < 0 ? $constraints[key]!.step : -$constraints[key]!.step
    const newValue = Math.round(($form[key]! + delta) * 10) / 10

    $form[key] = Math.max($constraints[key]!.min, Math.min($constraints[key]!.max, newValue))
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
                Drop sample to add
            </div>
        </div>

        <button class="btn btn-primary btn-block">
            <PlusIcon/>
            Add Sound Pad
        </button>
    </div>
</form>