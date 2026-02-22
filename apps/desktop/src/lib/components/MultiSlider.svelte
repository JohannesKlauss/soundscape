<script lang="ts">
import { Slider } from 'bits-ui'

interface Props {
  min?: number
  max?: number
  step?: number
  value: number[]
  disabled?: boolean
  onChange?: (value: number[]) => void
}

let { value = $bindable([0]), disabled, min = 0, max = 100, step = 1, onChange }: Props = $props()
</script>

<div class="w-full mt-1.5">
    <Slider.Root bind:value type="multiple" {disabled} {min} {max} {step} onValueChange={onChange} class="relative cursor-pointer flex w-full touch-none select-none items-center">
        {#snippet children({ thumbItems })}
            <span class="range relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full">
                <Slider.Range class="data-[disabled]:bg-gray-600 bg-white absolute h-4"/>
            </span>

            {#each thumbItems as { index } (index)}
                <Slider.Thumb {index} {disabled} class="border-4 data-[disabled]:border-gray-600 border-white bg-base-300 block rounded-full size-4 focus-visible:outline-none"/>
            {/each}
        {/snippet}
    </Slider.Root>
</div>

<style>
    .range {
        background: color-mix(in oklab, var(--color-base-content) 10%, #0000);
    }
</style>