'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState, getScene, getMood, addSound, updateLayer, removeLayer, restoreLayer,
  duplicateMood, saveMood, isDirty, serializeState, restoreState,
  getLayerSounds, addLayerSound, removeLayerSound, moveLayerSound, advanceLayerSound,
} = require('../mood-state.js');

function rngSeq(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test('legacy single-source layer stays clean through a roundtrip (no stack fields added)', () => {
  const s = createState();
  const l = getMood(s).layers[0];
  const keysBefore = Object.keys(l).sort();
  const restored = restoreState(serializeState(s));
  const after = getMood(restored).layers.find(x => x.id === l.id);
  assert.deepEqual(Object.keys(after).sort(), keysBefore);
  assert.equal('additionalSoundIds' in after, false);
  assert.equal('rotation' in after, false);
  assert.equal('crossfade' in after, false);
  assert.equal('name' in after, false);
  assert.equal('coverArt' in after, false);
});

test('getLayerSounds returns ordered sound objects for single-source layer and throws for unknown layer', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  const sounds = getLayerSounds(s, l.id);
  assert.equal(sounds.length, 1);
  assert.equal(sounds[0].id, 'crowd');
  assert.throws(() => getLayerSounds(s, 'nope'), /not found/i);
});

test('addLayerSound builds a stack: canonical order, alias snapshot, coverArt snapshot, dedupe no-op', () => {
  const s = createState();
  const mood = getMood(s);
  const l = mood.layers.find(x => x.soundId === 'crowd');
  const art = s.library.find(x => x.id === 'crowd').art;
  assert.equal(l.name, undefined);
  const updated = addLayerSound(s, l.id, 'wind');
  assert.equal(updated.id, l.id);
  assert.equal(updated.soundId, 'crowd');
  assert.deepEqual(updated.additionalSoundIds, ['wind']);
  assert.equal(updated.name, 'Tavern crowd');
  assert.equal(updated.coverArt, art);
  assert.equal(s.selectedLayerId, l.id);
  const sounds = getLayerSounds(s, l.id).map(x => x.id);
  assert.deepEqual(sounds, ['crowd', 'wind']);

  // dedupe within same stack: no-op, no duplicate entry
  const dup = addLayerSound(s, l.id, 'wind');
  assert.deepEqual(dup.additionalSoundIds, ['wind']);

  // custom name/coverArt preserved when already set
  updateLayer(s, l.id, { name: 'Custom Tile' });
  addLayerSound(s, l.id, 'drone');
  assert.equal(getMood(s).layers.find(x => x.id === l.id).name, 'Custom Tile');
});

test('addLayerSound rejects a sound owned by another tile in the mood, without mutating', () => {
  const s = createState();
  const mood = getMood(s);
  const a = mood.layers.find(x => x.soundId === 'crowd');
  const b = mood.layers.find(x => x.soundId === 'hearth');
  addLayerSound(s, b.id, 'wind'); // lute now owned by b's stack
  const before = JSON.stringify(getMood(s));
  assert.throws(() => addLayerSound(s, a.id, 'wind'), /already used/i);
  assert.equal(JSON.stringify(getMood(s)), before);
});

test('addLayerSound validates the sound id and throws for unknown sources', () => {
  const s = createState();
  const l = getMood(s).layers[0];
  assert.throws(() => addLayerSound(s, l.id, 'ghost'), /unknown/i);
});

test('removeLayerSound: rejects unknown source and last remaining source without mutation; promotes next on removing first', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  assert.throws(() => removeLayerSound(s, l.id, 'thunder'), /unknown/i);
  assert.throws(() => removeLayerSound(s, l.id, 'crowd'), /last remaining/i);

  addLayerSound(s, l.id, 'wind');
  addLayerSound(s, l.id, 'drone');
  const removed = removeLayerSound(s, l.id, 'crowd');
  assert.equal(removed.id, l.id);
  assert.equal(removed.soundId, 'wind');
  assert.deepEqual(removed.additionalSoundIds, ['drone']);
  assert.equal(removed.name, 'Tavern crowd'); // alias retained

  const toSingleton = removeLayerSound(s, l.id, 'drone');
  assert.equal(toSingleton.soundId, 'wind');
  assert.deepEqual(toSingleton.additionalSoundIds, []);
});

