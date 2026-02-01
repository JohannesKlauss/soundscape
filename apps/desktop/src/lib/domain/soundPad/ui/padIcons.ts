import type {SoundPadType} from "$lib/domain/soundPad/_types";
import {AudioLines, Crosshair, InfinityIcon, Music} from "@lucide/svelte";

export const padIcons: Record<SoundPadType, typeof Music> = {
  music: Music,
  fx: AudioLines,
  loop: InfinityIcon,
  one_shot: Crosshair
}