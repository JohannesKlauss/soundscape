import {getContext, Players} from "tone";
import {db} from "$lib/db";
import {readBufferFromSamplesFile} from "$lib/fileSystem";
import {ElementPlayer} from "$lib/engine/ElementPlayer.svelte";
import {SvelteMap} from "svelte/reactivity";

type EngineState = {
  isLoading: boolean
  activeMoodId?: number
  playingPadIds: number[]
}

const _state = $state<EngineState>({
  isLoading: false,
  playingPadIds: [],
})

export const engineState = _state as Readonly<EngineState>

const sampleCache = new Map<number, AudioBuffer>()
const elementPlayers = new SvelteMap<number, ElementPlayer>()

export function getElementPlayer(padId: number): ElementPlayer {
  const player = elementPlayers.get(padId)

  if (!player) {
    throw new Error(`ElementPlayer for pad ${padId} does not exist.`)
  }

  return player
}

export async function loadSoundSet(setId: number) {
  _state.isLoading = true

  const setHasPads = await db.setHasPads.where('setId').equals(setId).toArray()
  const pads = await db.pad.where('id').anyOf(setHasPads.map(s => s.padId)).toArray()
  const samples = await db.sample.where('id').anyOf(pads.flatMap(p => p.sampleIds)).toArray()

  await Promise.all(samples.map(async s => {
    if (!sampleCache.has(s.id)) {
      sampleCache.set(s.id, await getContext().decodeAudioData(await readBufferFromSamplesFile(s.src)))
    }
  }))

  pads.map(pad => {
    if (!elementPlayers.has(pad.id)) {
      const players = new Players()

      pad.sampleIds.forEach(id => {
        if (!players.has(id.toString())) {
          players.add(id.toString(), sampleCache.get(id)!)
        }
      })

      elementPlayers.set(pad.id, new ElementPlayer(pad, players))
    }
  })

  _state.isLoading = false
}

export function playMood(moodId: number) {
  if (_state.activeMoodId === moodId) {
    stopActiveMood()
  } else {
    _state.activeMoodId = moodId
  }
}

export function stopActiveMood() {
  _state.activeMoodId = undefined
}