test('moveLayerSound reorders and rewrites first+additional atomically; invalid input fails without mutation', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  addLayerSound(s, l.id, 'drone');
  // canonical: crowd, wind, drone -> move rain to front
  const moved = moveLayerSound(s, l.id, 'drone', 0);
  assert.equal(moved.soundId, 'drone');
  assert.deepEqual(moved.additionalSoundIds, ['crowd', 'wind']);

  const before = JSON.stringify(getMood(s));
  assert.throws(() => moveLayerSound(s, l.id, 'drone', -1), /invalid/i);
  assert.throws(() => moveLayerSound(s, l.id, 'drone', 3), /invalid/i);
  assert.throws(() => moveLayerSound(s, l.id, 'drone', 1.5), /invalid/i);
  assert.throws(() => moveLayerSound(s, l.id, 'ghost', 0), /unknown/i);
  assert.equal(JSON.stringify(getMood(s)), before);
});

test('advanceLayerSound: single-source obeys loop (repeat if loop true, stop if loop false)', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'glasses'); // loop:false
  const start = advanceLayerSound(s, l.id, null, rngSeq([0]));
  assert.deepEqual(start, { soundId: 'glasses', playedSoundIds: ['glasses'] });
  const end = advanceLayerSound(s, l.id, start, rngSeq([0]));
  assert.equal(end, null);

  updateLayer(s, l.id, { loop: true });
  const repeat = advanceLayerSound(s, l.id, start, rngSeq([0]));
  assert.deepEqual(repeat, { soundId: 'glasses', playedSoundIds: ['glasses'] });
});

test('advanceLayerSound: round-robin follows visible order both ways and wraps only if loop', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  addLayerSound(s, l.id, 'drone'); // crowd, wind, drone ; loop default true
  let cursor = advanceLayerSound(s, l.id, null, rngSeq([0]));
  assert.equal(cursor.soundId, 'crowd');
  cursor = advanceLayerSound(s, l.id, cursor, rngSeq([0]));
  assert.equal(cursor.soundId, 'wind');
  cursor = advanceLayerSound(s, l.id, cursor, rngSeq([0]));
  assert.equal(cursor.soundId, 'drone');
  cursor = advanceLayerSound(s, l.id, cursor, rngSeq([0])); // wraps, loop true
  assert.equal(cursor.soundId, 'crowd');

  updateLayer(s, l.id, { loop: false });
  cursor = { soundId: 'drone', playedSoundIds: ['crowd', 'wind', 'drone'] };
  const stopped = advanceLayerSound(s, l.id, cursor, rngSeq([0]));
  assert.equal(stopped, null);
});

test('advanceLayerSound: random is a shuffle bag (all sources once per cycle), avoids immediate repeat at boundary', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  addLayerSound(s, l.id, 'drone'); // crowd, wind, drone
  updateLayer(s, l.id, { rotation: 'random' });

  let cursor = advanceLayerSound(s, l.id, null, rngSeq([0]));
  assert.equal(cursor.soundId, 'crowd'); // missing cursor always starts at first source

  // remaining = [lute, rain]; rng picks index 1 -> rain
  cursor = advanceLayerSound(s, l.id, cursor, rngSeq([0.9]));
  assert.equal(cursor.soundId, 'drone');
  assert.deepEqual(cursor.playedSoundIds.sort(), ['crowd', 'drone']);

  // remaining = [wind]; only choice
  cursor = advanceLayerSound(s, l.id, cursor, rngSeq([0.9]));
  assert.equal(cursor.soundId, 'wind');
  assert.deepEqual(cursor.playedSoundIds.sort(), ['crowd', 'drone', 'wind']);

  // bag empty -> new cycle, must avoid repeating 'wind' (last played)
  const choices = ['crowd', 'drone'];
  for (let i = 0; i < 10; i++) {
    const next = advanceLayerSound(s, l.id, cursor, rngSeq([i / 10]));
    assert.ok(choices.includes(next.soundId), next.soundId);
    assert.deepEqual(next.playedSoundIds, [next.soundId]);
  }

  // loop off: bag-empty cycle boundary stops instead of restarting
  updateLayer(s, l.id, { loop: false });
  const stopped = advanceLayerSound(s, l.id, cursor, rngSeq([0]));
  assert.equal(stopped, null);
});

