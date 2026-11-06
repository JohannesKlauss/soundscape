'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState, getScene, getMood, selectScene, selectMood, selectLayer,
  addSound, updateLayer, removeLayer, restoreLayer, createMood, duplicateMood,
  renameMood, saveMood, isDirty, importSound, searchLibrary,
  serializeState, restoreState,
} = require('../mood-state.js');

test('createState seeds Tavern Evening as active with 5 layers and hearth selected', () => {
  const s = createState();
  const scene = getScene(s);
  const mood = getMood(s);
  assert.equal(scene.id, 'tavern');
  assert.equal(mood.id, 'evening');
  assert.equal(mood.layers.length, 5);
  const hearth = mood.layers.find(l => l.soundId === 'hearth');
  assert.equal(s.selectedLayerId, hearth.id);
  assert.equal(hearth.volume, 48);
  assert.equal(hearth.fadeIn, 2);
  assert.equal(hearth.fadeOut, 4);
  const crowd = mood.layers.find(l => l.soundId === 'crowd');
  assert.equal(crowd.volume, 72);
  assert.ok(s.library.length >= 12);
});

test('fresh seed sounds expose useful searchable tags', () => {
  const s = createState();
  assert.deepEqual(s.library.find(sound => sound.id === 'crowd').tags, ['background ambience', 'crowd']);
  assert.deepEqual(s.library.find(sound => sound.id === 'tension').tags, ['music', 'tension']);
  assert.ok(searchLibrary(s, 'weather', 'all').some(sound => sound.id === 'thunder'));
});

test('restoring snapshots preserves custom and absent sound tags', () => {
  const s = createState();
  s.library.find(sound => sound.id === 'crowd').tags = ['custom'];
  delete s.library.find(sound => sound.id === 'tension').tags;
  const restored = restoreState(serializeState(s));
  assert.deepEqual(restored.library.find(sound => sound.id === 'crowd').tags, ['custom']);
  assert.equal(Object.hasOwn(restored.library.find(sound => sound.id === 'tension'), 'tags'), false);
});

test('other scene names and sound display names match live prototype content', () => {
  const s = createState();
  assert.equal(s.scenes.find(sc => sc.id === 'docks').name, 'Saltmarsh Docks');
  assert.equal(s.scenes.find(sc => sc.id === 'marsh').name, 'The Hollow Marsh');
  assert.equal(s.scenes.find(sc => sc.id === 'cave').name, "Smuggler's Cave");
  assert.equal(s.library.find(x => x.id === 'crowd').name, 'Tavern crowd');
  assert.equal(s.library.find(x => x.id === 'hearth').name, 'Crackling hearth');
  assert.equal(s.library.find(x => x.id === 'lute').name, 'A wandering lute');
  assert.equal(s.library.find(x => x.id === 'rain').name, 'Rain at the windows');
  assert.equal(s.library.find(x => x.id === 'glasses').name, 'Clinking glasses');
});

test('seeded moods start clean (baselines pre-populated); created/duplicated moods stay dirty', () => {
  const s = createState();
  assert.equal(isDirty(s, 'evening'), false);
  assert.equal(isDirty(s, 'rain-mood'), false);
  assert.equal(isDirty(s, 'last-call'), false);
  const created = createMood(s, 'New Mood');
  assert.equal(isDirty(s, created.id), true);
  selectMood(s, 'evening');
  const dup = duplicateMood(s);
  assert.equal(isDirty(s, dup.id), true);
});

test('selectScene picks first mood and valid selected layer; selectMood only within active scene', () => {
  const s = createState();
  selectScene(s, 'docks');
  assert.equal(s.activeSceneId, 'docks');
  const scene = getScene(s);
  assert.equal(s.activeMoodId, scene.moods[0].id);
  const mood = getMood(s);
  assert.equal(s.selectedLayerId, mood.layers[0] ? mood.layers[0].id : null);
  assert.throws(() => selectMood(s, 'rain-mood'), /not found|scene/i);
});

