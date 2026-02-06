export type SoundSet = {
  id: number;
  name: string;
  moodIds: number[];
};

export type SoundSetHasPad = {
  setId: number;
  padId: number;
}