import {getContext, getTransport} from "tone"
import {db} from "$lib/db"
import {readBufferFromSamplesFile} from "$lib/fileSystem"
import {ElementPlayer} from "$lib/engine/ElementPlayer.svelte"
import {SvelteMap} from "svelte/reactivity"
import type {Mood} from "$lib/domain/soundSet/mood/_types"
import {goto} from "$app/navigation";
import {toast} from "svelte-sonner";

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

const _sampleBuffers = new Map<number, AudioBuffer>()

export const sampleBuffers: ReadonlyMap<number, AudioBuffer> = _sampleBuffers

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
    if (!_sampleBuffers.has(s.id)) {
      _sampleBuffers.set(s.id, await getContext().decodeAudioData(await readBufferFromSamplesFile(s.src)))
    }
  }))

  pads.map(pad => {
    if (!elementPlayers.has(pad.id)) {
      elementPlayers.set(pad.id, new ElementPlayer(pad))
    }
  })

  _state.isLoading = false
}

export async function playMood(mood: Mood) {
  await goto(`?viewMoodId=${mood.id}`)

  getTransport().start()

  if (_state.activeMoodId === mood.id) {
    getTransport().emit('fadeOut', mood).stop('+5')
    getTransport().once('stop', () => {
      _state.activeMoodId = undefined
    })
  } else if (!_state.activeMoodId) {
    Object.keys(mood.elements).forEach(id => {
      elementPlayers.get(parseInt(id, 10))?.play()
    })

    _state.activeMoodId = mood.id
  } else {
    const previousMood = await db.mood.where('id').equals(_state.activeMoodId).first()

    if (!previousMood) {
      toast.error('Trying to fade between moods, but could not find currently playing mood.')

      return
    }

    const previousIds = new Set(Object.keys(previousMood.elements))
    const newIds = new Set(Object.keys(mood.elements))

    const fadeOutIds = previousIds.difference(newIds)
    const fadeInIds = newIds.difference(previousIds)

    console.log('fadeOutIds', fadeOutIds)
    console.log('fadeInIds', fadeInIds)

    fadeOutIds.forEach(id => {
      elementPlayers.get(parseInt(id, 10))?.fadeTo(0, 5, true)
    })

    fadeInIds.forEach(id => {
      const player = elementPlayers.get(parseInt(id, 10))

      player?.play(0)
      player?.fadeTo(mood.elements[parseInt(id, 10)].volume, 5)
    })

    _state.activeMoodId = mood.id
  }
}
