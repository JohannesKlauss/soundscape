import { Dexie, type EntityTable } from "dexie";
import type {SoundSet, SoundSetHasPad} from "$lib/domain/soundSet/_types";
import type {SoundSample} from "$lib/domain/soundSample/_types";
import type {SoundPad} from "$lib/domain/soundPad/_types";

const db = new Dexie("soundscape") as Dexie & {
  set: EntityTable<SoundSet, "id">
  sample: EntityTable<SoundSample, "id">
  pad: EntityTable<Omit<SoundPad, 'samples'> & {sampleIds: number[]}, "id">
  setHasPads: EntityTable<SoundSetHasPad, "setId" | "padId">
};

db.version(1).stores({
  set: "++id",
  sample: "++id",
  pad: "++id",
  setHasPads: "[setId+padId]"
});

export { db };
