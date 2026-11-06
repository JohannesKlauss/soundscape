// Library operations on the same version-1 snapshot used by MoodState.
// Browser consumers must load mood-state.js first; Node uses the same module.
(function (root) {
  'use strict';

  var MoodState = typeof module !== 'undefined' && module.exports
    ? require('./mood-state.js') : root.MoodState;
  if (!MoodState) throw new Error('MoodState is required');

  function normalizedTags(tags) {
    if (tags == null) return [];
    if (!Array.isArray(tags) || tags.some(function (tag) { return typeof tag !== 'string'; })) {
      throw new Error('Tags must be an array of strings');
    }
    var seen = new Set();
    return tags.map(function (tag) { return tag.trim(); }).filter(function (tag) {
      var key = tag.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getSound(state, id) {
    var sound = state.library.find(function (s) { return s.id === id; });
    if (!sound) throw new Error('Sound not found: ' + id);
    return sound;
  }

  function searchLibrary(state, query, category) {
    var q = String(query == null ? '' : query).trim().toLowerCase();
    var cat = String(category == null ? 'all' : category).toLowerCase();
    return state.library.filter(function (s) {
      return (cat === 'all' || !cat || s.category === cat) &&
        (!q || [s.name, s.source, s.sourceType].concat(Array.isArray(s.tags) ? s.tags : []).some(function (value) {
          return typeof value === 'string' && value.toLowerCase().indexOf(q) !== -1;
        }));
    });
  }

  function renameSound(state, id, name) {
    var sound = getSound(state, id);
    name = String(name == null ? '' : name).trim();
    if (!name) throw new Error('Sound name cannot be blank');
    sound.name = name;
    return sound;
  }

  function changeTags(state, ids, tags, remove) {
    if (!Array.isArray(ids)) throw new Error('Sound IDs must be an array');
    var sounds = Array.from(new Set(ids)).map(function (id) { return getSound(state, id); });
    var cleaned = normalizedTags(tags);
    var keys = new Set(cleaned.map(function (tag) { return tag.toLowerCase(); }));
    var updatedTags = sounds.map(function (sound) {
      var existing = normalizedTags(sound.tags);
      return remove ? existing.filter(function (tag) { return !keys.has(tag.toLowerCase()); })
        : normalizedTags(existing.concat(cleaned));
    });
    sounds.forEach(function (sound, index) { sound.tags = updatedTags[index]; });
    return sounds;
  }

  function addTags(state, ids, tags) { return changeTags(state, ids, tags, false); }
  function removeTags(state, ids, tags) { return changeTags(state, ids, tags, true); }

  function deleteSound(state, id) {
    var sound = getSound(state, id);
    function references(layer) {
      return layer.soundId === id || (layer.additionalSoundIds || []).indexOf(id) !== -1;
    }
    var inScenes = state.scenes.some(function (scene) {
      return scene.moods.some(function (mood) { return mood.layers.some(references); });
    });
    var inBaselines = Object.keys(state.baselines).some(function (key) {
      return state.baselines[key].layers.some(references);
    });
    if (inScenes || inBaselines) throw new Error('Sound is referenced by a mood');
    state.library.splice(state.library.indexOf(sound), 1);
    return sound;
  }

  function importSound(state, metadata) {
    metadata = metadata || {};
    var name = String(metadata.name == null ? '' : metadata.name).trim();
    if (!name) throw new Error('Sound name cannot be blank');
    if (metadata.sourceType != null && typeof metadata.sourceType !== 'string') throw new Error('Source type must be a string');
    var tags = normalizedTags(metadata.tags);
    var sound = MoodState.importSound(state, {
      name: name, category: metadata.category, sourceType: metadata.sourceType,
      source: metadata.source, loop: metadata.loop, art: metadata.art,
    });
    if (metadata.tags != null) sound.tags = tags;
    return sound;
  }

  function searchFreesound(results, query) {
    var q = String(query == null ? '' : query).trim().toLowerCase();
    return results.filter(function (result) {
      return !q || [result.name].concat(Array.isArray(result.tags) ? result.tags : []).some(function (value) {
        return typeof value === 'string' && value.toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  function importFreesound(state, result, options) {
    result = result || {};
    options = options || {};
    var id = result.id == null ? '' : String(result.id).trim();
    if (!id) throw new Error('Freesound ID is required');
    var existing = state.library.find(function (sound) {
      return sound.sourceType === 'freesound' && sound.sourceId === id;
    });
    if (existing) return existing;
    var sound = importSound(state, {
      name: result.name, category: options.category, sourceType: 'freesound',
      source: result.source, loop: options.loop, art: options.art, tags: result.tags,
    });
    sound.sourceId = id;
    return sound;
  }

  var LibraryState = {
    createState: MoodState.createState,
    serializeState: MoodState.serializeState,
    restoreState: MoodState.restoreState,
    searchLibrary: searchLibrary,
    renameSound: renameSound,
    deleteSound: deleteSound,
    addTags: addTags,
    removeTags: removeTags,
    importSound: importSound,
    searchFreesound: searchFreesound,
    importFreesound: importFreesound,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LibraryState;
  root.LibraryState = LibraryState;
})(typeof globalThis !== 'undefined' ? globalThis : this);
