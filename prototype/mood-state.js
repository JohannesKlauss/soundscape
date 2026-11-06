(function (root) {
  'use strict';

  var CATEGORIES = ['ambience', 'music', 'effects'];
  var LAYER_RANGES = { volume: [0, 100], pan: [-100, 100], fadeIn: [0, 30], fadeOut: [0, 30], crossfade: [0, 30] };
  var ROTATIONS = ['round-robin', 'random'];

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function genId(state) {
    var id = 'item-' + state.nextId;
    state.nextId += 1;
    return id;
  }

  function sound(id, name, category, loop, art, source, tags) {
    var result = { id: id, name: name, category: category, loop: loop, art: art, sourceType: 'demo', source: source };
    if (tags) result.tags = tags;
    return result;
  }

  function layer(id, soundId, volume, opts) {
    opts = opts || {};
    return {
      id: id,
      soundId: soundId,
      volume: volume,
      pan: opts.pan || 0,
      fadeIn: opts.fadeIn || 0,
      fadeOut: opts.fadeOut || 0,
      loop: opts.loop !== undefined ? opts.loop : true,
      enabled: opts.enabled !== undefined ? opts.enabled : true,
    };
  }

  function mood(id, name, art, layers) {
    return { id: id, name: name, art: art, layers: layers };
  }

  function scene(id, name, moods) {
    return { id: id, name: name, moods: moods };
  }

  function createState() {
    var library = [
      sound('crowd', 'Tavern crowd', 'ambience', true, 'tavern', 'demo/crowd.mp3', ['background ambience', 'crowd']),
      sound('hearth', 'Crackling hearth', 'ambience', true, 'tavern', 'demo/hearth.mp3'),
      sound('lute', 'A wandering lute', 'music', true, 'tavern', 'demo/lute.mp3', ['music', 'tavern']),
      sound('rain', 'Rain at the windows', 'ambience', true, 'harbor', 'demo/rain.mp3'),
      sound('glasses', 'Clinking glasses', 'effects', false, 'tavern', 'demo/glasses.mp3', ['tavern', 'crowd']),
      sound('thunder', 'Rolling Thunder', 'effects', false, 'harbor', 'demo/thunder.mp3', ['weather', 'storm']),
      sound('footsteps', 'Footsteps', 'effects', false, 'tavern', 'demo/footsteps.mp3', ['movement', 'footsteps']),
      sound('waves', 'Harbor Waves', 'ambience', true, 'harbor', 'demo/waves.mp3', ['background ambience', 'water']),
      sound('wind', 'Marsh Wind', 'ambience', true, 'harbor', 'demo/wind.mp3', ['background ambience', 'weather']),
      sound('drone', 'Cave Drone', 'ambience', true, 'harbor', 'demo/drone.mp3', ['background ambience', 'tension']),
      sound('bells', 'Distant Bells', 'effects', false, 'harbor', 'demo/bells.mp3', ['bells', 'harbor']),
      sound('tension', 'Rising Tension', 'music', true, 'harbor', 'demo/tension.mp3', ['music', 'tension']),
    ];

    var scenes = [
      scene('tavern', 'The Laughing Gargoyle', [
        mood('evening', 'Tavern Evening', 'tavern', [
          layer('evening-crowd', 'crowd', 72),
          layer('evening-hearth', 'hearth', 48, { fadeIn: 2, fadeOut: 4 }),
          layer('evening-lute', 'lute', 35),
          layer('evening-rain', 'rain', 28),
          layer('evening-glasses', 'glasses', 18, { loop: false }),
        ]),
        mood('rain-mood', 'Rain Rolls In', 'tavern', [
          layer('rain-mood-hearth', 'hearth', 55),
          layer('rain-mood-rain', 'rain', 70),
          layer('rain-mood-thunder', 'thunder', 40, { loop: false }),
          layer('rain-mood-wind', 'wind', 30),
        ]),
        mood('last-call', 'Last Call', 'tavern', [
          layer('last-call-hearth', 'hearth', 30),
          layer('last-call-lute', 'lute', 15),
          layer('last-call-glasses', 'glasses', 10, { loop: false }),
        ]),
      ]),
      scene('docks', 'Saltmarsh Docks', [
        mood('fog', 'Morning Fog', 'harbor', [
          layer('fog-waves', 'waves', 60),
          layer('fog-bells', 'bells', 25, { loop: false }),
        ]),
        mood('storm-watch', 'Storm Watch', 'harbor', [
          layer('storm-watch-waves', 'waves', 80),
          layer('storm-watch-thunder', 'thunder', 50, { loop: false }),
          layer('storm-watch-wind', 'wind', 45),
        ]),
      ]),
      scene('marsh', 'The Hollow Marsh', [
        mood('dusk-chorus', 'Dusk Chorus', 'harbor', [
          layer('dusk-chorus-wind', 'wind', 40),
          layer('dusk-chorus-drone', 'drone', 35),
        ]),
        mood('will-o-wisp', 'Will-o-the-Wisp', 'harbor', [
          layer('will-o-wisp-drone', 'drone', 55),
          layer('will-o-wisp-tension', 'tension', 20),
        ]),
      ]),
      scene('cave', "Smuggler's Cave", [
        mood('dripping-silence', 'Dripping Silence', 'harbor', [
          layer('dripping-silence-drone', 'drone', 45),
          layer('dripping-silence-footsteps', 'footsteps', 20, { loop: false }),
        ]),
      ]),
    ];

    var baselines = {};
    scenes.forEach(function (sc) {
      sc.moods.forEach(function (m) {
        baselines[m.id] = clone({ name: m.name, art: m.art, layers: m.layers });
      });
    });

    return {
      version: 1,
      nextId: 100,
      library: library,
      scenes: scenes,
      activeSceneId: 'tavern',
      activeMoodId: 'evening',
      selectedLayerId: 'evening-hearth',
      baselines: baselines,
    };
  }

  function findScene(state, id) {
    for (var i = 0; i < state.scenes.length; i++) if (state.scenes[i].id === id) return state.scenes[i];
    return null;
  }

  function findMoodGlobal(state, moodId) {
    for (var i = 0; i < state.scenes.length; i++) {
      var sc = state.scenes[i];
      for (var j = 0; j < sc.moods.length; j++) {
        if (sc.moods[j].id === moodId) return { scene: sc, mood: sc.moods[j] };
      }
    }
    return null;
  }

  function getScene(state) { return findScene(state, state.activeSceneId); }
  function getMood(state) {
    var sc = getScene(state);
    if (!sc) return null;
    for (var i = 0; i < sc.moods.length; i++) if (sc.moods[i].id === state.activeMoodId) return sc.moods[i];
    return null;
  }

  function selectScene(state, id) {
    var sc = findScene(state, id);
    if (!sc) throw new Error('Scene not found: ' + id);
    state.activeSceneId = id;
    var m = sc.moods[0] || null;
    state.activeMoodId = m ? m.id : null;
    state.selectedLayerId = m && m.layers[0] ? m.layers[0].id : null;
    return sc;
  }

  function selectMood(state, id) {
    var sc = getScene(state);
    var m = sc && sc.moods.find(function (x) { return x.id === id; });
    if (!m) throw new Error('Mood not found in active scene: ' + id);
    state.activeMoodId = id;
    state.selectedLayerId = m.layers[0] ? m.layers[0].id : null;
    return m;
  }

  function selectLayer(state, id) {
    var m = getMood(state);
    var l = m && m.layers.find(function (x) { return x.id === id; });
    if (!l) throw new Error('Layer not found in active mood: ' + id);
    state.selectedLayerId = id;
    return l;
  }

  function addSound(state, soundId) {
    var m = getMood(state);
    var src = state.library.find(function (s) { return s.id === soundId; });
    if (!src) throw new Error('Unknown sound id: ' + soundId);
    var existing = m.layers.find(function (l) { return canonicalOf(l).indexOf(soundId) !== -1; });
    if (existing) {
      state.selectedLayerId = existing.id;
      return existing;
    }
    var newLayer = layer(genId(state), soundId, 60, { loop: src.loop });
    m.layers.push(newLayer);
    state.selectedLayerId = newLayer.id;
    return newLayer;
  }

  function getLayerSounds(state, layerId) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    return canonicalOf(found.layer).map(function (id) {
      return state.library.find(function (s) { return s.id === id; });
    });
  }

  function addLayerSound(state, layerId, soundId) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    var l = found.layer;
    var src = state.library.find(function (s) { return s.id === soundId; });
    if (!src) throw new Error('Unknown sound id: ' + soundId);
    var canonical = canonicalOf(l);
    if (canonical.indexOf(soundId) !== -1) {
      if (state.activeMoodId === found.mood.id) state.selectedLayerId = l.id;
      return l;
    }
    var ownedElsewhere = found.mood.layers.some(function (other) {
      return other !== l && canonicalOf(other).indexOf(soundId) !== -1;
    });
    if (ownedElsewhere) throw new Error('Sound already used in this mood: ' + soundId);
    if (canonical.length === 1 && !l.name) {
      var firstSound = state.library.find(function (s) { return s.id === l.soundId; });
      if (firstSound) l.name = firstSound.name;
    }
    if (canonical.length === 1 && !l.coverArt) {
      var firstSoundArt = state.library.find(function (s) { return s.id === l.soundId; });
      if (firstSoundArt) l.coverArt = firstSoundArt.art;
    }
    l.additionalSoundIds = (l.additionalSoundIds || []).concat([soundId]);
    if (state.activeMoodId === found.mood.id) state.selectedLayerId = l.id;
    return l;
  }

  function removeLayerSound(state, layerId, soundId) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    var l = found.layer;
    var canonical = canonicalOf(l);
    var idx = canonical.indexOf(soundId);
    if (idx === -1) throw new Error('Unknown source in layer: ' + soundId);
    if (canonical.length === 1) throw new Error('Cannot remove the last remaining source');
    var next = canonical.slice();
    next.splice(idx, 1);
    l.soundId = next[0];
    l.additionalSoundIds = next.slice(1);
    return l;
  }

  function moveLayerSound(state, layerId, soundId, toIndex) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    var l = found.layer;
    var canonical = canonicalOf(l);
    var idx = canonical.indexOf(soundId);
    if (idx === -1) throw new Error('Unknown source in layer: ' + soundId);
    if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= canonical.length) {
      throw new Error('Invalid target index: ' + toIndex);
    }
    var next = canonical.slice();
    next.splice(idx, 1);
    next.splice(toIndex, 0, soundId);
    l.soundId = next[0];
    l.additionalSoundIds = next.slice(1);
    return l;
  }

  function advanceLayerSound(state, layerId, cursor, rng) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    var l = found.layer;
    var roll = typeof rng === 'function' ? rng : Math.random;
    var canonical = canonicalOf(l);
    var rotation = l.rotation === 'random' ? 'random' : 'round-robin';
    var loop = !!l.loop;

    if (!cursor || cursor.soundId == null || canonical.indexOf(cursor.soundId) === -1) {
      var first = rotation === 'random' ? canonical[Math.min(canonical.length - 1, Math.floor(roll() * canonical.length))] : canonical[0];
      return { soundId: first, playedSoundIds: [first] };
    }

    if (canonical.length === 1) {
      return loop ? { soundId: canonical[0], playedSoundIds: [canonical[0]] } : null;
    }

    if (rotation === 'round-robin') {
      var idx = canonical.indexOf(cursor.soundId);
      var nextIdx = idx + 1;
      if (nextIdx < canonical.length) {
        var next = canonical[nextIdx];
        var played = (cursor.playedSoundIds || []).concat([next]);
        return { soundId: next, playedSoundIds: played };
      }
      if (!loop) return null;
      return { soundId: canonical[0], playedSoundIds: [canonical[0]] };
    }

    var playedSoFar = Array.isArray(cursor.playedSoundIds) ? cursor.playedSoundIds.slice() : [];
    if (playedSoFar.indexOf(cursor.soundId) === -1) playedSoFar.push(cursor.soundId);
    var remaining = canonical.filter(function (id) { return playedSoFar.indexOf(id) === -1; });
    if (remaining.length === 0) {
      if (!loop) return null;
      var choices = canonical.filter(function (id) { return id !== cursor.soundId; });
      if (choices.length === 0) choices = canonical;
      var pick = choices[Math.min(choices.length - 1, Math.floor(roll() * choices.length))];
      return { soundId: pick, playedSoundIds: [pick] };
    }
    var pick2 = remaining[Math.min(remaining.length - 1, Math.floor(roll() * remaining.length))];
    return { soundId: pick2, playedSoundIds: playedSoFar.concat([pick2]) };
  }

  function canonicalOf(l) {
    return [l.soundId].concat(l.additionalSoundIds || []);
  }

  function findLayerGlobal(state, layerId) {
    for (var i = 0; i < state.scenes.length; i++) {
      var sc = state.scenes[i];
      for (var j = 0; j < sc.moods.length; j++) {
        var m = sc.moods[j];
        for (var k = 0; k < m.layers.length; k++) {
          if (m.layers[k].id === layerId) return { scene: sc, mood: m, layer: m.layers[k], index: k };
        }
      }
    }
    return null;
  }

  function updateLayer(state, layerId, patch) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    var l = found.layer;
    patch = patch || {};

    if ('soundId' in patch && patch.soundId !== l.soundId) {
      var newId = patch.soundId;
      var exists = state.library.some(function (s) { return s.id === newId; });
      if (!exists) throw new Error('Unknown sound id: ' + newId);
      var ownedElsewhere = found.mood.layers.some(function (other) {
        return other !== l && canonicalOf(other).indexOf(newId) !== -1;
      });
      var ownedBySelfAdditional = (l.additionalSoundIds || []).indexOf(newId) !== -1;
      if (ownedElsewhere || ownedBySelfAdditional) throw new Error('Sound already used in this mood: ' + newId);
    }

    if ('rotation' in patch && ROTATIONS.indexOf(patch.rotation) === -1) {
      throw new Error('Invalid rotation: ' + patch.rotation);
    }

    ['volume', 'pan', 'fadeIn', 'fadeOut', 'crossfade'].forEach(function (key) {
      if (key in patch) {
        var v = patch[key];
        if (typeof v === 'number' && Number.isFinite(v)) {
          var range = LAYER_RANGES[key];
          l[key] = clamp(v, range[0], range[1]);
        }
      }
    });
    ['loop', 'enabled'].forEach(function (key) {
      if (key in patch) l[key] = !!patch[key];
    });
    if ('rotation' in patch) l.rotation = patch.rotation;
    if ('name' in patch && typeof patch.name === 'string') {
      if (patch.name === '') delete l.name;
      else l.name = patch.name;
    }

    if ('soundId' in patch && patch.soundId !== l.soundId) {
      l.soundId = patch.soundId;
    }
    return l;
  }

  function removeLayer(state, layerId) {
    var found = findLayerGlobal(state, layerId);
    if (!found) throw new Error('Layer not found: ' + layerId);
    found.mood.layers.splice(found.index, 1);
    if (state.selectedLayerId === layerId && state.activeMoodId === found.mood.id) {
      state.selectedLayerId = found.mood.layers[0] ? found.mood.layers[0].id : null;
    }
    return { sceneId: found.scene.id, moodId: found.mood.id, layer: clone(found.layer), index: found.index };
  }

  function restoreLayer(state, record) {
    var sc = findScene(state, record.sceneId);
    var m = sc && sc.moods.find(function (x) { return x.id === record.moodId; });
    if (!m) return null;
    var recordIds = canonicalOf(record.layer);
    if (recordIds.some(function (id) {
      return !state.library.some(function (s) { return s.id === id; });
    })) return null;
    var dup = m.layers.some(function (l) {
      return canonicalOf(l).some(function (id) { return recordIds.indexOf(id) !== -1; });
    });
    if (dup) return null;
    var insertAt = Math.min(record.index, m.layers.length);
    var restored = clone(record.layer);
    m.layers.splice(insertAt, 0, restored);
    return restored;
  }

  function createMood(state, name) {
    var sc = getScene(state);
    var id = genId(state);
    var art = (sc.moods[0] && sc.moods[0].art) || 'tavern';
    var m = mood(id, String(name == null ? '' : name), art, []);
    sc.moods.push(m);
    state.activeMoodId = id;
    state.selectedLayerId = null;
    return m;
  }

  function duplicateMood(state) {
    var sc = getScene(state);
    var original = getMood(state);
    var newId = genId(state);
    var newLayers = original.layers.map(function (l) {
      var copy = clone(l);
      copy.id = genId(state);
      return copy;
    });
    var dup = mood(newId, original.name + ' copy', original.art, newLayers);
    sc.moods.push(dup);
    state.activeMoodId = newId;
    state.selectedLayerId = newLayers[0] ? newLayers[0].id : null;
    return dup;
  }

  function renameMood(state, name) {
    var m = getMood(state);
    m.name = String(name == null ? '' : name).trim();
    return m;
  }

  function saveMood(state) {
    var m = getMood(state);
    var trimmed = m.name.trim();
    if (!trimmed) throw new Error('Mood name cannot be blank');
    m.name = trimmed;
    state.baselines[m.id] = clone({ name: m.name, art: m.art, layers: m.layers });
    return m;
  }

  function isDirty(state, moodId) {
    var id = moodId || state.activeMoodId;
    var found = findMoodGlobal(state, id);
    if (!found) return false;
    var baseline = state.baselines[id];
    if (!baseline) return true;
    var current = { name: found.mood.name, art: found.mood.art, layers: found.mood.layers };
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }

  function importSound(state, metadata) {
    metadata = metadata || {};
    var name = String(metadata.name == null ? '' : metadata.name).trim();
    var category = String(metadata.category == null ? '' : metadata.category).toLowerCase();
    if (CATEGORIES.indexOf(category) === -1) throw new Error('Unknown category: ' + category);
    var art = metadata.art === 'harbor' ? 'harbor' : 'tavern';
    var s = sound(genId(state), name, category, !!metadata.loop, art, String(metadata.source || ''));
    s.sourceType = metadata.sourceType || 'file';
    state.library.push(s);
    return s;
  }

  function searchLibrary(state, query, category) {
    var q = String(query == null ? '' : query).toLowerCase();
    return state.library.filter(function (s) {
      var catOk = !category || category === 'all' || s.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return s.name.toLowerCase().indexOf(q) !== -1 ||
        s.source.toLowerCase().indexOf(q) !== -1 ||
        s.sourceType.toLowerCase().indexOf(q) !== -1 ||
        (Array.isArray(s.tags) ? s.tags : []).some(function (tag) {
          return typeof tag === 'string' && tag.toLowerCase().indexOf(q) !== -1;
        });
    });
  }

  function serializeState(state) {
    return JSON.stringify(state);
  }

  function isValidSound(s) {
    return s && typeof s.id === 'string' && typeof s.name === 'string' &&
      CATEGORIES.indexOf(s.category) !== -1 && typeof s.loop === 'boolean' &&
      (s.art === 'tavern' || s.art === 'harbor') &&
      typeof s.sourceType === 'string' && typeof s.source === 'string';
  }

  function isValidLayer(l, libraryIds) {
    if (!(l && typeof l.id === 'string' && typeof l.soundId === 'string' && libraryIds.has(l.soundId) &&
      typeof l.volume === 'number' && Number.isFinite(l.volume) &&
      typeof l.pan === 'number' && Number.isFinite(l.pan) &&
      typeof l.fadeIn === 'number' && Number.isFinite(l.fadeIn) &&
      typeof l.fadeOut === 'number' && Number.isFinite(l.fadeOut) &&
      typeof l.loop === 'boolean' && typeof l.enabled === 'boolean')) {
      return false;
    }
    if ('name' in l && l.name !== undefined && typeof l.name !== 'string') return false;
    if ('coverArt' in l && l.coverArt !== undefined && l.coverArt !== 'tavern' && l.coverArt !== 'harbor') return false;
    if ('rotation' in l && l.rotation !== undefined && ROTATIONS.indexOf(l.rotation) === -1) return false;
    if ('crossfade' in l && l.crossfade !== undefined) {
      if (typeof l.crossfade !== 'number' || !Number.isFinite(l.crossfade) || l.crossfade < 0 || l.crossfade > 30) return false;
    }
    if ('additionalSoundIds' in l && l.additionalSoundIds !== undefined) {
      if (!Array.isArray(l.additionalSoundIds)) return false;
      var seen = new Set([l.soundId]);
      for (var i = 0; i < l.additionalSoundIds.length; i++) {
        var id = l.additionalSoundIds[i];
        if (typeof id !== 'string' || !libraryIds.has(id) || seen.has(id)) return false;
        seen.add(id);
      }
    }
    return true;
  }

  function isValidMood(m, libraryIds, seenIds) {
    if (!m || typeof m.id !== 'string' || seenIds.has(m.id) || typeof m.name !== 'string' ||
      (m.art !== 'tavern' && m.art !== 'harbor') || !Array.isArray(m.layers)) {
      return false;
    }
    seenIds.add(m.id);
    return m.layers.every(function (l) {
      if (!isValidLayer(l, libraryIds)) return false;
      if (seenIds.has(l.id)) return false;
      seenIds.add(l.id);
      return true;
    });
  }

  function isValidScene(sc, libraryIds, seenIds) {
    if (!sc || typeof sc.id !== 'string' || seenIds.has(sc.id) || typeof sc.name !== 'string' || !Array.isArray(sc.moods)) {
      return false;
    }
    seenIds.add(sc.id);
    return sc.moods.every(function (m) { return isValidMood(m, libraryIds, seenIds); });
  }

  function isValidSnapshot(parsed) {
    if (!parsed || parsed.version !== 1 || typeof parsed.nextId !== 'number' || !Number.isFinite(parsed.nextId) ||
      !Array.isArray(parsed.scenes) || !Array.isArray(parsed.library) ||
      typeof parsed.baselines !== 'object' || parsed.baselines === null) {
      return false;
    }
    if (!parsed.library.every(isValidSound)) return false;
    var libraryIds = new Set(parsed.library.map(function (s) { return s.id; }));
    var seenIds = new Set();
    if (!parsed.scenes.every(function (sc) { return isValidScene(sc, libraryIds, seenIds); })) return false;

    var baselinesOk = parsed.scenes.every(function (sc) {
      return sc.moods.every(function (m) {
        var b = parsed.baselines[m.id];
        if (b === undefined) return true;
        if (!b || typeof b.name !== 'string' || (b.art !== 'tavern' && b.art !== 'harbor') || !Array.isArray(b.layers)) return false;
        var bSeen = new Set();
        return b.layers.every(function (l) {
          if (!isValidLayer(l, libraryIds)) return false;
          if (bSeen.has(l.id)) return false;
          bSeen.add(l.id);
          return true;
        });
      });
    });
    if (!baselinesOk) return false;

    var sc = findScene(parsed, parsed.activeSceneId);
    if (!sc) return false;
    var m = sc.moods.find(function (x) { return x.id === parsed.activeMoodId; });
    if (parsed.activeMoodId != null && !m) return false;
    if (parsed.selectedLayerId != null) {
      if (!m) return false;
      var hasLayer = m.layers.some(function (l) { return l.id === parsed.selectedLayerId; });
      if (!hasLayer) return false;
    }
    return true;
  }

  function restoreState(serialized) {
    var parsed;
    try {
      parsed = JSON.parse(serialized);
    } catch (e) {
      return createState();
    }
    if (!isValidSnapshot(parsed)) return createState();
    return parsed;
  }

  var MoodState = {
    createState: createState,
    getScene: getScene,
    getMood: getMood,
    selectScene: selectScene,
    selectMood: selectMood,
    selectLayer: selectLayer,
    addSound: addSound,
    getLayerSounds: getLayerSounds,
    addLayerSound: addLayerSound,
    removeLayerSound: removeLayerSound,
    moveLayerSound: moveLayerSound,
    advanceLayerSound: advanceLayerSound,
    updateLayer: updateLayer,
    removeLayer: removeLayer,
    restoreLayer: restoreLayer,
    createMood: createMood,
    duplicateMood: duplicateMood,
    renameMood: renameMood,
    saveMood: saveMood,
    isDirty: isDirty,
    importSound: importSound,
    searchLibrary: searchLibrary,
    serializeState: serializeState,
    restoreState: restoreState,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoodState;
  }
  root.MoodState = MoodState;
})(typeof globalThis !== 'undefined' ? globalThis : this);
