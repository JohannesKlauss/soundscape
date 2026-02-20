import type {SoundPadEditForm} from "$lib/domain/soundPad/_types";
import type {Mood} from "$lib/domain/soundSet/mood/_types";

declare global {
  namespace App {
    interface PageState {
      editPad?: SoundPadEditForm
      editMood?: Mood
    }
  }
}