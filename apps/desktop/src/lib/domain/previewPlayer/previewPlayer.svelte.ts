import {Player} from "tone";
import {readFileFromSamplesDirectory} from "$lib/fileSystem";

type State = {
  currentPlayingSource?: string
}

let _state = $state<State>({
  currentPlayingSource: undefined
})

export const previewPlayerState: Readonly<State> = _state

const previewPlayer = new Player().toDestination()

previewPlayer.fadeIn = 0.05
previewPlayer.fadeOut = 0.05

export async function previewSource(src: string, contentType: string) {
  if (previewPlayer.state === 'started') {
    previewPlayer.stop()
  }

  const file = await readFileFromSamplesDirectory(src)

  const blob = new Blob([await file.arrayBuffer()], {type: contentType});
  const url = window.URL.createObjectURL(blob);

  await previewPlayer.load(url)

  previewPlayer.start()
  _state.currentPlayingSource = src

  return () => {
    previewPlayer.stop()
    _state.currentPlayingSource = undefined
  }
}

export async function stopPreviewSource() {
  previewPlayer.stop()
  _state.currentPlayingSource = undefined
}