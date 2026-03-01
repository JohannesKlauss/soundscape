<script lang="ts">
import { AudioWaveform, Download, GripVertical, Search, Star } from '@lucide/svelte'
import { DragOverlay, useDraggable } from '$lib/dnd'
import QuickPreviewPlayer from '$lib/domain/previewPlayer/QuickPreviewPlayer.svelte'
import type { FreesoundSound } from '$lib/freesound'
import { formatTime } from '$lib/engine/volume'
import Tooltip from '$lib/components/Tooltip.svelte'

interface Props {
  sounds: FreesoundSound[]
}

let { sounds }: Props = $props()

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
</script>

<ul class="list">
    {#each sounds as sound (sound.id)}
        {@const {ref, dragInstanceId} = useDraggable<FreesoundSound>({id: 'freesound-sample', data: sound})}

        <li class="list-row px-4 py-2 text-sm hover:bg-base-300 flex-center">
            <div class="flex-center">
                <Tooltip side="left">
                    {#snippet trigger()}
                        <Search class="size-4 text-info"/>
                    {/snippet}

                    Freesound result
                </Tooltip>
                <div class="line-clamp-1">
                    {#if sound.name.length > 40}
                        <Tooltip>
                            {#snippet trigger()}
                                {sound.name.substring(0, 40)}...
                            {/snippet}

                            {sound.name}
                        </Tooltip>
                    {:else}
                        <span class="text-ellipsis">{sound.name}</span>
                    {/if}
                    <span class="text-xs text-muted">({formatTime(sound.duration)})</span>
                </div>
                <div class="flex-center gap-2 ml-2">
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
                </div>
            </div>

            <div class="ml-auto flex-center">
                <span class="text-xs text-muted mr-2 text-nowrap whitespace-nowrap">via freesound.org</span>
                <div {@attach ref}>
                    <GripVertical class="size-4 text-muted cursor-grab"/>
                </div>
                <QuickPreviewPlayer src={sound.previews['preview-hq-mp3']} contentType="audio/mpeg" />
            </div>
        </li>

        <DragOverlay {dragInstanceId}>
            <div class="flex-center min-w-50 bg-base-300 drop-shadow-2xl border border-base-content/10 px-2 py-2 rounded w-fit max-w-fit">
                <AudioWaveform class="size-5"/>
                <div>{sound.name}</div>
            </div>
        </DragOverlay>
    {/each}
</ul>