test('draft edits survive scene/mood switches without prompts', () => {
  const s = createState();
  const mood = getMood(s);
  const layer = mood.layers[0];
  updateLayer(s, layer.id, { volume: 91 });
  selectScene(s, 'docks');
  selectScene(s, 'tavern');
  selectMood(s, 'evening');
  const after = getMood(s).layers.find(l => l.id === layer.id);
  assert.equal(after.volume, 91);
});

test('createMood adds empty mood, selects it, and it is dirty until saved', () => {
  const s = createState();
  const mood = createMood(s, 'Brawl Breaks Out');
  assert.equal(mood.layers.length, 0);
  assert.equal(s.activeMoodId, mood.id);
  assert.equal(isDirty(s, mood.id), true);
  saveMood(s);
  assert.equal(isDirty(s, mood.id), false);
});

test('duplicateMood deep clones with new mood/layer ids, name suffix, selected, dirty', () => {
  const s = createState();
  const original = getMood(s);
  const dup = duplicateMood(s);
  assert.notEqual(dup.id, original.id);
  assert.equal(dup.name, `${original.name} copy`);
  assert.equal(dup.layers.length, original.layers.length);
  dup.layers.forEach((l, i) => assert.notEqual(l.id, original.layers[i].id));
  assert.equal(s.activeMoodId, dup.id);
  assert.equal(isDirty(s, dup.id), true);
  // original untouched
  updateLayer(s, dup.layers[0].id, { volume: 5 });
  assert.notEqual(getScene(s).moods.find(m => m.id === original.id).layers[0].volume, 5);
});

test('addSound dedupes existing soundId in mood, otherwise adds with volume 60 and selects it', () => {
  const s = createState();
  const mood = getMood(s);
  const existing = addSound(s, 'hearth');
  assert.equal(existing.id, mood.layers.find(l => l.soundId === 'hearth').id);
  assert.equal(s.selectedLayerId, existing.id);
  const added = addSound(s, 'thunder');
  assert.equal(added.soundId, 'thunder');
  assert.equal(added.volume, 60);
  assert.equal(s.selectedLayerId, added.id);
});

test('addSound rejects unknown soundId without mutating the mood', () => {
  const s = createState();
  const before = getMood(s).layers.length;
  assert.throws(() => addSound(s, 'nonexistent-sound'), /unknown|not found/i);
  assert.equal(getMood(s).layers.length, before);
});

test('updateLayer clamps numeric fields and ignores non-finite values', () => {
  const s = createState();
  const layer = getMood(s).layers[0];
  updateLayer(s, layer.id, { volume: 500, pan: -500, fadeIn: 99, fadeOut: -10 });
  const l1 = getMood(s).layers.find(l => l.id === layer.id);
  assert.equal(l1.volume, 100);
  assert.equal(l1.pan, -100);
  assert.equal(l1.fadeIn, 30);
  assert.equal(l1.fadeOut, 0);
  const before = { ...l1 };
  updateLayer(s, layer.id, { volume: NaN, pan: Infinity });
  const l2 = getMood(s).layers.find(l => l.id === layer.id);
  assert.equal(l2.volume, before.volume);
  assert.equal(l2.pan, before.pan);
});

test('updateLayer soundId replace preserves other fields and rejects duplicate in mood', () => {
  const s = createState();
  const mood = getMood(s);
  const layer = mood.layers.find(l => l.soundId === 'glasses');
  updateLayer(s, layer.id, { volume: 77, pan: 10 });
  const replaced = updateLayer(s, layer.id, { soundId: 'thunder' });
  assert.equal(replaced.id, layer.id);
  assert.equal(replaced.soundId, 'thunder');
  assert.equal(replaced.volume, 77);
  assert.equal(replaced.pan, 10);
  const other = mood.layers.find(l => l.soundId === 'hearth');
  assert.throws(() => updateLayer(s, replaced.id, { soundId: other.soundId }), /already used|duplicate/i);
});

test('updateLayer validates the full patch before applying any mutation', () => {
  const s = createState();
  const layer = getMood(s).layers.find(l => l.soundId === 'glasses');
  const before = { ...layer };
  assert.throws(() => updateLayer(s, layer.id, { volume: 10, soundId: 'missing-sound' }), /unknown|not found/i);
  const after = getMood(s).layers.find(l => l.id === layer.id);
  assert.deepEqual(after, before);
});

