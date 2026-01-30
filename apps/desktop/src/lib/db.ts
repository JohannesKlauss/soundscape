import { Dexie, type EntityTable } from "dexie";
import type { SoundSet } from "$lib/domain/soundSet/_types";
import type {SoundSample} from "$lib/domain/soundSample/_types";
import type {SoundPad} from "$lib/domain/soundPad/_types";

const db = new Dexie("soundscape") as Dexie & {
  set: EntityTable<SoundSet, "id">;
  sample: EntityTable<SoundSample, "id">
  pad: EntityTable<SoundPad, "id">
};

db.version(1).stores({
  set: "++id,name",
  sample: "++id,name,src,category,type,contentType",
  pad: "++id,name,type"
});

export { db };
