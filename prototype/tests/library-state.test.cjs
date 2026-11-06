'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const MoodState = require('../mood-state.js');
const Library = require('../library-state.js');

test('seed and snapshot use the existing mood-state format', () => {
  const state = Library.createState();
  assert.deepEqual(state, MoodState.createState());
  const imported = MoodState.importSound(state, { name: 'Owl', category: 'ambience', source: 'owl.wav' });
  const restored = Library.restoreState(MoodState.serializeState(state));
  assert.equal(restored.library.find(s => s.id === imported.id).name, 'Owl');
  assert.deepEqual(MoodState.restoreState(Library.serializeState(restored)), restored);
  assert.deepEqual(Library.restoreState('broken'), MoodState.createState());
});

test('search is case-insensitive across names, source and tags, with category filter', () => {
  const state = Library.createState();
  Library.addTags(state, ['hearth'], [' Cozy ', 'FIRE']);
  assert.deepEqual(Library.searchLibrary(state, 'coz', 'AMBIENCE').map(s => s.id), ['hearth']);
  assert.deepEqual(Library.searchLibrary(state, 'FIRE', 'effects'), []);
  assert.deepEqual(Library.searchLibrary(state, 'HEARTH.MP3').map(s => s.id), ['hearth']);
  assert.equal(Library.searchLibrary(state, '').length, state.library.length);
});

test('editor search finds library tags case-insensitively and respects category', () => {
  const state = Library.createState();
  Library.addTags(state, ['hearth'], ['CoZy']);
  assert.deepEqual(MoodState.searchLibrary(state, 'cOZ', 'ambience').map(s => s.id), ['hearth']);
  assert.deepEqual(MoodState.searchLibrary(state, 'COZY', 'effects'), []);
});

test('editor search tolerates legacy snapshots with invalid tag metadata', () => {
  const state = Library.createState();
  state.library.find(s => s.id === 'hearth').tags = ['Cozy', 42];
  state.library.find(s => s.id === 'rain').tags = 'invalid';
  const restored = Library.restoreState(Library.serializeState(state));
  assert.deepEqual(MoodState.searchLibrary(restored, 'missing'), []);
  assert.deepEqual(MoodState.searchLibrary(restored, 'cozy').map(s => s.id), ['hearth']);
});

test('tags are trimmed and deduplicated case-insensitively; batches validate before mutation', () => {
  const state = Library.createState();
  Library.addTags(state, ['hearth', 'rain', 'rain'], [' Rain ', 'rain', 'Night']);
  Library.addTags(state, ['hearth'], ['NIGHT', 'Warm']);
  assert.deepEqual(state.library.find(s => s.id === 'hearth').tags, ['Rain', 'Night', 'Warm']);
  assert.deepEqual(state.library.find(s => s.id === 'rain').tags, ['Rain', 'Night']);
  assert.throws(() => Library.addTags(state, ['rain', 'missing'], ['new']), /not found/i);
  assert.deepEqual(state.library.find(s => s.id === 'rain').tags, ['Rain', 'Night']);
  Library.removeTags(state, ['hearth', 'rain'], ['rAiN']);
  assert.deepEqual(state.library.find(s => s.id === 'hearth').tags, ['Night', 'Warm']);
  assert.deepEqual(state.library.find(s => s.id === 'rain').tags, ['Night']);
});

test('batch tag changes leave every sound untouched when legacy tags are invalid', async t => {
  for (const [operation, tags] of [['addTags', ['New']], ['removeTags', ['Existing']]]) {
    for (const invalidTags of ['invalid', ['Legacy', 42]]) {
      await t.test(`${operation} with ${JSON.stringify(invalidTags)}`, () => {
        const state = Library.createState();
        state.library.find(s => s.id === 'hearth').tags = ['Existing'];
        state.library.find(s => s.id === 'rain').tags = invalidTags;
        const restored = Library.restoreState(Library.serializeState(state));
        const before = Library.serializeState(restored);
        const originalTags = restored.library.find(s => s.id === 'hearth').tags;

        assert.throws(() => Library[operation](restored, ['hearth', 'rain'], tags), /array of strings/i);
        assert.equal(Library.serializeState(restored), before);
        assert.equal(restored.library.find(s => s.id === 'hearth').tags, originalTags);
      });
    }
  }
});

test('rename validates names and leaves identifiers intact', () => {
  const state = Library.createState();
  assert.equal(Library.renameSound(state, 'hearth', '  Warm fire  ').name, 'Warm fire');
  assert.throws(() => Library.renameSound(state, 'hearth', '  '), /blank/i);
  assert.throws(() => Library.renameSound(state, 'missing', 'name'), /not found/i);
  assert.equal(state.library.find(s => s.id === 'hearth').name, 'Warm fire');
});

