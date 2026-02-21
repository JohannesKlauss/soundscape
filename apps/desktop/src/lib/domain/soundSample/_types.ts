import { z } from 'zod'

export const SoundSampleCreationSchema = z.object({
  name: z.string().min(3),
  src: z.string().min(3),
  contentType: z.string(),
  category: z.union([
    z.literal('music'),
    z.literal('fx'),
    z.literal('atmosphere'),
  ]),
  duration: z.number(),
  type: z.union([z.literal('local'), z.literal('web'), z.literal('yt')]),
})

export const SoundSampleSchema = SoundSampleCreationSchema.extend({
  id: z.int().positive(),
})

export type SoundSample = z.infer<typeof SoundSampleSchema>

export type SoundSampleSourceType = SoundSample['type']
export type SoundSampleCategory = SoundSample['category']
