export type SoundSampleCategory = 'music' | 'fx' | 'one_shot' | 'atmosphere'

export type SoundSampleSourceType = 'local' | 'web' | 'yt'

export type SoundSample = {
  id: number
  name: string
  src: string
  category: SoundSampleCategory
  type: SoundSampleSourceType
}