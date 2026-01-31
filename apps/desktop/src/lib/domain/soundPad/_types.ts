export type PadType = 'music' | 'loop' | 'fx' | 'one_shot'

export type SoundPad = {
  id: number
  name: string
  type: PadType
  fadeInSeconds: number
  fadeOutSeconds: number
}

