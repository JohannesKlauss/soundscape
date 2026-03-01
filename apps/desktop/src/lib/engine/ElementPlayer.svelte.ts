import { CrossFade, getTransport, Player } from 'tone'
import type { SoundPad } from '$lib/domain/soundPad/_types'
import {sampleBuffers} from '$lib/engine/engine.svelte'

export class ElementPlayer {
  #pad: SoundPad

  #playerA = new Player()
  #playerB = new Player()
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
  startedAt = 0

  constructor(_pad: SoundPad) {
    this.#pad = _pad
    this.#playerA.connect(this.#crossfader.a)
    this.#playerB.connect(this.#crossfader.b)

    getTransport().on('globalStop', () => {
      this.stop()
    })
  }

  get currentPlayer() {
    if (!this.isPlaying) {
      return undefined
    }

    return this.#activeSlot === 'a' ? this.#playerA : this.#playerB
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

    this.isPlaying = false
    this.isStopping = false
    this.lastPlayedSampleId = undefined
    this.#activeSlot = 'a'
    this.#crossfader.output.gain.cancelScheduledValues(0)
    this.#crossfader.fade.cancelScheduledValues(0)
    this.#crossfader.fade.value = 0
  }

  play(startingVolume: number = 0, fadeInSeconds?: number) {
    if (this.currentPlayer?.state === 'started' && !this.isStopping) {
      return
    }

    this.#clearScheduledStop()

    const sampleId = this.#getNextSampleId()
    const buffer = sampleBuffers.get(sampleId)

    if (!buffer) {
      console.error(`No buffer found for sample ${sampleId}`)
      return
    }

    const fadeInTime = fadeInSeconds ?? Math.min(buffer.duration, this.#pad.fadeInSeconds)

    if (this.currentPlayer?.state === 'started' && this.isStopping) {
      this.#crossfader.output.gain.rampTo(this.#lastVolume, fadeInTime)

      this.isPlaying = true
      this.isStopping = false

      return
    }

    this.#activeSlot = 'a'
    this.#crossfader.output.gain.value = startingVolume
    this.#crossfader.fade.value = 0

    this.#playerA.onstop = () => {}
    this.#playerB.onstop = () => {}

    this.#playerA.stop()
    this.#playerB.stop()
    this.#playerA.buffer.set(buffer)
    this.#playerA.start()

    this.#crossfader.output.gain.rampTo(this.#lastVolume, fadeInTime)

    this.startedAt = this.#playerA.now()
    this.isPlaying = true
    this.isStopping = false
    this.lastPlayedSampleId = sampleId
    this.duration = this.#playerA.buffer.duration

    if (this.#pad.sampleIds.length > 1 || this.#pad.type === 'loop') {
      this.#scheduledEventId = getTransport().scheduleOnce(
        this.#crossfadeToNextSample.bind(this),
        `+${Math.max(0, this.#playerA.buffer.duration - this.#pad.crossfade)}`,
      )
    } else {
      this.#playerA.onstop = () => {
        if (this.isStopping || this.#pad.sampleIds.length > 1 || this.#pad.type === 'loop') {
          return
        }

        this.isPlaying = false
        this.lastPlayedSampleId = undefined

        this.#playerA.onstop = () => {}
      }
    }
  }

  stop(fadeOutSeconds?: number) {
    if (!this.isPlaying || !this.currentPlayer || this.isStopping) {
      return
    }

    this.#clearScheduledStop()

    const fadeOutTime = fadeOutSeconds ?? Math.max(0.01, this.#pad.fadeOutSeconds)

    this.#crossfader.output.gain.rampTo(0, fadeOutTime)

    this.isStopping = true

    this.#scheduledStopId = getTransport().scheduleOnce(() => {
      if (this.currentPlayer) {
        this.currentPlayer.onstop = () => {}
        this.currentPlayer.stop()
        this.#cleanup()
      }
    }, `+${fadeOutTime}`)
  }

  #crossfadeToNextSample() {
    if (!this.isPlaying) {
      return
    }

    const nextSampleId = this.#getNextSampleId()
    const buffer = sampleBuffers.get(nextSampleId)

    if (!buffer) {
      console.error(`No buffer found for sample ${nextSampleId}`)
      return
    }

    const nextPlayer = this.#activeSlot === 'a' ? this.#playerB : this.#playerA
    const fadeTarget = this.#activeSlot === 'a' ? 1 : 0

    const crossfadeDuration = Math.min(this.#pad.crossfade, nextPlayer.buffer.duration)

    nextPlayer.stop()

    if (nextPlayer.buffer.get() !== buffer) {
      nextPlayer.buffer.set(buffer)
    }

    nextPlayer.start()

    this.#crossfader.fade.rampTo(fadeTarget, crossfadeDuration)

    this.#activeSlot = this.#activeSlot === 'a' ? 'b' : 'a'

    this.lastPlayedSampleId = nextSampleId

    this.#scheduledEventId = getTransport().scheduleOnce(
      this.#crossfadeToNextSample.bind(this),
      `+${Math.max(0, nextPlayer.buffer.duration - this.#pad.crossfade)}`,
    )

    getTransport().scheduleOnce(t => {
      this.startedAt = t
      this.duration = Math.max(0, nextPlayer.buffer.duration - crossfadeDuration)
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
