import { redirect } from '@sveltejs/kit'
import { db } from '$lib/db'
import { loadSoundSet } from '$lib/engine/engine.svelte.js'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ params }) => {
  const id = parseInt(params.id, 10)

  const set = await db.set.where('id').equals(id).first()

  await loadSoundSet(id)

  if (!set) {
    redirect(303, '/')
  }

  return {
    set,
  }
}
