import {z} from "zod";
import {SoundSampleSchema} from "$lib/domain/soundSample/_types";
import {db} from "$lib/db";

export const SoundPadCreationSchema = z.object({
  name: z.string().min(3),
  type: z.union([z.literal('music'), z.literal('loop'), z.literal('fx'), z.literal('one_shot')]).default('music'),
  fadeInSeconds: z.int().min(0).max(30).multipleOf(0.1).default(0.5),
  fadeOutSeconds: z.int().min(0).max(30).multipleOf(0.1).default(0.5),
  playbackType: z.union([z.literal('random'), z.literal('round_robin')]).default('random'),
  samples: z.array(SoundSampleSchema.pick({id: true, name: true})).min(1, 'At least one sample is needed to create a pad'),
})

export type SoundPadEditForm = z.infer<typeof SoundPadCreationSchema> & {id: number}

export type SoundPad = Omit<z.infer<typeof SoundPadCreationSchema>, 'samples'> & {
  id: number
  sampleIds: number[]
}

export type SoundPadType = SoundPad['type']

export async function padToForm(pad: SoundPad): Promise<SoundPadEditForm> {
  const samples = await db.sample.where('id').anyOf(pad.sampleIds).toArray()

  return {
    ...pad,
    samples,
  }
}