test('advanceLayerSound resets safely for a stale/deleted cursor', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  const stale = { soundId: 'ghost-deleted', playedSoundIds: ['ghost-deleted'] };
  const reset = advanceLayerSound(s, l.id, stale, rngSeq([0]));
  assert.deepEqual(reset, { soundId: 'crowd', playedSoundIds: ['crowd'] });
});

test('updateLayer: rotation enum validated before any mutation; crossfade clamps 0..30 and ignores non-finite', () => {
  const s = createState();
  const l = getMood(s).layers[0];
  const before = { ...l };
  assert.throws(() => updateLayer(s, l.id, { volume: 10, rotation: 'shuffle' }), /invalid|rotation/i);
  const after = getMood(s).layers.find(x => x.id === l.id);
  assert.deepEqual(after, before);

  updateLayer(s, l.id, { crossfade: 99 });
  assert.equal(getMood(s).layers.find(x => x.id === l.id).crossfade, 30);
  updateLayer(s, l.id, { crossfade: -5 });
  assert.equal(getMood(s).layers.find(x => x.id === l.id).crossfade, 0);
  const prevCrossfade = getMood(s).layers.find(x => x.id === l.id).crossfade;
  updateLayer(s, l.id, { crossfade: NaN });
  assert.equal(getMood(s).layers.find(x => x.id === l.id).crossfade, prevCrossfade);

  updateLayer(s, l.id, { rotation: 'round-robin' });
  assert.equal(getMood(s).layers.find(x => x.id === l.id).rotation, 'round-robin');
});

test('updateLayer: name empty string clears to fallback (no custom alias)', () => {
  const s = createState();
  const l = getMood(s).layers[0];
  updateLayer(s, l.id, { name: 'Custom' });
  assert.equal(getMood(s).layers.find(x => x.id === l.id).name, 'Custom');
  updateLayer(s, l.id, { name: '' });
  assert.equal('name' in getMood(s).layers.find(x => x.id === l.id), false);
});

test('updateLayer soundId replacement rejects a sound owned by any other stack member, and existing addSound dedupe finds stack members', () => {
  const s = createState();
  const mood = getMood(s);
  const a = mood.layers.find(x => x.soundId === 'crowd');
  const b = mood.layers.find(x => x.soundId === 'hearth');
  addLayerSound(s, a.id, 'wind'); // a: crowd, lute
  assert.throws(() => updateLayer(s, b.id, { soundId: 'wind' }), /already used/i);

  // addSound dedupe finds a sound that's a secondary member of a's stack
  const found = addSound(s, 'wind');
  assert.equal(found.id, a.id);
  assert.equal(s.selectedLayerId, a.id);
});

test('restoreLayer rejects on any source overlap (not just the primary) with an existing stack', () => {
  const s = createState();
  const mood = getMood(s);
  const target = mood.layers.find(x => x.soundId === 'rain');
  addLayerSound(s, target.id, 'wind'); // rain + wind as secondary
  const record = removeLayer(s, target.id);
  // now add 'wind' into another tile so the overlap is via the secondary source
  const other = mood.layers.find(x => x.soundId === 'hearth');
  addLayerSound(s, other.id, 'wind');
  const restored = restoreLayer(s, record);
  assert.equal(restored, null);
});

