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

    setInterval(() => {
      if (this.isPlaying) {
        console.log(this.#activeSlot, this.#playerA.state, this.#playerB.state, this.#crossfader.fade.value, this.#crossfader.output.gain.value)
      }
    }, 100)
  }

  get currentPlayer() {
    if (!this.isPlaying) {
      return undefined
    }

    return this.#activeSlot === 'a' ? this.#playerA : this.#playerB
  }

  set volume(volume: number) {
    this.#crossfader.output.gain.value = volume
    this.#lastVolume = volume
  }

  #cleanup() {
    console.log('cleanup')

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

  play(startingVolume: number = 0) {
    console.log('play')

    if (this.#scheduledStopId) {
      getTransport().clear(this.#scheduledStopId)
    }

    if (this.#pad.id === 10) {
      console.log('play alien atmo')
    }

    const sampleId = this.#getNextSampleId()
    const buffer = sampleBuffers.get(sampleId)

    if (!buffer) {
      console.error(`No buffer found for sample ${sampleId}`)
      return
    }

    const fadeInTime = Math.min(buffer.duration, this.#pad.fadeInSeconds)

    this.#activeSlot = 'a'
    this.#crossfader.output.gain.value = startingVolume
    this.#crossfader.fade.value = 0

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
        if (!this.isStopping) {
          console.log('onstop')

          this.isPlaying = false
          this.lastPlayedSampleId = undefined
        }

        this.#playerA.onstop = () => {}
      }
    }
  }

  stop(fadeOutSeconds?: number) {
    if (!this.isPlaying || !this.currentPlayer || this.isStopping) {
      return
    }

    console.log('stop sample')

    const fadeOutTime = fadeOutSeconds ?? Math.max(0.01, this.#pad.fadeOutSeconds)

    this.#crossfader.output.gain.rampTo(0, fadeOutTime)
    this.currentPlayer.stop(`+${fadeOutTime}`)

    this.isStopping = true

    if (this.#scheduledEventId !== null) {
      getTransport().clear(this.#scheduledEventId)
      this.#scheduledEventId = null
    }

    getTransport().scheduleOnce(this.#cleanup.bind(this), `+${fadeOutTime}`)
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

    console.log('fade to', this.#activeSlot, crossfadeDuration)

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
}
