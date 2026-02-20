import type {SoundPadEditForm} from "$lib/domain/soundPad/_types";

declare global {
  namespace App {
    interface PageState {
      editPad?: SoundPadEditForm
      activeMoodId?: number
    }
  }
}