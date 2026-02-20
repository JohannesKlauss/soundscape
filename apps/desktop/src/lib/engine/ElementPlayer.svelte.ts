import {CrossFade, getTransport, Players} from "tone";
import {volumeToDb} from "$lib/engine/volume";
import type {SoundPad} from "$lib/domain/soundPad/_types";

export class ElementPlayer {
  #pad: SoundPad
  
  #players = new Players()
  #crossfader = new CrossFade({fade: 0}).toDestination()

  isPlaying = $state(false)
  isStopping = $state(false)

  lastPlayedSampleId: number | undefined = undefined
  
  duration = 0
  startedAt = 0
  
  constructor(_pad: SoundPad, _players: Players) {
    this.#pad = _pad
    this.#players = _players

    getTransport().on('stop', () => {
      this.isPlaying = false
      this.lastPlayedSampleId = undefined
    })
  }

  get output() {
    return this.#crossfader.output
  }
  
  destroy() {
    this.#players.stopAll().dispose()
    this.#crossfader.dispose()
  }
  
  set volume(volume: number) {
    if (this.lastPlayedSampleId) {
      this.#players.player(this.lastPlayedSampleId.toString()).volume.value = volumeToDb(volume)
    } else {
      this.#players.volume.value = volumeToDb(volume)
    }
  }
  
  play() {
    const sampleId = this.#getNextSampleId()
    const player = this.#players.player(sampleId.toString())

    player.onstop = () => {
      if (this.#pad.sampleIds.length === 1 && this.#pad.type !== 'loop') {
        this.isPlaying = false
      }

      player.fadeIn = 0
      player.disconnect().unsync()
    }

    this.#crossfader.fade.value = 0
    player.fadeIn = this.#pad.fadeInSeconds
    player.disconnect().connect(this.#crossfader.a).sync().start()

    this.startedAt = player.now()
    this.isPlaying = true
    this.lastPlayedSampleId = sampleId
    this.duration = player.buffer.duration

    if (this.#pad.sampleIds.length > 1 || this.#pad.type === 'loop') {
      getTransport().schedule(this.#crossfadeToNextSample, `+${Math.max(0, player.buffer.duration - this.#pad.crossfade)}`)
    } else {
      player.fadeOut = this.#pad.fadeOutSeconds
    }
  }
  
  stop() {
    if (!this.lastPlayedSampleId) {
      return
    }
    
    const player = this.#players.player(this.lastPlayedSampleId.toString())
    
    player.onstop = () => {
      this.isPlaying = false
      this.isStopping = false
      this.lastPlayedSampleId = undefined
    }

    this.isStopping = true
    this.#players.stopAll()
  }

  get currentPlayer() {
    if (this.lastPlayedSampleId) {
      return this.#players.player(this.lastPlayedSampleId.toString())
    }
  }

  #crossfadeToNextSample(time: number) {
    if (!this.isPlaying) {
      return
    }

    const nextSampleId = this.#getNextSampleId()
    const fade = this.#crossfader.fade.value
    const nextPlayer = this.#players.player(nextSampleId.toString())

    nextPlayer.fadeIn = 0
    nextPlayer.onstop = () => {
      if (this.#pad.sampleIds.length === 1 && this.#pad.type !== 'loop') {
        this.isPlaying = false
      }

      nextPlayer.fadeIn = 0
      nextPlayer.disconnect().unsync()
    }

    getTransport().schedule(this.#crossfadeToNextSample, `+${Math.max(0, nextPlayer.buffer.duration - this.#pad.crossfade)}`)

    nextPlayer.disconnect().connect(fade < 0.5 ? this.#crossfader.b : this.#crossfader.a).sync().start(time)

    this.#crossfader.fade.rampTo(fade < 0.5 ? 1 : 0, Math.min(this.#pad.crossfade, nextPlayer.buffer.duration), time)

    this.lastPlayedSampleId = nextSampleId

    getTransport().schedule(t => {
      this.startedAt = t
      this.duration = Math.max(0, nextPlayer.buffer.duration - this.#pad.crossfade)
    }, `+${this.#pad.crossfade}`)
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