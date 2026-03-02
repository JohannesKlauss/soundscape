<script lang="ts">
import { Download, Search, Star, PlusIcon } from '@lucide/svelte'
import QuickPreviewPlayer from '$lib/domain/previewPlayer/QuickPreviewPlayer.svelte'
import type { FreesoundSound } from '$lib/freesound'
import { formatTime } from '$lib/engine/volume'
import Tooltip from '$lib/components/Tooltip.svelte'
import CreateNew from "$lib/domain/soundSample/ui/CreateNew.svelte";

interface Props {
  sounds: FreesoundSound[]
}

let { sounds }: Props = $props()

let createNewOpen = $state(false)
let createNewUrl = $state('')
let createNewName = $state('')

function formatDownloads(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`
  }

  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`
  }

  return String(n)
}

function onAddSampleToLibrary(name: string, url: string) {
  createNewName = name
  createNewUrl = url
  createNewOpen = true
}
</script>

<ul class="list">
    {#each sounds as sound (sound.id)}
        <li class="list-row px-4 py-2 text-sm hover:bg-base-100 flex-center">
            <Tooltip side="left">
                {#snippet trigger()}
                    <Search class="size-4 text-info"/>
                {/snippet}

                Freesound result
            </Tooltip>
            <span class="flex-1 text-ellipsis overflow-hidden whitespace-nowrap">
                {#if sound.name.length > 40}
                    <Tooltip>
                        {#snippet trigger()}
                            {sound.name.substring(0, 40)}...
                        {/snippet}

                        {sound.name}
                    </Tooltip>
                {:else}
                    {sound.name}
                {/if}
            </span>
            <div class="grid grid-cols-3 gap-2 ml-2 text-right w-40">
                <Tooltip>
                    {#snippet trigger()}
                        <span class="flex-center gap-0.5 text-xs text-muted text-nowrap whitespace-nowrap">
                            <Star class="size-3"/>{sound.avg_rating.toFixed(1)}
                        </span>
                    {/snippet}

                    Average rating
                </Tooltip>
                <Tooltip>
                    {#snippet trigger()}
                        <span class="flex-center gap-0.5 text-xs text-muted text-nowrap whitespace-nowrap">
                            <Download class="size-3"/>{formatDownloads(sound.num_downloads)}
                        </span>
                    {/snippet}

                    Downloads
                </Tooltip>
                <span class="text-xs text-muted text-right">{formatTime(sound.duration)}</span>
            </div>


            <div class="ml-4 flex-center">
                <Tooltip triggerProps={{class: "btn btn-ghost btn-circle btn-sm", onclick: () => onAddSampleToLibrary(sound.name, sound.previews['preview-hq-mp3'])}}>
                    {#snippet trigger()}
                        <PlusIcon class="size-3"/>
                    {/snippet}

                    Save Sample to Library
                </Tooltip>
                <QuickPreviewPlayer src={sound.previews['preview-hq-mp3']} contentType="audio/mpeg" />
            </div>
        </li>
    {/each}
</ul>

<CreateNew bind:open={createNewOpen} bind:url={createNewUrl} bind:name={createNewName} showTrigger={false} />