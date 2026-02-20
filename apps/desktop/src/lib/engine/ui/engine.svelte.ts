import {Players} from "tone";
import {page} from "$app/state";
import {pushState} from "$app/navigation";


export function playMood(moodId: number) {
  if (page.state.activeMoodId === moodId) {
    stopActiveMood()
  } else {
    pushState('', {
      activeMoodId: moodId,
    })
  }
}

export function stopActiveMood() {
  pushState('', {
    activeMoodId: undefined,
  })
}