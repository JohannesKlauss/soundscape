<script lang="ts">
import { X } from '@lucide/svelte'

interface Props {
  tags?: string[]
  placeholder?: string
}

let { tags = $bindable<string[]>([]), placeholder = 'Add tag...' }: Props = $props()

let inputValue = $state('')
let inputEl: HTMLInputElement | undefined = $state()

function addTag(raw: string) {
  const tag = raw.trim().toLowerCase()
  if (tag.length === 0) return
  if (tags.includes(tag)) return

  tags = [...tags, tag]
  inputValue = ''
}

function removeTag(tag: string) {
  tags = tags.filter(t => t !== tag)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag(inputValue)
  } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
    tags = tags.slice(0, -1)
  }
}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
    class="flex flex-wrap items-center gap-1 rounded-field border border-base-content/20 px-2 py-1.5 min-h-9 cursor-text focus-within:border-primary/50 transition-colors"
    onclick={() => inputEl?.focus()}
>
    {#each tags as tag (tag)}
        <span class="badge badge-sm gap-1 bg-base-content/10 text-base-content">
            {tag}
            <button type="button" class="cursor-pointer hover:text-error" onclick={() => removeTag(tag)}>
                <X class="size-3"/>
            </button>
        </span>
    {/each}
    <input
        bind:this={inputEl}
        type="text"
        class="bg-transparent outline-none text-sm flex-1 min-w-20"
        {placeholder}
        bind:value={inputValue}
        onkeydown={onKeydown}
    />
</div>
