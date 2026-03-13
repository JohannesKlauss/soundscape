import { Dexie, type EntityTable } from 'dexie'
import type { SoundSample } from '$lib/domain/library/_types'
import type { SoundPad } from '$lib/domain/soundPad/_types'
import type { SoundSet, SoundSetHasPad } from '$lib/domain/soundSet/_types'
import type { Mood } from '$lib/domain/soundSet/mood/_types'

const db = new Dexie('soundscape') as Dexie & {
  set: EntityTable<SoundSet, 'id'>
  sample: EntityTable<SoundSample, 'id'>
  pad: EntityTable<SoundPad, 'id'>
  setHasPads: EntityTable<SoundSetHasPad, 'setId' | 'padId'>
  mood: EntityTable<Mood, 'id'>
}

db.version(1).stores({
  set: '++id',
  sample: '++id',
  pad: '++id',
  setHasPads: '[setId+padId],setId,padId',
  mood: '++id',
})

db.version(2).stores({
  set: '++id',
  sample: '++id, *tags',
  pad: '++id',
  setHasPads: '[setId+padId],setId,padId',
  mood: '++id',
})

db.version(3)
  .stores({
    set: '++id, order',
    sample: '++id, *tags',
    pad: '++id',
    setHasPads: '[setId+padId],setId,padId',
    mood: '++id',
  })
  .upgrade((tx) => {
    return tx
      .table('set')
      .toCollection()
      .modify((set, ref) => {
        if (set.order == null) {
          ref.value.order = set.id
        }
      })
  })

export { db }
