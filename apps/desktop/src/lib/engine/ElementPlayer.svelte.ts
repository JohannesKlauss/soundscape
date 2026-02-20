import {CrossFade, getContext, getTransport, Player} from "tone"
import {volumeToDb} from "$lib/engine/volume"
import type {SoundPad} from "$lib/domain/soundPad/_types"
import {sampleBuffers} from "$lib/engine/engine.svelte"

export class ElementPlayer {
  #pad: SoundPad

  #playerA = new Player()
  #playerB = new Player()
  #crossfader = new CrossFade({fade: 0}).toDestination()

  #activeSlot: 'a' | 'b' = 'a'
  #scheduledEventId: number | null = null

  isPlaying = $state(false)
  isStopping = $state(false)

  lastPlayedSampleId: number | undefined = undefined

  duration = 0
  startedAt = 0

  constructor(_pad: SoundPad) {
    this.#pad = _pad
    this.#playerA.connect(this.#crossfader.a)
    this.#playerB.connect(this.#crossfader.b)

    getTransport().on('stop', (time) => {
      this.#cleanup(time)
    })
  }

  get currentPlayer() {
    if (!this.isPlaying) {
      return undefined
    }

    return this.#activeSlot === 'a' ? this.#playerA : this.#playerB
  }

  destroy() {
    this.#cleanup(getContext().currentTime)
    this.#playerA.dispose()
    this.#playerB.dispose()
    this.#crossfader.dispose()
  }

  set volume(volume: number) {
    this.#crossfader.output.gain.value = volume
  }

  play() {
    const sampleId = this.#getNextSampleId()
    const buffer = sampleBuffers.get(sampleId)

    if (!buffer) {
      console.error(`No buffer found for sample ${sampleId}`)
      return
    }

    this.#activeSlot = 'a'
    this.#crossfader.fade.value = 0

    this.#playerA.buffer.set(buffer)
    this.#playerA.fadeIn = this.#pad.fadeInSeconds
    this.#playerA.fadeOut = this.#pad.fadeOutSeconds
    this.#playerA.sync().start()

    this.startedAt = this.#playerA.now()
    this.isPlaying = true
    this.lastPlayedSampleId = sampleId
    this.duration = this.#playerA.buffer.duration

    if (this.#pad.sampleIds.length > 1 || this.#pad.type === 'loop') {
      this.#scheduledEventId = getTransport().schedule(
        this.#crossfadeToNextSample.bind(this),
        `+${Math.max(0, this.#playerA.buffer.duration - this.#pad.crossfade)}`
      )
    } else {
      // For single non-loop samples, mark as not playing when the buffer ends
      this.#playerA.onstop = () => {
        this.isPlaying = false
        this.lastPlayedSampleId = undefined
        this.#playerA.onstop = () => {
        }
      }
    }
  }

  stop() {
    if (!this.isPlaying || !this.currentPlayer) {
      return
    }

    this.#playerA.fadeOut = this.#pad.fadeOutSeconds
    this.#playerB.fadeOut = this.#pad.fadeOutSeconds
    this.currentPlayer.stop()

    this.isStopping = true

    if (this.#scheduledEventId !== null) {
      getTransport().clear(this.#scheduledEventId)
      this.#scheduledEventId = null
    }

    getTransport().schedule(this.#cleanup.bind(this), `+${this.#pad.fadeOutSeconds + 0.1}`)
  }

  #cleanup(time: number) {
    if (this.#scheduledEventId !== null) {
      getTransport().clear(this.#scheduledEventId)
      this.#scheduledEventId = null
    }

    this.#playerA.stop(time).unsync()
    this.#playerB.stop(time).unsync()

    this.isPlaying = false
    this.isStopping = false
    this.lastPlayedSampleId = undefined
    this.#activeSlot = 'a'
    this.#crossfader.fade.value = 0
  }

  #crossfadeToNextSample(time: number) {
    console.log('execute crossfade', time)

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
    const oldPlayer = this.#activeSlot === 'a' ? this.#playerA : this.#playerB
    const fadeTarget = this.#activeSlot === 'a' ? 1 : 0

    nextPlayer.stop(time)
    nextPlayer.buffer.set(buffer)
    nextPlayer.fadeIn = 0
    nextPlayer.fadeOut = 0
    nextPlayer.sync().start(time)

    const crossfadeDuration = Math.min(this.#pad.crossfade, nextPlayer.buffer.duration)

    this.#crossfader.fade.rampTo(fadeTarget, crossfadeDuration, time)

    console.log(fadeTarget, crossfadeDuration)

    this.#activeSlot = this.#activeSlot === 'a' ? 'b' : 'a'
    this.lastPlayedSampleId = nextSampleId

    this.#scheduledEventId = getTransport().schedule(
      this.#crossfadeToNextSample.bind(this),
      `+${Math.max(0, nextPlayer.buffer.duration - this.#pad.crossfade)}`
    )

    getTransport().schedule(t => {
      this.startedAt = t
      this.duration = Math.max(0, nextPlayer.buffer.duration - crossfadeDuration)

      oldPlayer.stop(t)
    }, `+${crossfadeDuration}`)
  }

  #getNextSampleId(): number {
    const index = this.#pad.sampleIds.findIndex(id => id === this.lastPlayedSampleId)

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
