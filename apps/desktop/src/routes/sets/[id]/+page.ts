import type { PageLoad } from "./$types";
import {db} from "$lib/db";

export const load: PageLoad = async ({params}) => {
  return {
    set: await db.set.where('id').equals(parseInt(params.id, 10)).first()
  }
}