import {z} from "zod";

export const SoundSetCreationSchema = z.object({
  name: z.string().min(3)
})

export type SoundSet = z.infer<typeof SoundSetCreationSchema> & {
  id: number;
  moodIds: number[];
};

export type SoundSetHasPad = {
  setId: number;
  padId: number;
}