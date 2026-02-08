import type {LayoutLoad} from "./$types";
import {db} from "$lib/db";
import {redirect} from "@sveltejs/kit";

export const load: LayoutLoad = async ({params}) => {
  const id = parseInt(params.id, 10)

  const set = await db.set.where('id').equals(id).first()

  if (!set) {
    redirect(303, '/')
  }

  return {
    set,
  }
}