test('duplicateMood deep clones stack fields independently', () => {
  const s = createState();
  const mood = getMood(s);
  const l = mood.layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  updateLayer(s, l.id, { rotation: 'random', crossfade: 7 });
  const dup = duplicateMood(s);
  const dupLayer = dup.layers.find(x => x.additionalSoundIds && x.additionalSoundIds.includes('wind'));
  assert.deepEqual(dupLayer.additionalSoundIds, ['wind']);
  assert.equal(dupLayer.rotation, 'random');
  assert.equal(dupLayer.crossfade, 7);
  moveLayerSound(s, dupLayer.id, 'wind', 0);
  const original = getScene(s).moods.find(x => x.id === mood.id).layers.find(x => x.id === l.id);
  assert.equal(original.soundId, 'crowd'); // untouched by edit on the duplicate
});

test('isDirty/saveMood detect stack field changes; dirty/save/storage roundtrip for stack layers', () => {
  const s = createState();
  const mood = getMood(s);
  const l = mood.layers.find(x => x.soundId === 'crowd');
  saveMood(s);
  assert.equal(isDirty(s), false);
  addLayerSound(s, l.id, 'wind');
  assert.equal(isDirty(s), true);
  saveMood(s);
  assert.equal(isDirty(s), false);

  const restored = restoreState(serializeState(s));
  const restoredLayer = getMood(restored).layers.find(x => x.id === l.id);
  assert.deepEqual(restoredLayer.additionalSoundIds, ['wind']);
});

test('restoreState rejects corrupted new fields and falls back to a clean default state', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  saveMood(s);

  const badRotation = JSON.parse(serializeState(s));
  badRotation.scenes[0].moods[0].layers.find(x => x.id === l.id).rotation = 'shuffle';
  assert.equal(restoreState(JSON.stringify(badRotation)).activeMoodId, 'evening');
  assert.equal(getMood(restoreState(JSON.stringify(badRotation))).layers.length, 5);

  const badCrossfade = JSON.parse(serializeState(s));
  badCrossfade.scenes[0].moods[0].layers.find(x => x.id === l.id).crossfade = 999;
  assert.equal(getMood(restoreState(JSON.stringify(badCrossfade))).layers.length, 5);

  const dupAdditional = JSON.parse(serializeState(s));
  const target = dupAdditional.scenes[0].moods[0].layers.find(x => x.id === l.id);
  target.additionalSoundIds = ['wind', 'wind'];
  assert.equal(getMood(restoreState(JSON.stringify(dupAdditional))).layers.length, 5);

  const primaryInAdditional = JSON.parse(serializeState(s));
  const target2 = primaryInAdditional.scenes[0].moods[0].layers.find(x => x.id === l.id);
  target2.additionalSoundIds = ['crowd'];
  assert.equal(getMood(restoreState(JSON.stringify(primaryInAdditional))).layers.length, 5);

  const unknownAdditional = JSON.parse(serializeState(s));
  const target3 = unknownAdditional.scenes[0].moods[0].layers.find(x => x.id === l.id);
  target3.additionalSoundIds = ['ghost-sound'];
  assert.equal(getMood(restoreState(JSON.stringify(unknownAdditional))).layers.length, 5);

  const badCoverArt = JSON.parse(serializeState(s));
  const target4 = badCoverArt.scenes[0].moods[0].layers.find(x => x.id === l.id);
  target4.coverArt = 'desert';
  assert.equal(getMood(restoreState(JSON.stringify(badCoverArt))).layers.length, 5);
});

test('corrupted stack fields in a baseline entry also force a clean fallback', () => {
  const s = createState();
  const l = getMood(s).layers.find(x => x.soundId === 'crowd');
  addLayerSound(s, l.id, 'wind');
  saveMood(s);

  const parsed = JSON.parse(serializeState(s));
  parsed.baselines.evening.layers.find(x => x.id === l.id).rotation = 'bogus';
  const fallback = restoreState(JSON.stringify(parsed));
  assert.equal(fallback.activeMoodId, 'evening');
  assert.equal(isDirty(fallback, 'evening'), false);
});
