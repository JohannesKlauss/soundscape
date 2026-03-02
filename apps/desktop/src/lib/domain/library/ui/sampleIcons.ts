import { AudioLines, Music, Wind } from '@lucide/svelte'
import type { SoundSampleCategory } from '$lib/domain/library/_types'

export const sampleIcons: Record<SoundSampleCategory, typeof Music> = {
  music: Music,
  fx: AudioLines,
  atmosphere: Wind,
}
