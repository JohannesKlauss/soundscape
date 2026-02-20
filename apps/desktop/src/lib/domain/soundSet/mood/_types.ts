import {z} from "zod";

export const MoodCreationSchema = z.object({
  name: z.string().min(3),
})

export type Mood = z.infer<typeof MoodCreationSchema> & {
  id: number;
  elements: Record<number, {
    volume: number
    playsInMood?: true
  }>
}