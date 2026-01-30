import {mimeToExt} from "$lib/fileSystem";

export type SoundSampleCategory = 'music' | 'fx' | 'one_shot' | 'atmosphere'

export type SoundSampleSourceType = 'local' | 'web' | 'yt'

export type SoundSample = {
  id: number
  name: string
  src: string
  contentType: keyof typeof mimeToExt
  category: SoundSampleCategory
  type: SoundSampleSourceType
}