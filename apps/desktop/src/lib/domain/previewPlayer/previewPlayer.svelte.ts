import { getTransport } from 'tone'

import { readFileFromSamplesDirectory } from '$lib/fileSystem'

type State = {
  currentPlayingSource?: string
}

const _state = $state<State>({
  currentPlayingSource: undefined,
})

export const previewPlayerState: Readonly<State> = _state

const audio = new Audio()

audio.addEventListener('ended', () => {
  _state.currentPlayingSource = undefined
})

audio.addEventListener('error', () => {
  _state.currentPlayingSource = undefined
})

getTransport().on('globalStop', () => {
  stopPreviewSource()
})

export async function previewSource(src: string, contentType: string) {
  audio.pause()

  const file = await readFileFromSamplesDirectory(src)
  const blob = new Blob([file], { type: contentType })
  audio.src = URL.createObjectURL(blob)

  await audio.play()
  _state.currentPlayingSource = src
}

export async function previewFromUrl(url: string) {
  audio.pause()

  audio.src = url
  await audio.play()
  _state.currentPlayingSource = url
}

export function stopPreviewSource() {
  audio.pause()
  audio.currentTime = 0
  _state.currentPlayingSource = undefined
}