test('removeLayer returns undo record; restoreLayer reinserts into original mood avoiding duplicates', () => {
  const s = createState();
  const mood = getMood(s);
  const target = mood.layers[2];
  const record = removeLayer(s, target.id);
  assert.equal(record.moodId, mood.id);
  assert.equal(record.sceneId, 'tavern');
  assert.equal(getMood(s).layers.length, 4);
  const restored = restoreLayer(s, record);
  assert.ok(restored);
  assert.equal(getMood(s).layers.length, 5);
  assert.equal(getMood(s).layers[record.index].soundId, target.soundId);
  // restoring again would duplicate soundId -> rejected
  const dup = restoreLayer(s, record);
  assert.equal(dup, null);
  assert.equal(getMood(s).layers.length, 5);
});

test('saveMood rejects blank trimmed name; renameMood allows blank draft', () => {
  const s = createState();
  renameMood(s, '   ');
  assert.equal(getMood(s).name, '');
  assert.throws(() => saveMood(s), /blank|name/i);
  renameMood(s, '  Tavern Evening  ');
  const saved = saveMood(s);
  assert.equal(saved.name, 'Tavern Evening');
  assert.equal(isDirty(s), false);
});

test('importSound creates metadata-only library record; searchLibrary filters by text and category', () => {
  const s = createState();
  const sound = importSound(s, { name: ' Distant Owl ', category: 'Ambience', sourceType: 'freesound', source: 'https://example.com/owl', art: 'harbor', loop: true });
  assert.equal(sound.name, 'Distant Owl');
  assert.equal(sound.category, 'ambience');
  const found = searchLibrary(s, 'owl', 'all');
  assert.ok(found.some(x => x.id === sound.id));
  const onlyAmbience = searchLibrary(s, '', 'ambience');
  assert.ok(onlyAmbience.every(x => x.category === 'ambience'));
  const noMatch = searchLibrary(s, 'zzz-nope', 'all');
  assert.equal(noMatch.length, 0);
});

test('serializeState/restoreState round-trips and falls back to createState on corrupt data', () => {
  const s = createState();
  updateLayer(s, getMood(s).layers[0].id, { volume: 33 });
  const json = serializeState(s);
  const restored = restoreState(json);
  assert.equal(getMood(restored).layers[0].volume, 33);

  const fallback1 = restoreState('not json {{{');
  assert.equal(fallback1.activeSceneId, 'tavern');

  const fallback2 = restoreState(JSON.stringify({ version: 1, scenes: [], activeSceneId: 'ghost' }));
  assert.equal(fallback2.activeSceneId, 'tavern');
});

test('restoreState falls back to a fresh seed on malformed nested structures instead of throwing', () => {
  const missingMoods = restoreState(JSON.stringify({
    version: 1, nextId: 100, baselines: {}, library: [],
    scenes: [{ id: 'tavern' }], activeSceneId: 'tavern',
  }));
  assert.equal(missingMoods.activeSceneId, 'tavern');
  assert.equal(getMood(missingMoods).id, 'evening');

  const s = createState();
  const danglingLayerSound = JSON.parse(serializeState(s));
  danglingLayerSound.scenes[0].moods[0].layers[0].soundId = 'ghost-sound';
  const fallback3 = restoreState(JSON.stringify(danglingLayerSound));
  assert.equal(getMood(fallback3).layers[0].soundId, 'crowd');

  const duplicateIds = JSON.parse(serializeState(s));
  duplicateIds.scenes[0].moods[0].id = duplicateIds.scenes[0].moods[1].id;
  const fallback4 = restoreState(JSON.stringify(duplicateIds));
  assert.equal(fallback4.activeMoodId, 'evening');

  const badNextId = restoreState(JSON.stringify({
    version: 1, nextId: 'abc', baselines: {}, library: [],
    scenes: [{ id: 'tavern', name: 'x', moods: [] }], activeSceneId: 'tavern',
  }));
  assert.equal(badNextId.activeSceneId, 'tavern');
  assert.equal(typeof badNextId.nextId, 'number');
});
