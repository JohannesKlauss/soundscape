import {z} from "zod";
import {SoundSampleSchema} from "$lib/domain/soundSample/_types";
import {db} from "$lib/db";

export const SoundPadCreationSchema = z.object({
  name: z.string().min(3),
  type: z.union([z.literal('music'), z.literal('loop'), z.literal('fx'), z.literal('one_shot')]).default('music'),
  fadeInSeconds: z.number().min(0).max(30).multipleOf(0.1).default(0.5),
  fadeOutSeconds: z.number().min(0).max(30).multipleOf(0.1).default(0.5),
  playbackType: z.union([z.literal('random'), z.literal('round_robin')]).default('round_robin'),
  crossfade: z.number().min(0).multipleOf(0.1).default(5),
  samples: z.array(SoundSampleSchema).nonempty('At least one sample is needed to create a pad'),
}).refine(data => data.crossfade <= Math.min(...data.samples.map(s => s.duration)), {
  error: 'Crossfade cannot exceed shortest sample in the list',
  path: ['crossfade'],
})

export type SoundPadEditForm = z.infer<typeof SoundPadCreationSchema> & {id: number}

export type SoundPad = Omit<z.infer<typeof SoundPadCreationSchema>, 'samples'> & {
  id: number
  sampleIds: number[]
}

export type SoundPadType = SoundPad['type']

export async function padToForm(pad: SoundPad): Promise<SoundPadEditForm> {
  const samplesById = await db.sample.where('id').anyOf(pad.sampleIds).toArray()

  // Sort samples to match the order in pad.sampleIds
  const sampleMap = new Map(samplesById.map(s => [s.id, s]))
  const samples = pad.sampleIds.map(id => sampleMap.get(id)!).filter(Boolean)

  return {
    ...pad,
    samples,
  }
}

export const padTypeToLabel: Record<SoundPadType, string> = {
  one_shot: 'One Shot',
  loop: 'Loop',
  fx: 'FX',
  music: 'Music',
}