test('delete rejects sounds referenced by current layers or saved baselines', () => {
  const state = Library.createState();
  assert.throws(() => Library.deleteSound(state, 'hearth'), /referenced/i);
  const removed = MoodState.removeLayer(state, 'evening-hearth');
  assert.throws(() => Library.deleteSound(state, 'hearth'), /referenced/i);
  MoodState.restoreLayer(state, removed);
  const stacked = Library.importSound(state, { name: 'Stacked', category: 'effects' });
  MoodState.addLayerSound(state, 'evening-hearth', stacked.id);
  assert.throws(() => Library.deleteSound(state, stacked.id), /referenced/i);
  MoodState.removeLayerSound(state, 'evening-hearth', stacked.id);
  const sound = Library.importSound(state, { name: 'Unused', category: 'effects' });
  assert.equal(Library.deleteSound(state, sound.id).id, sound.id);
  assert.throws(() => Library.deleteSound(state, sound.id), /not found/i);
  assert.deepEqual(MoodState.restoreState(Library.serializeState(state)), state);
});

for (const missing of ['primary', 'additional']) {
  test(`undo rejects a deleted ${missing} sound without corrupting the snapshot`, () => {
    const state = Library.createState();
    const primary = Library.importSound(state, { name: 'Primary', category: 'effects' });
    const additional = Library.importSound(state, { name: 'Additional', category: 'effects' });
    const layer = MoodState.addSound(state, primary.id);
    MoodState.addLayerSound(state, layer.id, additional.id);
    const record = MoodState.removeLayer(state, layer.id);
    Library.deleteSound(state, missing === 'primary' ? primary.id : additional.id);
    const before = Library.serializeState(state);
    assert.equal(MoodState.restoreLayer(state, record), null);
    assert.equal(Library.serializeState(state), before);
    assert.deepEqual(Library.restoreState(before), state);
  });
}

test('a saved baseline alone prevents deleting a sound', () => {
  const state = Library.createState();
  const sound = Library.importSound(state, { name: 'Temporary', category: 'effects' });
  const layer = MoodState.addSound(state, sound.id);
  MoodState.saveMood(state);
  MoodState.removeLayer(state, layer.id);
  assert.throws(() => Library.deleteSound(state, sound.id), /referenced/i);
  MoodState.saveMood(state);
  assert.equal(Library.deleteSound(state, sound.id).id, sound.id);
});

test('simulated imports retain only supported metadata and reject invalid data', () => {
  const state = Library.createState();
  const sound = Library.importSound(state, { name: ' Owl ', category: 'Ambience', sourceType: 'file', source: 'owl.wav', loop: true, art: 'harbor', tags: ['Night', 'night'], secret: 'do not persist' });
  assert.deepEqual(sound, { id: 'item-100', name: 'Owl', category: 'ambience', loop: true, art: 'harbor', sourceType: 'file', source: 'owl.wav', tags: ['Night'] });
  assert.throws(() => Library.importSound(state, { name: ' ', category: 'music' }), /blank/i);
  assert.throws(() => Library.importSound(state, { name: 'x', category: 'invalid' }), /category/i);
  assert.equal(state.nextId, 101);
  assert.deepEqual(MoodState.restoreState(Library.serializeState(state)), state);
});

test('import rejects non-string source types without mutating state', () => {
  const state = Library.createState();
  const before = Library.serializeState(state);
  for (const sourceType of [42, 0, true, {}, []]) {
    assert.throws(() => Library.importSound(state, { name: 'Owl', category: 'ambience', sourceType }), /source.?type/i);
    assert.equal(Library.serializeState(state), before);
  }
  assert.deepEqual(Library.restoreState(before), state);
});

test('Freesound search uses separate supplied results and imports by stable source identity', () => {
  const state = Library.createState();
  const results = [
    { id: 42, name: 'Owl call', tags: ['Forest'], source: 'owl-page' },
    { id: 43, name: 'Wind', tags: ['Owl habitat'], source: 'wind-page' },
  ];
  assert.deepEqual(Library.searchFreesound(results, 'OWL').map(s => s.id), [42, 43]);
  assert.equal(state.library.length, 12);
  const first = Library.importFreesound(state, results[0], { category: 'effects' });
  assert.equal(first.sourceType, 'freesound');
  assert.equal(first.sourceId, '42');
  assert.deepEqual(first.tags, ['Forest']);
  assert.equal(Library.importFreesound(state, { ...results[0], id: '42', name: 'Renamed' }, { category: 'music' }).id, first.id);
  assert.equal(state.library.length, 13);
  const restored = Library.restoreState(Library.serializeState(state));
  assert.equal(Library.importFreesound(restored, results[0], { category: 'effects' }).id, first.id);
  assert.throws(() => Library.importFreesound(state, { name: 'No ID' }, { category: 'effects' }), /id/i);
});
