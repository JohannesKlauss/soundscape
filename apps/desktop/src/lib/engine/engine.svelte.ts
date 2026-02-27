import { SvelteMap } from 'svelte/reactivity'
import { toast } from 'svelte-sonner'
import { getContext, getTransport } from 'tone'
import { goto } from '$app/navigation'
import { db } from '$lib/db'
import type { Mood } from '$lib/domain/soundSet/mood/_types'
import { ElementPlayer } from '$lib/engine/ElementPlayer.svelte'
import { readBufferFromSamplesFile } from '$lib/fileSystem'

type EngineState = {
  isLoading: boolean
  activeMoodId?: number
  playingPadIds: number[]
}

const _state = $state<EngineState>({
  isLoading: false,
  playingPadIds: [],
})

export const CROSSFADE_SECONDS_BETWEEN_MOODS = 5

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
  const pads = await db.pad
    .where('id')
    .anyOf(setHasPads.map((s) => s.padId))
    .toArray()
  const samples = await db.sample
    .where('id')
    .anyOf(pads.flatMap((p) => p.sampleIds))
    .toArray()

  await Promise.all(
    samples.map(async (s) => {
      if (!_sampleBuffers.has(s.id)) {
        _sampleBuffers.set(s.id, await getContext().decodeAudioData(await readBufferFromSamplesFile(s.src)))
      }
    }),
  )

  pads.forEach(pad => {
    if (!elementPlayers.has(pad.id)) {
      elementPlayers.set(pad.id, new ElementPlayer(pad))
    }
  })

  _state.isLoading = false
}

export async function playMood(mood: Mood) {
  await goto(`?viewMoodId=${mood.id}`)

  if (_state.activeMoodId === mood.id) {
    Object.keys(mood.elements).forEach((id) => {
      elementPlayers.get(parseInt(id, 10))?.stop()
    })

    getTransport().schedule(() => {
      _state.activeMoodId = undefined
    }, `+${CROSSFADE_SECONDS_BETWEEN_MOODS}`)
  } else if (!_state.activeMoodId) {
    Object.keys(mood.elements).forEach((id) => {
      elementPlayers.get(parseInt(id, 10))?.play(0)
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

    fadeOutIds.forEach((id) => {
      elementPlayers.get(parseInt(id, 10))?.stop(CROSSFADE_SECONDS_BETWEEN_MOODS)
    })

    fadeInIds.forEach((id) => {
      elementPlayers.get(parseInt(id, 10))?.play(0)
    })

    _state.activeMoodId = mood.id
  }
}
