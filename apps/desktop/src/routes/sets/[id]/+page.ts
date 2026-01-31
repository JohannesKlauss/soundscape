import type { PageLoad } from "./$types";
import {db} from "$lib/db";

export const load: PageLoad = async ({params}) => {
  const id = parseInt(params.id, 10)

  const set = await db.set.where('id').equals(id).first()

  return {
    set,
  }
}