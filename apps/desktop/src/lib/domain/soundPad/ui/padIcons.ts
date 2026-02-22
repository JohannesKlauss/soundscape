import { AudioLines, Crosshair, InfinityIcon, Music } from '@lucide/svelte'
import type { SoundPadType } from '$lib/domain/soundPad/_types'

export const padIcons: Record<SoundPadType, typeof Music> = {
  music: Music,
  fx: AudioLines,
  loop: InfinityIcon,
  one_shot: Crosshair,
}
