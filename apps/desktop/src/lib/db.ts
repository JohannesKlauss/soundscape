import { Dexie, type EntityTable } from "dexie";
import type { SoundScape } from "$lib/domain/soundscapes/_types";

const db = new Dexie("soundscape") as Dexie & {
  soundscapes: EntityTable<SoundScape, "id">;
};

db.version(1).stores({
  soundscapes: "++id,name",
});

export { db };
