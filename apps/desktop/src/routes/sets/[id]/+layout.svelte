<script lang="ts">
import { liveQuery } from 'dexie'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { db } from '$lib/db'
import { engineState } from '$lib/engine/engine.svelte'
import type { LayoutProps } from './$types'

interface Props extends LayoutProps {
  children: import('svelte').Snippet
}

let { data, children }: Props = $props()

const loadMood = (moodId: number) => liveQuery(() => db.mood.where('id').equals(moodId).first())

const activeMood = $derived(engineState.activeMoodId ? loadMood(engineState.activeMoodId) : undefined)

const title = $derived.by(() => {
  let t = `Soundscape - ${data.set.name}`

  if ($activeMood?.name) {
    t += ` - ${$activeMood.name}`
  }

  return t
})

$effect(() => {
  getCurrentWindow().setTitle(title)

  return () => {
    getCurrentWindow().setTitle('Soundscape')
  }
})
</script>

{@render children()}
