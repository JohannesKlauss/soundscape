'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Mood = require('../mood-state.js');

function stack() {
  const state = Mood.createState();
  Mood.addLayerSound(state, 'evening-hearth', 'wind');
  Mood.addLayerSound(state, 'evening-hearth', 'drone');
  Mood.updateLayer(state, 'evening-hearth', {rotation: 'random'});
  return state;
}

test('random playback chooses a random starting sound, not always the first file', () => {
  const state = stack();
  const before = Mood.serializeState(state);
  const cursor = Mood.advanceLayerSound(state, 'evening-hearth', null, () => 0.99);
  assert.equal(cursor.soundId, 'drone');
  assert.deepEqual(cursor.playedSoundIds, ['drone']);
  assert.equal(Mood.serializeState(state), before);
});

test('editing an inactive mood stack preserves the current mood selection', () => {
  const state = Mood.createState();
  const selected = state.selectedLayerId;
  Mood.addLayerSound(state, 'fog-waves', 'wind');
  assert.equal(state.activeMoodId, 'evening');
  assert.equal(state.selectedLayerId, selected);
  Mood.addLayerSound(state, 'fog-waves', 'wind');
  assert.equal(state.selectedLayerId, selected);
  assert.deepEqual(Mood.restoreState(Mood.serializeState(state)), state);
});

test('a random cursor with missing history still cannot immediately repeat its current sound', () => {
  const state = stack();
  const cursor = {soundId: 'hearth'};
  const before = JSON.stringify(cursor);
  const next = Mood.advanceLayerSound(state, 'evening-hearth', cursor, () => 0);
  assert.equal(next.soundId, 'wind');
  assert.deepEqual(next.playedSoundIds, ['hearth', 'wind']);
  assert.equal(JSON.stringify(cursor), before);
});
