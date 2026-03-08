import { CrossFade, connect, getContext, getTransport } from 'tone'
import type { SoundPad } from '$lib/domain/soundPad/_types'
import { sampleUrls, sampleDurations } from '$lib/engine/engine.svelte'

export class ElementPlayer {
  #pad: SoundPad

  #audioA = new Audio()
  #audioB = new Audio()
  #sourceA: MediaElementAudioSourceNode | null = null
  #sourceB: MediaElementAudioSourceNode | null = null
  #crossfader = new CrossFade({ fade: 0 }).toDestination()

  #activeSlot: 'a' | 'b' = 'a'
  #scheduledEventId: number | null = null
  #scheduledStopId: number | null = null

  #lastVolume = 1

  targetVolume = $state(1)
  isPlaying = $state(false)
  isStopping = $state(false)

  lastPlayedSampleId: number | undefined = undefined

  duration = 0

  constructor(_pad: SoundPad) {
    this.#pad = _pad

    const ctx = getContext().rawContext as AudioContext
    this.#sourceA = ctx.createMediaElementSource(this.#audioA)
    this.#sourceB = ctx.createMediaElementSource(this.#audioB)
    connect(this.#sourceA, this.#crossfader.a)
    connect(this.#sourceB, this.#crossfader.b)

    getTransport().on('globalStop', () => {
      this.stop()
    })
  }

  get currentAudio(): HTMLAudioElement | undefined {
    if (!this.isPlaying) {
      return undefined
    }

    return this.#activeSlot === 'a' ? this.#audioA : this.#audioB
  }

  set volume(volume: number) {
    this.#crossfader.output.gain.rampTo(volume, 0.05)
    this.#lastVolume = volume
    this.targetVolume = volume
  }

  setTargetVolume(volume: number) {
    this.#lastVolume = volume
    this.targetVolume = volume
  }

  updatePad(pad: SoundPad) {
    if (this.isPlaying) {
      this.stop()
    }

    this.#pad = pad
  }

  dispose() {
    this.#clearScheduledStop()

    if (this.isPlaying) {
      this.#cleanup()
    }

    this.#sourceA?.disconnect()
    this.#sourceB?.disconnect()
    this.#crossfader.dispose()

    this.#audioA.removeAttribute('src')
    this.#audioA.load()
    this.#audioB.removeAttribute('src')
    this.#audioB.load()
  }

  fadeTo(targetVolume: number, durationSeconds: number) {
    this.#crossfader.output.gain.rampTo(targetVolume, durationSeconds)
    this.#lastVolume = targetVolume
    this.targetVolume = targetVolume
  }

  #cleanup() {
    if (this.#scheduledEventId !== null) {
      getTransport().clear(this.#scheduledEventId)
      this.#scheduledEventId = null
    }

    this.#audioA.pause()
    this.#audioA.currentTime = 0
    this.#audioB.pause()
    this.#audioB.currentTime = 0

    this.isPlaying = false
    this.isStopping = false
    this.lastPlayedSampleId = undefined
    this.#activeSlot = 'a'
    this.#crossfader.output.gain.cancelScheduledValues(0)
    this.#crossfader.fade.cancelScheduledValues(0)
    this.#crossfader.fade.value = 0
  }

  play(startingVolume: number = 0, fadeInSeconds?: number) {
    if (this.currentAudio && !this.currentAudio.paused && !this.isStopping) {
      return
    }

    this.#clearScheduledStop()

    const sampleId = this.#getNextSampleId()
    const url = sampleUrls.get(sampleId)
    const sampleDuration = sampleDurations.get(sampleId)

    if (!url || sampleDuration === undefined) {
      console.error(`No URL/duration found for sample ${sampleId}`)
      return
    }

    const fadeInTime = fadeInSeconds ?? Math.min(sampleDuration, this.#pad.fadeInSeconds)

    if (this.currentAudio && !this.currentAudio.paused && this.isStopping) {
      this.#crossfader.output.gain.rampTo(this.#lastVolume, fadeInTime)

      this.isPlaying = true
      this.isStopping = false

      return
    }

    this.#activeSlot = 'a'
    this.#crossfader.output.gain.value = startingVolume
    this.#crossfader.fade.value = 0

    this.#audioA.pause()
    this.#audioB.pause()
    this.#audioA.src = url
    this.#audioA.currentTime = 0
    this.#audioA.play()

    this.#crossfader.output.gain.rampTo(this.#lastVolume, fadeInTime)

    this.isPlaying = true
    this.isStopping = false
    this.lastPlayedSampleId = sampleId
    this.duration = sampleDuration

    if (this.#pad.sampleIds.length > 1 || this.#pad.type === 'loop') {
      this.#scheduledEventId = getTransport().scheduleOnce(
        this.#crossfadeToNextSample.bind(this),
        `+${Math.max(0, sampleDuration - this.#pad.crossfade)}`,
      )
    } else {

      const handler = () => {
        if (this.isStopping || this.#pad.sampleIds.length > 1 || this.#pad.type === 'loop') {
          return
        }

        this.isPlaying = false
        this.lastPlayedSampleId = undefined
        this.#audioA.removeEventListener('ended', handler)
      }

      this.#audioA.addEventListener('ended', handler)
    }
  }

  stop(fadeOutSeconds?: number) {
    if (!this.isPlaying || !this.currentAudio || this.isStopping) {
      return
    }

    this.#clearScheduledStop()

    const fadeOutTime = fadeOutSeconds ?? Math.max(0.01, this.#pad.fadeOutSeconds)

    this.#crossfader.output.gain.rampTo(0, fadeOutTime)

    this.isStopping = true

    this.#scheduledStopId = getTransport().scheduleOnce(() => {
      this.#cleanup()
    }, `+${fadeOutTime}`)
  }

  #crossfadeToNextSample() {
    if (!this.isPlaying) {
      return
    }

    const nextSampleId = this.#getNextSampleId()
    const url = sampleUrls.get(nextSampleId)
    const nextDuration = sampleDurations.get(nextSampleId)

    if (!url || nextDuration === undefined) {
      console.error(`No URL/duration found for sample ${nextSampleId}`)
      return
    }

    const nextAudio = this.#activeSlot === 'a' ? this.#audioB : this.#audioA
    const fadeTarget = this.#activeSlot === 'a' ? 1 : 0

    const crossfadeDuration = Math.min(this.#pad.crossfade, nextDuration)

    nextAudio.pause()
    nextAudio.src = url
    nextAudio.currentTime = 0
    nextAudio.play()

    this.#crossfader.fade.rampTo(fadeTarget, crossfadeDuration)

    this.#activeSlot = this.#activeSlot === 'a' ? 'b' : 'a'

    this.lastPlayedSampleId = nextSampleId

    this.#scheduledEventId = getTransport().scheduleOnce(
      this.#crossfadeToNextSample.bind(this),
      `+${Math.max(0, nextDuration - this.#pad.crossfade)}`,
    )

    getTransport().scheduleOnce(() => {
      this.duration = Math.max(0, nextDuration - crossfadeDuration)
    }, `+${crossfadeDuration}`)
  }

  #getNextSampleId(): number {
    const index = this.lastPlayedSampleId ? this.#pad.sampleIds.indexOf(this.lastPlayedSampleId) : -1

    if (this.#pad.playbackType === 'round_robin') {
      if (index === -1) {
        return this.#pad.sampleIds[0]
      }

      return this.#pad.sampleIds[(index + 1) % this.#pad.sampleIds.length]
    } else {
      return this.#pad.sampleIds[Math.floor(Math.random() * this.#pad.sampleIds.length)]
    }
  }

  #clearScheduledStop() {
    if (this.#scheduledStopId !== null) {
      getTransport().clear(this.#scheduledStopId)
      this.#scheduledStopId = null
    }
  }
}
