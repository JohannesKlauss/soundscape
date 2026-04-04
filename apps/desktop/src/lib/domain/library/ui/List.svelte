<script lang="ts">
import { AudioWaveform, GripVertical, Tags } from '@lucide/svelte'
import { Popover } from 'bits-ui'
import { useInlineRename } from '$lib/attachments/useInlineRename'
import Tooltip from "$lib/components/Tooltip.svelte";
import { db } from '$lib/db'
import { DragOverlay, useDraggable } from '$lib/dnd'
import type { SoundSample } from '$lib/domain/library/_types'
import { sampleIcons } from '$lib/domain/library/ui/sampleIcons'
import TagInput from '$lib/domain/library/ui/TagInput.svelte'
import QuickPreviewPlayer from '$lib/domain/previewPlayer/QuickPreviewPlayer.svelte'
import { formatTime } from '$lib/engine/volume'

interface Props {
  samples: SoundSample[]
}

let { samples }: Props = $props()

const MAX_VISIBLE_TAGS = 3

let editingTags = $state<{ sampleId: number; tags: string[] } | null>(null)

function onPopoverToggle(sample: SoundSample, isOpen: boolean) {
  if (isOpen) {
    editingTags = { sampleId: sample.id, tags: [...(sample.tags ?? [])] }
  } else if (editingTags?.sampleId === sample.id) {
    db.sample.update(editingTags.sampleId, { tags: $state.snapshot(editingTags.tags) })

    editingTags = null
  }
}

let renamingSampleId = $state<number | null>(null)
let renameValue = $state('')

function saveSampleName() {
  const trimmed = renameValue.trim()
  if (renamingSampleId !== null && trimmed.length >= 3) {
    db.sample.update(renamingSampleId, { name: trimmed })
  }
  renamingSampleId = null
}

function cancelRename() {
  renamingSampleId = null
}

const { ref: renameRef } = useInlineRename({ onSave: saveSampleName, onCancel: cancelRename })
</script>

<ul class="list">
    {#each samples as sample (sample.id)}
        {@const {ref, dragInstanceId} = useDraggable<SoundSample>({id: 'sample', data: sample})}
        {@const Icon = sampleIcons[sample.category]}

        <li {@attach ref} class="list-row px-4 py-2 text-sm hover:bg-base-100 flex-center group cursor-grab">
            <Tooltip>
                {#snippet trigger()}
                    <Icon class="size-4"/>
                {/snippet}

                <span class="capitalize">{sample.category}</span>
            </Tooltip>
            {#if renamingSampleId === sample.id}
                <input
                    type="text"
                    class="input input-sm flex-1"
                    bind:value={renameValue}
                    {@attach renameRef}
                />
            {:else}
                <span
                    class="flex-1 text-ellipsis overflow-hidden whitespace-nowrap"
                    ondblclick={() => { renamingSampleId = sample.id; renameValue = sample.name }}
                >{sample.name}</span>
            {/if}

            {#if sample.tags?.length}
                <div class="flex-center gap-1 ml-2">
                    {#each sample.tags.slice(0, MAX_VISIBLE_TAGS) as tag (tag)}
                        <span class="badge badge-sm bg-base-content/10 text-base-content/60">{tag}</span>
                    {/each}

                    {#if sample.tags.length > MAX_VISIBLE_TAGS}
                        <Tooltip>
                            {#snippet trigger()}
                                <span class="badge badge-sm bg-base-content/10 text-base-content/40">+{sample.tags.length - MAX_VISIBLE_TAGS}</span>
                            {/snippet}

                            {sample.tags.slice(MAX_VISIBLE_TAGS).join(', ')}
                        </Tooltip>
                    {/if}
                </div>
            {/if}

            <span class="text-xs text-muted tabular-nums min-w-12 text-right">{formatTime(sample.duration)}</span>

            <div class={["ml-4 flex-center opacity-0 group-hover:opacity-100"]}>
                <Popover.Root onOpenChange={(isOpen) => onPopoverToggle(sample, isOpen)}>
                    <Popover.Trigger class="btn btn-circle btn-sm btn-ghost">
                        <Tags class="size-4 text-muted"/>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content
                            class="z-50 rounded-box bg-base-200 shadow-xl p-3 w-72 animate-in fade-in-0 zoom-in-95"
                            sideOffset={4}
                            side="top"
                        >
                            {#if editingTags?.sampleId === sample.id}
                                <div class="text-xs text-muted mb-2">Edit tags for {sample.name}</div>
                                <TagInput bind:tags={editingTags.tags}/>
                            {/if}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>

                <GripVertical class="size-4 text-muted"/>
                <QuickPreviewPlayer src={sample.src} contentType={sample.contentType} />
            </div>
        </li>

        <DragOverlay {dragInstanceId}>
            <div class="flex-center min-w-50 bg-base-300 drop-shadow-2xl border border-base-content/10 px-2 py-2 rounded w-fit max-w-fit">
                <AudioWaveform class="size-5"/>
                <div>{sample.name}</div>
            </div>
        </DragOverlay>
    {/each}
</ul>