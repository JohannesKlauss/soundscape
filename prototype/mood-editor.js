// Mood editor prototype controller.
//
// Vanilla, framework-free DOM controller for prototype/mood-editor.html.
// Reads/writes state exclusively through the global MoodState API
// (prototype/mood-state.js). Playback, audio import, and file uploads are
// entirely simulated: no network requests, no media decoding/storage.
//
// Storage:
//   soundscape.mood-prep.v1      - serialized MoodState (drafts, autosaved
//                                   after every mutation; see persistDraft)
//   soundscape.mood-prep.ui.v1   - small UI-only prefs (search query,
//                                   category filter, preview volume)
//
// No test-only globals are exposed; this file self-invokes and attaches no
// window properties.
(function (root) {
  'use strict';

  var MoodState = root.MoodState;
  if (!MoodState) return;

  var STORAGE_KEY = 'soundscape.mood-prep.v1';
  var UI_STORAGE_KEY = 'soundscape.mood-prep.ui.v1';
  var CATEGORY_VALUES = ['all', 'ambience', 'music', 'effects'];
  var AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.aif', '.aiff'];
  var TOAST_MS = 5000;
  var IMPORT_DELAY_MS = 500;
  var storageWritable = true;
  var storageSnapshot = null;
  var stateCheckpoint = null;
  var storageConflict = false;
  var SOUND_MIME = 'application/x-soundscape-sound';

  function clampNum(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // ---------------------------------------------------------------------
  // State + UI bootstrap
  // ---------------------------------------------------------------------

  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); storageSnapshot = raw; } catch (e) { raw = null; storageWritable = false; }
    if (raw === null) return MoodState.createState();
    try {
      var parsed = JSON.parse(raw);
      var restored = MoodState.restoreState(raw);
      if (JSON.stringify(parsed) !== MoodState.serializeState(restored)) throw new Error('Invalid snapshot');
      return restored;
    } catch (e) {
      storageConflict = true;
      return MoodState.createState();
    }
  }

  function loadUi() {
    var ui = {
      drawerOpen: false,
      importOpen: false,
      query: '',
      category: 'all',
      preview: { kind: null, id: null },
      previewCursors: {},
      replaceLayerId: null,
      stackLayerId: null,
      previewVolume: 65,
      undoRecord: null,
    };
    try {
      var raw = localStorage.getItem(UI_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.query === 'string') ui.query = parsed.query;
          if (CATEGORY_VALUES.indexOf(parsed.category) !== -1) ui.category = parsed.category;
          if (typeof parsed.previewVolume === 'number' && Number.isFinite(parsed.previewVolume)) {
            ui.previewVolume = clampNum(parsed.previewVolume, 0, 100);
          }
        }
      }
    } catch (e) {
      // ignore corrupt UI prefs, fall back to defaults above
    }
    return ui;
  }

  var state = loadState();
  stateCheckpoint = MoodState.serializeState(state);
  var ui = loadUi();
  var storageWarned = false;
  var toastTimer = null;
  var dragCounter = 0;

  function persistDraft() {
    try {
      if (storageConflict || localStorage.getItem(STORAGE_KEY) !== storageSnapshot) {
        storageConflict = true;
        showToast('Another tab changed this library. Your changes remain in this tab; reload to use the other version.');
        return false;
      }
      var serialized = MoodState.serializeState(state);
      localStorage.setItem(STORAGE_KEY, serialized);
      storageSnapshot = serialized;
      stateCheckpoint = serialized;
      storageConflict = false;
      storageWritable = true;
      return true;
    } catch (e) {
      storageWritable = false;
      if (!storageWarned) {
        storageWarned = true;
        showToast('Browser storage is unavailable. Changes last for this tab only.');
      }
      return false;
    }
  }

  function persistUi() {
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
        query: ui.query, category: ui.category, previewVolume: ui.previewVolume,
      }));
    } catch (e) {
      // UI prefs are a nice-to-have; silently skip on storage failure
    }
  }

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------

  var sceneSelectEl = document.getElementById('sceneSelect');
  var moodStripEl = document.getElementById('moodStrip');
  var newMoodEl = document.getElementById('newMood');
  var moodArtEl = document.getElementById('moodArt');
  var moodNameEl = document.getElementById('moodName');
  var moodMetaEl = document.getElementById('moodMeta');
  var duplicateMoodEl = document.getElementById('duplicateMood');
  var soundGridEl = document.getElementById('soundGrid');
  var selectedSoundNameEl = document.getElementById('selectedSoundName');
  var selectedSoundMetaEl = document.getElementById('selectedSoundMeta');
  var soundSettingsEl = document.getElementById('soundSettings');

  var libraryDrawerEl = document.getElementById('libraryDrawer');
  var libraryResultsEl = document.getElementById('libraryResults');
  var libraryCountEl = document.getElementById('libraryCount');
  var replacementBarEl = document.getElementById('replacementBar');
  var replacementNameEl = document.getElementById('replacementName');
  var cancelReplaceEl = document.getElementById('cancelReplace');
  var closeLibraryEl = document.getElementById('closeLibrary');

  var importPanelEl = document.getElementById('importPanel');
  var closeImportEl = document.getElementById('closeImport');
  var importFormEl = document.getElementById('importForm');
  var importUrlEl = document.getElementById('importUrl');
  var importNameEl = document.getElementById('importName');
  var importCategoryEl = document.getElementById('importCategory');
  var importSubmitEl = document.getElementById('importSubmit');
  var importFeedbackEl = document.getElementById('importFeedback');
  var importFilesEl = document.getElementById('importFiles');

  var libraryToggleEl = document.getElementById('libraryToggle');
  var librarySearchEl = document.getElementById('librarySearch');
  var libraryCategoryEl = document.getElementById('libraryCategory');
  var pasteLinkEl = document.getElementById('pasteLink');
  var filesButtonEl = document.getElementById('filesButton');

  var previewMoodEl = document.getElementById('previewMood');
  var previewLabelEl = document.getElementById('previewLabel');
  var previewVolumeEl = document.getElementById('previewVolume');
  var previewVolumeValueEl = document.getElementById('previewVolumeValue');
  var saveStateEl = document.getElementById('saveState');
  var saveMoodEl = document.getElementById('saveMood');

  var fileInputEl = document.getElementById('fileInput');
  var fileDropOverlayEl = document.getElementById('fileDropOverlay');
  var toastEl = document.getElementById('toast');
  var toastMessageEl = document.getElementById('toastMessage');
  var toastActionEl = document.getElementById('toastAction');
  var toastDismissEl = document.getElementById('toastDismiss');

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  function panLabel(pan) {
    if (!pan) return 'Center';
    return Math.abs(pan) + (pan < 0 ? ' Left' : ' Right');
  }

  function getLayer(layerId) {
    var mood = MoodState.getMood(state);
    return mood && mood.layers.find(function (l) { return l.id === layerId; });
  }

  function layerName(layer) {
    var first = MoodState.getLayerSounds(state, layer.id)[0];
    return layer.name || first.name;
  }

  function moodCountLabel(mood, includeSources) {
    var count = mood.layers.length;
    var sources = mood.layers.reduce(function (sum, l) { return sum + MoodState.getLayerSounds(state, l.id).length; }, 0);
    if (sources > count) return count + (count === 1 ? ' tile' : ' tiles') + (includeSources ? ' · ' + sources + ' sounds' : '');
    return count + (count === 1 ? ' sound' : ' sounds');
  }

  function cardMetaText(layer, snd) {
    var count = MoodState.getLayerSounds(state, layer.id).length;
    var parts = count > 1 ? [count + ' sounds', layer.rotation === 'random' ? 'Random' : 'In order'] : [snd ? snd.category : '', layer.loop ? 'loop' : 'one-shot'];
    if (!layer.enabled) parts.push('muted');
    return parts.filter(Boolean).join(' · ');
  }

  function librarySourceLabel(sound) {
    return {demo: 'Sample library', youtube: 'YouTube', freesound: 'Freesound', file: 'Local file', url: 'Audio link'}[sound.sourceType] || 'Audio';
  }

  function classifyImportUrl(raw) {
    var trimmed = String(raw || '').trim();
    var url;
    try {
      url = new URL(trimmed);
    } catch (e) {
      return { ok: false, message: 'Enter a valid http(s) link to import.' };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, message: 'Enter a valid http(s) link to import.' };
    }
    var host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
      return { ok: true, sourceType: 'youtube', defaultName: 'YouTube audio' };
    }
    if (host === 'freesound.org' || host.endsWith('.freesound.org')) {
      return { ok: true, sourceType: 'freesound', defaultName: 'Freesound sound' };
    }
    return { ok: true, sourceType: 'url', defaultName: 'Audio link' };
  }

  function isAudioFile(file) {
    if (file.type && file.type.indexOf('audio/') === 0) return true;
    var name = (file.name || '').toLowerCase();
    return AUDIO_EXTENSIONS.some(function (ext) { return name.slice(-ext.length) === ext; });
  }

  function isTyping() {
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  function renderSceneSelect() {
    sceneSelectEl.innerHTML = state.scenes.map(function (sc) {
      return '<option value="' + sc.id + '"' + (sc.id === state.activeSceneId ? ' selected' : '') + '>' +
        escapeHtml(sc.name) + '</option>';
    }).join('');
  }

  function renderMoodStrip() {
    var scene = MoodState.getScene(state);
    var moods = scene ? scene.moods : [];
    moodStripEl.innerHTML = moods.map(function (m) {
      var active = m.id === state.activeMoodId;
      var dirty = MoodState.isDirty(state, m.id);
      return '<button type="button" class="mood-tab' + (active ? ' is-active' : '') + '" ' +
        'data-mood-id="' + m.id + '" data-action="select-mood" aria-current="' + (active ? 'true' : 'false') + '">' +
        '<img src="assets/' + m.art + '.webp" alt="">' +
        '<span class="mood-tab-name">' + escapeHtml(m.name || 'Untitled mood') + '</span>' +
        '<small>' + moodCountLabel(m, false) + '</small>' +
        (dirty ? '<span class="mood-dirty" aria-hidden="true"></span>' : '') +
        '</button>';
    }).join('');
  }

  function syncMoodDirtyDot(tab, moodId) {
    var dirty = MoodState.isDirty(state, moodId);
    var dot = tab.querySelector('.mood-dirty');
    if (dirty && !dot) {
      dot = document.createElement('span');
      dot.className = 'mood-dirty';
      dot.setAttribute('aria-hidden', 'true');
      tab.appendChild(dot);
    } else if (!dirty && dot) {
      dot.remove();
    }
  }

  function syncMoodTabStates() {
    var scene = MoodState.getScene(state);
    if (!scene) return;
    scene.moods.forEach(function (mood) {
      var tab = moodStripEl.querySelector('[data-mood-id="' + mood.id + '"]');
      if (!tab) return;
      syncMoodDirtyDot(tab, mood.id);
      var count = tab.querySelector('small');
      if (count) count.textContent = moodCountLabel(mood, false);
    });
  }

  function patchMoodStripName(moodId, name) {
    var tab = moodStripEl.querySelector('[data-mood-id="' + moodId + '"]');
    if (!tab) return;
    var nameEl = tab.querySelector('.mood-tab-name');
    if (nameEl) nameEl.textContent = name || 'Untitled mood';
    syncMoodDirtyDot(tab, moodId);
  }

  function triggerContextChangeAnimation() {
    soundGridEl.classList.remove('context-change');
    void soundGridEl.offsetWidth;
    soundGridEl.classList.add('context-change');
  }

  function renderMoodHeader() {
    var scene = MoodState.getScene(state);
    var mood = MoodState.getMood(state);
    if (!mood) return;
    moodArtEl.src = 'assets/' + mood.art + '.webp';
    moodArtEl.alt = (scene ? scene.name : '') + ' atmosphere artwork';
    if (document.activeElement !== moodNameEl) moodNameEl.value = mood.name;
    var count = mood.layers.length;
    moodMetaEl.textContent = moodCountLabel(mood, true) + ' · a mix for ' + (scene ? scene.name : '');
    previewMoodEl.disabled = count === 0;
  }

  function cardTemplate(layer) {
    var snd = MoodState.getLayerSounds(state, layer.id)[0];
    var name = layerName(layer);
    var selected = state.selectedLayerId === layer.id;
    var previewing = ui.preview.kind === 'layer' && ui.preview.id === layer.id;
    var classes = ['sound-card'];
    if (selected) classes.push('is-selected');
    if (!layer.enabled) classes.push('is-muted');
    if (previewing) classes.push('is-previewing');
    return '<article class="' + classes.join(' ') + '" data-layer-id="' + layer.id + '" data-action="select-layer">' +
      '<img class="sound-art" src="assets/' + (layer.coverArt || snd.art) + '.webp" alt="">' +
      '<div class="sound-body">' +
      '<div class="sound-top">' +
      '<button type="button" class="sound-title" data-action="select-layer" data-layer-id="' + layer.id + '">' +
      escapeHtml(name) + '</button>' +
      '<button type="button" class="tile-listen" data-action="preview-layer" data-layer-id="' + layer.id + '" ' +
      'aria-pressed="' + (previewing ? 'true' : 'false') + '" aria-label="Listen to ' + escapeHtml(name) + '" title="Audition this tile">' +
      '<svg class="icon"><use href="#' + (previewing ? 'i-stop' : 'i-play') + '"/></svg>' +
      '</button>' +
      '</div>' +
      '<p class="sound-meta">' + escapeHtml(cardMetaText(layer, snd)) + '</p>' +
      '<div class="sound-level">' +
      '<input type="range" min="0" max="100" value="' + layer.volume + '" data-field="volume" ' +
      'data-layer-id="' + layer.id + '" aria-label="Volume for ' + escapeHtml(name) + '">' +
      '<output data-output-for="' + layer.id + '">' + layer.volume + '%</output>' +
      '</div>' +
      '</div>' +
      '</article>';
  }

  function renderGrid() {
    var mood = MoodState.getMood(state);
    var layers = mood ? mood.layers : [];
    if (!layers.length) {
      soundGridEl.innerHTML =
        '<div class="empty-state">' +
        '<p>This mood has no sounds yet.</p>' +
        '<div class="empty-actions">' +
        '<button type="button" class="primary" data-action="open-library">Add sound</button>' +
        '<button type="button" class="secondary" data-action="open-import">Import link</button>' +
        '</div>' +
        '</div>';
      return;
    }
    var html = layers.map(cardTemplate).join('') +
      '<button type="button" class="add-sound" data-action="open-library" title="Add a sound to this mood">' +
      '<svg class="icon"><use href="#i-plus"/></svg><span>Add sound</span></button>';
    soundGridEl.innerHTML = html;
  }

  function propertyField(label, layerId, field, min, max, step, value, display) {
    var fid = 'prop-' + field + '-' + layerId;
    var panLabels = field === 'pan'
      ? '<div class="pan-labels"><span>Left</span><span>Right</span></div>'
      : '';
    return '<div class="property-field">' +
      '<label for="' + fid + '">' + label + ' <span class="property-value" data-value-for="' +
      layerId + ':' + field + '">' + escapeHtml(display) + '</span></label>' +
      '<input type="range" id="' + fid + '" min="' + min + '" max="' + max + '" step="' + step + '" ' +
      'value="' + value + '" data-field="' + field + '" data-layer-id="' + layerId + '">' +
      panLabels +
      '</div>';
  }

  function fieldRow(label, layerId, field, min, max, step, value, display) {
    var fid = 'prop-' + field + '-' + layerId;
    return '<div>' +
      '<label for="' + fid + '">' + label + '</label>' +
      '<div class="field-row">' +
      '<input type="range" id="' + fid + '" min="' + min + '" max="' + max + '" step="' + step + '" ' +
      'value="' + value + '" data-field="' + field + '" data-layer-id="' + layerId + '">' +
      '<span data-value-for="' + layerId + ':' + field + '">' + escapeHtml(display) + '</span>' +
      '</div>' +
      '</div>';
  }

  function stackSectionTemplate(layer) {
    var sounds = MoodState.getLayerSounds(state, layer.id);
    var multiple = sounds.length > 1;
    var rows = sounds.map(function (snd, index) {
      var controls = multiple ? '<div class="stack-source-actions">' +
        '<button type="button" data-action="stack-up" data-layer-id="' + layer.id + '" data-sound-id="' + snd.id + '" aria-label="Move ' + escapeHtml(snd.name) + ' up"' + (index === 0 ? ' disabled' : '') + '><svg class="icon"><use href="#i-chevron"/></svg></button>' +
        '<button type="button" class="stack-down" data-action="stack-down" data-layer-id="' + layer.id + '" data-sound-id="' + snd.id + '" aria-label="Move ' + escapeHtml(snd.name) + ' down"' + (index === sounds.length - 1 ? ' disabled' : '') + '><svg class="icon"><use href="#i-chevron"/></svg></button>' +
        '<button type="button" data-action="stack-remove" data-layer-id="' + layer.id + '" data-sound-id="' + snd.id + '" aria-label="Remove ' + escapeHtml(snd.name) + ' from tile"><svg class="icon"><use href="#i-close"/></svg></button></div>' : '';
      return '<li class="stack-source" data-sound-id="' + snd.id + '"><span class="stack-position" aria-hidden="true">' + (index + 1) + '</span>' +
        '<span class="stack-source-name" title="' + escapeHtml(snd.name) + '">' + escapeHtml(snd.name) + '</span>' + controls + '</li>';
    }).join('');
    return '<section class="sound-stack" aria-label="Sounds in this tile"><div class="stack-heading"><h3>Sounds</h3><span>' + sounds.length + '</span>' +
      (multiple ? '<button type="button" class="stack-next" data-action="stack-next" data-layer-id="' + layer.id + '" aria-label="Next sound in ' + escapeHtml(layerName(layer)) + '" title="Next sound · simulates the current file ending" disabled><svg class="icon"><use href="#i-next"/></svg></button>' : '') + '</div>' +
      '<ol class="stack-sources" aria-label="Playback order">' + rows + '</ol>' +
      '<button type="button" class="stack-add" data-action="stack-add" data-layer-id="' + layer.id + '"><svg class="icon"><use href="#i-plus"/></svg>Add another sound</button>' +
      (multiple ? '<div class="stack-options"><label class="stack-order" for="prop-rotation-' + layer.id + '"><span>Order</span><select id="prop-rotation-' + layer.id + '" data-field="rotation" data-layer-id="' + layer.id + '"><option value="round-robin"' + (layer.rotation !== 'random' ? ' selected' : '') + '>In order</option><option value="random"' + (layer.rotation === 'random' ? ' selected' : '') + '>Random</option></select></label>' +
        propertyField('Crossfade', layer.id, 'crossfade', 0, 30, 0.5, layer.crossfade === undefined ? 3 : layer.crossfade, (layer.crossfade === undefined ? 3 : layer.crossfade).toFixed(1) + 's') +
        '<p class="stack-note">Each sound plays in full. The next fades in just before it ends.</p></div>' : '') +
      '<span class="stack-playing-status sr-only" role="status"></span></section>';
  }

  function renderProperties() {
    var layer = getLayer(state.selectedLayerId);
    if (!layer) {
      selectedSoundNameEl.textContent = 'Sound settings';
      selectedSoundMetaEl.textContent = 'Select a sound from the grid.';
      soundSettingsEl.innerHTML = '';
      return;
    }
    var sounds = MoodState.getLayerSounds(state, layer.id);
    var snd = sounds[0];
    var multiple = sounds.length > 1;
    var previewing = ui.preview.kind === 'layer' && ui.preview.id === layer.id;
    selectedSoundNameEl.textContent = layerName(layer);
    selectedSoundMetaEl.textContent = cardMetaText(layer, snd);
    soundSettingsEl.innerHTML =
      propertyField('Volume', layer.id, 'volume', 0, 100, 1, layer.volume, layer.volume + '%') +
      stackSectionTemplate(layer) +
      propertyField('Pan', layer.id, 'pan', -100, 100, 1, layer.pan, panLabel(layer.pan)) +
      '<div class="fade-fields">' +
      fieldRow(multiple ? 'Mood fade in' : 'Fade in', layer.id, 'fadeIn', 0, 30, 0.5, layer.fadeIn, layer.fadeIn.toFixed(1) + 's') +
      fieldRow(multiple ? 'Mood fade out' : 'Fade out', layer.id, 'fadeOut', 0, 30, 0.5, layer.fadeOut, layer.fadeOut.toFixed(1) + 's') +
      '</div>' +
      '<div class="checkbox-field">' +
      '<input type="checkbox" id="prop-loop-' + layer.id + '" data-field="loop" data-layer-id="' + layer.id + '"' +
      (layer.loop ? ' checked' : '') + '><label for="prop-loop-' + layer.id + '">' + (multiple ? 'Repeat stack' : 'Loop continuously') + '</label>' +
      '</div>' +
      '<div class="checkbox-field">' +
      '<input type="checkbox" id="prop-enabled-' + layer.id + '" data-field="enabled" data-layer-id="' + layer.id + '"' +
      (layer.enabled ? ' checked' : '') + '><label for="prop-enabled-' + layer.id + '">Play with mood</label>' +
      '</div>' +
      '<div class="property-actions">' +
      '<button type="button" class="property-listen" data-action="preview-layer" data-layer-id="' + layer.id + '" ' +
      'aria-pressed="' + (previewing ? 'true' : 'false') + '">' +
      '<svg class="icon"><use href="#' + (previewing ? 'i-stop' : 'i-play') + '"/></svg><span>' + (multiple ? 'Listen to stack' : 'Listen') + '</span></button>' +
      (multiple ? '' : '<button type="button" data-action="replace-layer" data-layer-id="' + layer.id + '">Replace</button>') +
      '<button type="button" class="remove" data-action="remove-layer" data-layer-id="' + layer.id + '">' + (multiple ? 'Remove tile' : 'Remove') + '</button>' +
      '</div>' +
      '<div class="source-value"><details><summary>' + (multiple ? 'Source files' : 'Source file') + '</summary>' +
      sounds.map(function (s) { return '<p>' + escapeHtml(s.source || s.name) + '</p>'; }).join('') + '</details></div>';
    syncStackPlayback();
  }

  function renderLibrary() {
    var scrollTop = libraryResultsEl.scrollTop;
    var results = MoodState.searchLibrary(state, ui.query, ui.category);
    var mood = MoodState.getMood(state);
    var replaceTargetSoundId = null;
    if (ui.replaceLayerId && mood) {
      var targetLayer = mood.layers.find(function (l) { return l.id === ui.replaceLayerId; });
      replaceTargetSoundId = targetLayer ? targetLayer.soundId : null;
    }

    if (!results.length) {
      libraryResultsEl.innerHTML = '<p class="no-results">No sounds found for your search.</p>';
    } else {
      libraryResultsEl.innerHTML = results.map(function (s) {
        var inMood = mood ? mood.layers.some(function (l) { return MoodState.getLayerSounds(state, l.id).some(function (source) { return source.id === s.id; }); }) : false;
        var stackTarget = ui.stackLayerId && getLayer(ui.stackLayerId);
        var inStack = stackTarget && MoodState.getLayerSounds(state, stackTarget.id).some(function (source) { return source.id === s.id; });
        var disabled = inMood && s.id !== replaceTargetSoundId;
        var previewing = ui.preview.kind === 'library' && ui.preview.id === s.id;
        return '<div class="library-item" role="listitem" data-sound-id="' + s.id + '">' +
          '<img class="library-art" src="assets/' + s.art + '.webp" alt="">' +
          '<div class="library-copy"><strong>' + escapeHtml(s.name) + '</strong>' +
          '<small>' + escapeHtml(s.category) + ' · ' + escapeHtml(librarySourceLabel(s)) + '</small></div>' +
          '<button type="button" class="library-audition" data-action="audition-sound" data-sound-id="' + s.id + '" ' +
          'aria-pressed="' + (previewing ? 'true' : 'false') + '" aria-label="Preview ' + escapeHtml(s.name) + '" title="Preview">' +
          '<svg class="icon"><use href="#' + (previewing ? 'i-stop' : 'i-play') + '"/></svg></button>' +
          '<button type="button" class="library-add" data-action="add-sound" data-sound-id="' + s.id + '"' +
          (disabled ? ' disabled' : '') + '>' + (disabled ? (inStack ? 'In tile' : 'In mood') : (ui.stackLayerId ? 'Add to tile' : (ui.replaceLayerId ? 'Replace' : 'Add'))) + '</button>' +
          '</div>';
      }).join('');
    }
    libraryResultsEl.scrollTop = scrollTop;
    libraryCountEl.textContent = results.length + (results.length === 1 ? ' sound' : ' sounds') + ' available';
  }

  function renderSaveState() {
    saveStateEl.textContent = storageConflict ? 'Conflict · this tab only' : (!storageWritable ? 'This tab only' : (MoodState.isDirty(state) ? 'Unsaved changes' : 'Saved locally'));
  }

  function showReplacementBar(name, stacking) {
    replacementNameEl.textContent = (stacking ? 'Adding to ' : 'Replacing ') + name;
    replacementNameEl.title = replacementNameEl.textContent;
    cancelReplaceEl.textContent = stacking ? 'Done' : 'Cancel';
    replacementBarEl.hidden = false;
  }

  function hideReplacementBar() {
    replacementBarEl.hidden = true;
    cancelReplaceEl.textContent = 'Cancel';
  }

  function clearLibraryTarget() {
    ui.replaceLayerId = null;
    ui.stackLayerId = null;
    hideReplacementBar();
  }

  // ---------------------------------------------------------------------
  // Partial display sync (continuous slider input, no full re-render)
  // ---------------------------------------------------------------------

  function displayValueFor(field, layer) {
    if (field === 'volume') return layer.volume + '%';
    if (field === 'pan') return panLabel(layer.pan);
    if (field === 'fadeIn') return layer.fadeIn.toFixed(1) + 's';
    if (field === 'fadeOut') return layer.fadeOut.toFixed(1) + 's';
    if (field === 'crossfade') return (layer.crossfade === undefined ? 3 : layer.crossfade).toFixed(1) + 's';
    return '';
  }

  function syncLayerDisplays(layerId, field) {
    var mood = MoodState.getMood(state);
    var layer = mood && mood.layers.find(function (l) { return l.id === layerId; });
    if (!layer) return;
    if (field === 'volume' || field === 'pan' || field === 'fadeIn' || field === 'fadeOut' || field === 'crossfade') {
      document.querySelectorAll('input[type="range"][data-field="' + field + '"][data-layer-id="' + layerId + '"]')
        .forEach(function (r) { r.value = String(layer[field]); });
    }
    if (field === 'volume') {
      document.querySelectorAll('output[data-output-for="' + layerId + '"]')
        .forEach(function (o) { o.textContent = layer.volume + '%'; });
    }
    document.querySelectorAll('[data-value-for="' + layerId + ':' + field + '"]')
      .forEach(function (el) { el.textContent = displayValueFor(field, layer); });
    if (field === 'enabled' || field === 'loop' || field === 'rotation') {
      var card = soundGridEl.querySelector('.sound-card[data-layer-id="' + layerId + '"]');
      if (card) {
        card.classList.toggle('is-muted', !layer.enabled);
        var meta = card.querySelector('.sound-meta');
        var snd = state.library.find(function (s) { return s.id === layer.soundId; });
        if (meta) meta.textContent = cardMetaText(layer, snd);
        if (state.selectedLayerId === layerId) selectedSoundMetaEl.textContent = cardMetaText(layer, snd);
      }
    }
  }

  function refreshPreviewVisuals() {
    soundGridEl.querySelectorAll('.sound-card').forEach(function (card) {
      var id = card.getAttribute('data-layer-id');
      var active = ui.preview.kind === 'layer' && ui.preview.id === id;
      card.classList.toggle('is-previewing', active);
      var btn = card.querySelector('.tile-listen');
      if (btn) {
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        var use = btn.querySelector('use');
        if (use) use.setAttribute('href', active ? '#i-stop' : '#i-play');
      }
    });
    var propsListenBtn = soundSettingsEl.querySelector('[data-action="preview-layer"]');
    if (propsListenBtn) {
      var lid = propsListenBtn.getAttribute('data-layer-id');
      var activeP = ui.preview.kind === 'layer' && ui.preview.id === lid;
      propsListenBtn.setAttribute('aria-pressed', activeP ? 'true' : 'false');
      var useP = propsListenBtn.querySelector('use');
      if (useP) useP.setAttribute('href', activeP ? '#i-stop' : '#i-play');
    }
    libraryResultsEl.querySelectorAll('.library-item').forEach(function (item) {
      var sid = item.getAttribute('data-sound-id');
      var active = ui.preview.kind === 'library' && ui.preview.id === sid;
      var btn = item.querySelector('.library-audition');
      if (btn) {
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        var use = btn.querySelector('use');
        if (use) use.setAttribute('href', active ? '#i-stop' : '#i-play');
      }
    });
    var moodActive = ui.preview.kind === 'mood';
    previewMoodEl.setAttribute('aria-pressed', moodActive ? 'true' : 'false');
    previewLabelEl.textContent = moodActive ? 'Stop mood preview' : 'Listen to mood';
    var moodUse = previewMoodEl.querySelector('use');
    if (moodUse) moodUse.setAttribute('href', moodActive ? '#i-stop' : '#i-play');
    syncStackPlayback();
  }

  function layerPreviewCursor(layer) {
    var active = (ui.preview.kind === 'layer' && ui.preview.id === layer.id) ||
      (ui.preview.kind === 'mood' && layer.enabled);
    if (!active) return null;
    var sounds = MoodState.getLayerSounds(state, layer.id);
    var cursor = ui.previewCursors[layer.id];
    if (!Object.prototype.hasOwnProperty.call(ui.previewCursors, layer.id) ||
        (cursor && !sounds.some(function (s) { return s.id === cursor.soundId; }))) {
      cursor = MoodState.advanceLayerSound(state, layer.id, null);
      ui.previewCursors[layer.id] = cursor;
    }
    return cursor;
  }

  function syncStackPlayback() {
    var layer = getLayer(state.selectedLayerId);
    if (!layer) return;
    var cursor = layerPreviewCursor(layer);
    var sounds = MoodState.getLayerSounds(state, layer.id);
    var list = soundSettingsEl.querySelector('.stack-sources');
    if (list) {
      list.classList.toggle('is-playing', !!cursor);
      list.setAttribute('aria-label', layer.rotation === 'random' ? 'Sounds in stack' : 'Playback order');
    }
    soundSettingsEl.querySelectorAll('.stack-source').forEach(function (row, index) {
      var current = !!cursor && row.dataset.soundId === cursor.soundId;
      row.classList.toggle('is-current', current);
      if (current) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
      var position = row.querySelector('.stack-position');
      if (current) position.innerHTML = '<svg class="icon"><use href="#i-play"/></svg>';
      else position.textContent = String(index + 1);
    });
    var next = soundSettingsEl.querySelector('[data-action="stack-next"]');
    if (next) next.disabled = !cursor;
    var status = soundSettingsEl.querySelector('.stack-playing-status');
    var currentSound = cursor && sounds.find(function (s) { return s.id === cursor.soundId; });
    var message = currentSound ? 'Previewing ' + currentSound.name : '';
    if (status && status.textContent !== message) status.textContent = message;
  }

  function handleStackNext(layerId) {
    var layer = getLayer(layerId);
    if (!layer) return;
    var cursor = layerPreviewCursor(layer);
    if (!cursor) return;
    var next = MoodState.advanceLayerSound(state, layerId, cursor);
    ui.previewCursors[layerId] = next;
    if (!next && ui.preview.kind === 'layer') {
      ui.preview = {kind: null, id: null};
      showToast('Stack finished.');
    }
    refreshPreviewVisuals();
  }

  function togglePreview(kind, id) {
    if (ui.preview.kind === kind && ui.preview.id === id) {
      ui.preview = { kind: null, id: null };
    } else {
      ui.preview = { kind: kind, id: id };
    }
    ui.previewCursors = {};
    refreshPreviewVisuals();
  }

  // ---------------------------------------------------------------------
  // Drawer / import panel open-close
  // ---------------------------------------------------------------------

  function setDrawerOpen(open) {
    ui.drawerOpen = open;
    document.body.classList.toggle('library-open', open);
    libraryDrawerEl.inert = !open;
    libraryDrawerEl.setAttribute('aria-hidden', open ? 'false' : 'true');
    libraryToggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openLibrary(focusSearch) {
    setDrawerOpen(true);
    if (focusSearch) librarySearchEl.focus();
  }

  function closeLibrary() {
    var returnFocus = libraryDrawerEl.contains(document.activeElement) || document.activeElement === librarySearchEl;
    clearLibraryTarget();
    renderLibrary();
    setDrawerOpen(false);
    if (returnFocus) {
      var target = soundGridEl.querySelector('.is-selected .sound-title') || document.getElementById('editor');
      target.focus({preventScroll: true});
    }
  }

  function openImportPanel(focusUrl) {
    ui.importOpen = true;
    importPanelEl.hidden = false;
    setDrawerOpen(true);
    if (focusUrl) importUrlEl.focus();
  }

  function closeImportPanel() {
    ui.importOpen = false;
    importPanelEl.hidden = true;
    importFeedbackEl.textContent = '';
    importUrlEl.removeAttribute('aria-invalid');
  }

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------

  function showToast(message, opts) {
    opts = opts || {};
    toastMessageEl.textContent = message;
    toastActionEl.hidden = !opts.undo;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function expireToast() {
      if (!toastEl.hidden && toastEl.contains(document.activeElement)) {
        toastTimer = setTimeout(expireToast, TOAST_MS);
        return;
      }
      hideToast();
    }, TOAST_MS);
  }

  function hideToast() {
    toastEl.hidden = true;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  }

  // ---------------------------------------------------------------------
  // Mutation flows
  // ---------------------------------------------------------------------

  function afterMutate() {
    var persisted = persistDraft();
    renderSaveState();
    syncMoodTabStates();
    return persisted;
  }

  function afterContextSwitch() {
    clearLibraryTarget();
    persistDraft();
    sceneSelectEl.value = state.activeSceneId;
    renderMoodHeader();
    renderMoodStrip();
    renderGrid();
    triggerContextChangeAnimation();
    renderProperties();
    renderLibrary();
    renderSaveState();
    refreshPreviewVisuals();
  }

  function handleSceneChange() {
    var sceneId = sceneSelectEl.value;
    if (sceneId === state.activeSceneId) return;
    MoodState.selectScene(state, sceneId);
    ui.preview = { kind: null, id: null };
    afterContextSwitch();
  }

  function handleMoodStripClick(e) {
    var btn = e.target.closest('[data-mood-id]');
    if (!btn) return;
    var moodId = btn.getAttribute('data-mood-id');
    if (moodId === state.activeMoodId) return;
    MoodState.selectMood(state, moodId);
    ui.preview = { kind: null, id: null };
    afterContextSwitch();
  }

  function handleMoodNameInput() {
    MoodState.renameMood(state, moodNameEl.value);
    moodNameEl.removeAttribute('aria-invalid');
    patchMoodStripName(state.activeMoodId, MoodState.getMood(state).name);
    afterMutate();
  }

  function handleMoodNameBlur() {
    var mood = MoodState.getMood(state);
    if (mood) moodNameEl.value = mood.name;
  }

  function handleSave() {
    try {
      MoodState.saveMood(state);
    } catch (e) {
      moodNameEl.setAttribute('aria-invalid', 'true');
      moodNameEl.focus();
      moodNameEl.select();
      showToast('Give this mood a name before saving.');
      return;
    }
    moodNameEl.removeAttribute('aria-invalid');
    patchMoodStripName(state.activeMoodId, MoodState.getMood(state).name);
    var persisted = afterMutate();
    if (persisted) showToast('Mood saved locally.');
    else if (!storageConflict) showToast('Saved for this tab only. Browser storage is unavailable.');
  }

  function afterMoodCreated() {
    clearLibraryTarget();
    afterMutate();
    renderMoodStrip();
    renderMoodHeader();
    renderGrid();
    triggerContextChangeAnimation();
    renderProperties();
    renderLibrary();
    refreshPreviewVisuals();
    moodNameEl.focus();
    moodNameEl.select();
  }

  function handleNewMood() {
    MoodState.createMood(state, 'New mood');
    ui.preview = { kind: null, id: null };
    afterMoodCreated();
    openLibrary(false);
  }

  function handleDuplicateMood() {
    MoodState.duplicateMood(state);
    ui.preview = { kind: null, id: null };
    afterMoodCreated();
  }

  function selectLayerAction(layerId) {
    if (state.selectedLayerId === layerId) return;
    clearLibraryTarget();
    renderLibrary();
    MoodState.selectLayer(state, layerId);
    soundGridEl.querySelectorAll('.sound-card').forEach(function (card) {
      card.classList.toggle('is-selected', card.getAttribute('data-layer-id') === layerId);
    });
    renderProperties();
    afterMutate();
  }

  function handleRemoveLayer(layerId) {
    var layer = getLayer(layerId);
    var name = layer ? layerName(layer) : 'sound';
    if (ui.stackLayerId === layerId || ui.replaceLayerId === layerId) clearLibraryTarget();
    delete ui.previewCursors[layerId];
    var record = MoodState.removeLayer(state, layerId);
    ui.undoRecord = record;
    if ((ui.preview.kind === 'layer' && ui.preview.id === layerId) || !MoodState.getMood(state).layers.length) ui.preview = {kind: null, id: null};
    afterMutate();
    renderGrid();
    renderProperties();
    renderLibrary();
    renderMoodHeader();
    refreshPreviewVisuals();
    showToast('Removed "' + name + '".', { undo: true });
  }

  function handleUndo() {
    var record = ui.undoRecord;
    ui.undoRecord = null;
    if (record) {
      var restored = MoodState.restoreLayer(state, record);
      if (restored) {
        afterMutate();
        if (state.activeMoodId === record.moodId) {
          renderGrid();
          renderProperties();
          renderMoodHeader();
        }
        renderLibrary();
      }
    }
    hideToast();
  }

  function handleReplaceLayer(layerId) {
    ui.stackLayerId = null;
    ui.replaceLayerId = layerId;
    var mood = MoodState.getMood(state);
    var layer = mood && mood.layers.find(function (l) { return l.id === layerId; });
    var snd = layer && state.library.find(function (s) { return s.id === layer.soundId; });
    showReplacementBar(snd ? snd.name : 'this sound');
    openLibrary(true);
    renderLibrary();
  }

  function handleStackEdit(action, layerId, soundId) {
    var layer = getLayer(layerId);
    if (!layer) return;
    var sounds = MoodState.getLayerSounds(state, layerId);
    var index = sounds.findIndex(function (s) { return s.id === soundId; });
    if (index < 0) return;
    try {
      if (action === 'stack-remove') MoodState.removeLayerSound(state, layerId, soundId);
      else MoodState.moveLayerSound(state, layerId, soundId, index + (action === 'stack-up' ? -1 : 1));
    } catch (e) { showToast(e.message); return; }
    afterMutate();
    renderGrid();
    renderProperties();
    renderLibrary();
    renderMoodHeader();
    refreshPreviewVisuals();
    var remaining = soundSettingsEl.querySelectorAll('.stack-source');
    var row = action === 'stack-remove' ? remaining[Math.min(index, remaining.length - 1)] :
      soundSettingsEl.querySelector('.stack-source[data-sound-id="' + soundId + '"]');
    if (row) { row.tabIndex = -1; row.focus({preventScroll: true}); }
  }

  function handleStackAdd(layerId) {
    var layer = getLayer(layerId);
    if (!layer) return;
    ui.replaceLayerId = null;
    ui.stackLayerId = layerId;
    showReplacementBar(layerName(layer), true);
    openLibrary(true);
    renderLibrary();
  }

  function handleCancelReplace() {
    var stacking = !!ui.stackLayerId;
    clearLibraryTarget();
    renderLibrary();
    if (stacking) {
      closeLibrary();
      var add = soundSettingsEl.querySelector('[data-action="stack-add"]');
      if (add) add.focus({preventScroll: true});
    }
  }

  function handleAddOrReplaceSound(soundId, disabled) {
    if (disabled) return;
    if (ui.stackLayerId) {
      var target = getLayer(ui.stackLayerId);
      if (!target) { clearLibraryTarget(); renderLibrary(); return; }
      try { MoodState.addLayerSound(state, target.id, soundId); }
      catch (e) { showToast(e.message); return; }
      afterMutate();
      renderGrid();
      renderProperties();
      renderLibrary();
      renderMoodHeader();
      librarySearchEl.focus({preventScroll: true});
      return;
    }
    if (ui.replaceLayerId) {
      var layerId = ui.replaceLayerId;
      try {
        MoodState.updateLayer(state, layerId, { soundId: soundId });
      } catch (e) {
        showToast(e.message);
        return;
      }
      ui.replaceLayerId = null;
      hideReplacementBar();
      afterMutate();
      renderGrid();
      renderProperties();
      renderLibrary();
      return;
    }
    MoodState.addSound(state, soundId);
    afterMutate();
    renderGrid();
    renderProperties();
    renderLibrary();
    renderMoodHeader();
    var card = soundGridEl.querySelector('.sound-card[data-layer-id="' + state.selectedLayerId + '"]');
    if (card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest' });
  }

  function handleActionClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'select-layer') {
      if (e.target.closest('.sound-level')) return;
      selectLayerAction(el.getAttribute('data-layer-id'));
    } else if (action === 'preview-layer') {
      e.stopPropagation();
      togglePreview('layer', el.getAttribute('data-layer-id'));
    } else if (action === 'remove-layer') {
      handleRemoveLayer(el.getAttribute('data-layer-id'));
    } else if (action === 'replace-layer') {
      handleReplaceLayer(el.getAttribute('data-layer-id'));
    } else if (action === 'stack-add') {
      handleStackAdd(el.getAttribute('data-layer-id'));
    } else if (action === 'stack-next') {
      if (!el.disabled) handleStackNext(el.getAttribute('data-layer-id'));
    } else if (action === 'stack-up' || action === 'stack-down' || action === 'stack-remove') {
      if (!el.disabled) handleStackEdit(action, el.getAttribute('data-layer-id'), el.getAttribute('data-sound-id'));
    } else if (action === 'add-sound') {
      handleAddOrReplaceSound(el.getAttribute('data-sound-id'), el.disabled);
    } else if (action === 'audition-sound') {
      togglePreview('library', el.getAttribute('data-sound-id'));
    } else if (action === 'open-library') {
      clearLibraryTarget();
      renderLibrary();
      openLibrary(true);
    } else if (action === 'open-import') {
      openLibrary(false);
      openImportPanel(true);
    }
  }

  function handleRangeInput(e) {
    var el = e.target;
    if (!el.matches || !el.matches('input[type="range"]')) return;
    var field = el.dataset.field;
    var layerId = el.dataset.layerId;
    if (!field || !layerId) return;
    var raw = Number(el.value);
    if (!Number.isFinite(raw)) return;
    MoodState.updateLayer(state, layerId, (function () { var p = {}; p[field] = raw; return p; })());
    syncLayerDisplays(layerId, field);
    afterMutate();
  }

  function handleRotationChange(e) {
    var el = e.target;
    if (!el.matches || !el.matches('select[data-field="rotation"]')) return;
    MoodState.updateLayer(state, el.dataset.layerId, {rotation: el.value});
    var cursor = ui.previewCursors[el.dataset.layerId];
    if (cursor) ui.previewCursors[el.dataset.layerId] = {soundId: cursor.soundId, playedSoundIds: [cursor.soundId]};
    syncLayerDisplays(el.dataset.layerId, 'rotation');
    syncStackPlayback();
    afterMutate();
  }

  function handleCheckboxChange(e) {
    var el = e.target;
    if (!el.matches || !el.matches('input[type="checkbox"]')) return;
    var field = el.dataset.field;
    var layerId = el.dataset.layerId;
    if (!field || !layerId) return;
    MoodState.updateLayer(state, layerId, (function () { var p = {}; p[field] = el.checked; return p; })());
    if (field === 'loop' && el.checked && ui.previewCursors[layerId] === null) delete ui.previewCursors[layerId];
    syncLayerDisplays(layerId, field);
    afterMutate();
    refreshPreviewVisuals();
  }

  // ---------------------------------------------------------------------
  // Import: URL form
  // ---------------------------------------------------------------------

  function handleImportSubmit(e) {
    e.preventDefault();
    var raw = importUrlEl.value.trim();
    var classified = classifyImportUrl(raw);
    if (!classified.ok) {
      importFeedbackEl.textContent = classified.message;
      importUrlEl.setAttribute('aria-invalid', 'true');
      importUrlEl.focus();
      return;
    }
    importUrlEl.removeAttribute('aria-invalid');
    importFeedbackEl.textContent = '';
    var name = importNameEl.value.trim() || classified.defaultName;
    var category = importCategoryEl.value;
    var targetSceneId = state.activeSceneId;
    var targetMoodId = state.activeMoodId;
    var targetMood = MoodState.getMood(state);
    var targetMoodName = targetMood ? targetMood.name : 'this mood';
    var targetStackId = ui.stackLayerId;
    var targetStack = targetStackId && getLayer(targetStackId);
    var targetStackName = targetStack ? layerName(targetStack) : 'your tile';

    importSubmitEl.disabled = true;
    importSubmitEl.setAttribute('aria-busy', 'true');
    importFeedbackEl.textContent = 'Importing (simulated)…';

    setTimeout(function () {
      importSubmitEl.disabled = false;
      importSubmitEl.removeAttribute('aria-busy');

      var savedSceneId = state.activeSceneId;
      var savedMoodId = state.activeMoodId;
      var savedLayerId = state.selectedLayerId;
      var sameContext = savedSceneId === targetSceneId && savedMoodId === targetMoodId;
      var destinationScene = state.scenes.find(function (scene) { return scene.id === targetSceneId; });
      var destinationExists = destinationScene && destinationScene.moods.some(function (mood) { return mood.id === targetMoodId; });

      state.activeSceneId = targetSceneId;
      state.activeMoodId = targetMoodId;

      var newSound = MoodState.importSound(state, {
        name: name, category: category, sourceType: classified.sourceType, source: raw, loop: true,
      });
      var stacked = false;
      if (targetStackId) {
        if (getLayer(targetStackId)) {
          MoodState.addLayerSound(state, targetStackId, newSound.id);
          stacked = true;
        }
      } else if (destinationExists) {
        MoodState.addSound(state, newSound.id);
      }

      if (!sameContext || !destinationExists) {
        state.activeSceneId = savedSceneId;
        state.activeMoodId = savedMoodId;
      }
      if (!sameContext || (targetStackId && savedLayerId !== targetStackId)) state.selectedLayerId = savedLayerId;

      afterMutate();
      renderGrid();
      renderProperties();
      renderLibrary();
      renderMoodHeader();

      importFormEl.reset();
      importCategoryEl.value = category;
      importFeedbackEl.textContent = '';
      closeImportPanel();

      var destination = !destinationExists ? 'your library; the original mood was removed' : (targetStackId ? (stacked ? targetStackName : 'your library; the original tile was removed') : targetMoodName);
      showToast('Imported "' + newSound.name + '" into ' + destination + ' (simulated, nothing downloaded).');
    }, IMPORT_DELAY_MS);
  }

  // ---------------------------------------------------------------------
  // Import: files + drag/drop
  // ---------------------------------------------------------------------

  function importFilesList(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var added = 0;
    var rejected = 0;
    var targetStackId = ui.stackLayerId;
    var targetStack = targetStackId && getLayer(targetStackId);
    files.forEach(function (file) {
      if (!isAudioFile(file)) { rejected++; return; }
      var s = MoodState.importSound(state, {
        name: file.name.replace(/\.[^/.]+$/, ''),
        category: importCategoryEl.value,
        sourceType: 'file',
        source: file.name,
        loop: true,
      });
      if (targetStackId) {
        if (targetStack) MoodState.addLayerSound(state, targetStackId, s.id);
      } else {
        MoodState.addSound(state, s.id);
      }
      added++;
    });
    if (added) {
      afterMutate();
      renderGrid();
      renderProperties();
      renderLibrary();
      renderMoodHeader();
    }
    if (added && !rejected) {
      var destination = targetStack ? ' to ' + layerName(targetStack) : '';
      showToast('Added ' + added + (added === 1 ? ' file' : ' files') + destination + ' (simulated, no upload).');
    } else if (added && rejected) {
      showToast('Added ' + added + ', skipped ' + rejected + ' unsupported file(s).');
    } else if (rejected) {
      showToast('That file type is not supported audio.');
    }
  }

  function handleFileInputChange() {
    importFilesList(fileInputEl.files);
    fileInputEl.value = '';
  }

  function syncExternalState() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
    if (raw === storageSnapshot) return !storageConflict;
    if (MoodState.serializeState(state) !== stateCheckpoint || storageConflict) {
      storageConflict = true;
      renderSaveState();
      showToast('Another tab changed this library. Your changes remain in this tab; reload to use the other version.');
      return false;
    }
    var restored;
    try {
      if (raw === null) restored = MoodState.createState();
      else {
        var parsed = JSON.parse(raw);
        restored = MoodState.restoreState(raw);
        if (JSON.stringify(parsed) !== MoodState.serializeState(restored)) throw new Error('Invalid snapshot');
      }
    } catch (e) {
      storageConflict = true;
      renderSaveState();
      showToast('The shared library could not be read. Your current editor state is preserved.');
      return false;
    }
    var scene = restored.scenes.find(function (item) { return item.id === state.activeSceneId; });
    var mood = scene && scene.moods.find(function (item) { return item.id === state.activeMoodId; });
    if (mood) {
      restored.activeSceneId = scene.id;
      restored.activeMoodId = mood.id;
      restored.selectedLayerId = mood.layers.some(function (layer) { return layer.id === state.selectedLayerId; }) ? state.selectedLayerId : null;
    }
    state = restored;
    storageSnapshot = raw;
    stateCheckpoint = MoodState.serializeState(state);
    storageWritable = true;
    ui.preview = {kind: null, id: null};
    ui.previewCursors = {};
    ui.undoRecord = null;
    clearLibraryTarget();
    renderSceneSelect();
    renderMoodStrip();
    renderMoodHeader();
    renderGrid();
    renderProperties();
    renderLibrary();
    renderSaveState();
    refreshPreviewVisuals();
    return true;
  }

  function hasSound(e) {
    return !!(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], SOUND_MIME) !== -1);
  }

  function hasFiles(e) {
    return !!(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1);
  }

  function handleDragEnter(e) {
    if (!hasFiles(e)) return;
    dragCounter++;
    fileDropOverlayEl.hidden = false;
  }

  function handleDragLeave(e) {
    if (!hasFiles(e)) return;
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) fileDropOverlayEl.hidden = true;
  }

  function handleDragOver(e) {
    if (hasFiles(e) || (hasSound(e) && soundGridEl.contains(e.target))) e.preventDefault();
  }

  function handleDrop(e) {
    if (hasSound(e) && soundGridEl.contains(e.target)) {
      e.preventDefault();
      if (!syncExternalState()) return;
      var soundId = e.dataTransfer.getData(SOUND_MIME);
      var sound = state.library.find(function (item) { return item.id === soundId; });
      if (!sound) { showToast('Sound not found in the shared library.'); return; }
      if (!MoodState.getMood(state)) { showToast('Select a mood before adding a sound.'); return; }
      MoodState.addSound(state, soundId);
      afterMutate();
      renderGrid();
      renderProperties();
      renderLibrary();
      renderMoodHeader();
      return;
    }
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragCounter = 0;
    fileDropOverlayEl.hidden = true;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      importFilesList(e.dataTransfer.files);
    }
  }

  // ---------------------------------------------------------------------
  // Global paste + keyboard
  // ---------------------------------------------------------------------

  function handleGlobalPaste(e) {
    if (isTyping()) return;
    var text = (e.clipboardData && e.clipboardData.getData('text')) || '';
    text = text.trim();
    if (!text) return;
    var classified = classifyImportUrl(text);
    if (!classified.ok) return;
    e.preventDefault();
    importUrlEl.value = text;
    openLibrary(false);
    openImportPanel(true);
  }

  function handleEscape() {
    if (ui.importOpen) { closeImportPanel(); return; }
    if (ui.drawerOpen) { closeLibrary(); return; }
    if (ui.preview.kind) {
      ui.preview = { kind: null, id: null };
      refreshPreviewVisuals();
    }
  }

  function handleGlobalKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      handleSave();
      return;
    }
    if (!isTyping() && e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-4]$/.test(e.code)) {
      var sceneIdx = Number(e.code.slice(5)) - 1;
      if (state.scenes[sceneIdx]) {
        e.preventDefault();
        MoodState.selectScene(state, state.scenes[sceneIdx].id);
        ui.preview = { kind: null, id: null };
        afterContextSwitch();
      }
      return;
    }
    if (e.key === 'Escape') {
      handleEscape();
      return;
    }
    if (!isTyping() && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.key === '/') {
        e.preventDefault();
        librarySearchEl.focus();
        librarySearchEl.select();
        return;
      }
      if (/^[1-8]$/.test(e.key)) {
        var scene = MoodState.getScene(state);
        var moodIdx = Number(e.key) - 1;
        if (scene && scene.moods[moodIdx]) {
          MoodState.selectMood(state, scene.moods[moodIdx].id);
          ui.preview = { kind: null, id: null };
          afterContextSwitch();
        }
        return;
      }
      if (e.key === ' ') {
        var focusedTag = document.activeElement && document.activeElement.tagName;
        if (focusedTag !== 'BUTTON' && focusedTag !== 'A') {
          e.preventDefault();
          var mood = MoodState.getMood(state);
          if (mood && mood.layers.length) togglePreview('mood', mood.id);
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------

  function bindEvents() {
    sceneSelectEl.addEventListener('change', handleSceneChange);
    moodStripEl.addEventListener('click', handleMoodStripClick);
    newMoodEl.addEventListener('click', handleNewMood);
    duplicateMoodEl.addEventListener('click', handleDuplicateMood);
    moodNameEl.addEventListener('input', handleMoodNameInput);
    moodNameEl.addEventListener('blur', handleMoodNameBlur);

    soundGridEl.addEventListener('click', handleActionClick);
    soundGridEl.addEventListener('input', handleRangeInput);
    soundSettingsEl.addEventListener('click', handleActionClick);
    soundSettingsEl.addEventListener('input', handleRangeInput);
    soundSettingsEl.addEventListener('change', handleCheckboxChange);
    soundSettingsEl.addEventListener('change', handleRotationChange);
    libraryResultsEl.addEventListener('click', handleActionClick);

    libraryToggleEl.addEventListener('click', function () {
      if (ui.drawerOpen) closeLibrary(); else openLibrary(true);
    });
    closeLibraryEl.addEventListener('click', closeLibrary);
    cancelReplaceEl.addEventListener('click', handleCancelReplace);

    librarySearchEl.addEventListener('focus', function () { openLibrary(false); });
    librarySearchEl.addEventListener('input', function () {
      ui.query = librarySearchEl.value;
      openLibrary(false);
      renderLibrary();
      persistUi();
    });
    librarySearchEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var classified = classifyImportUrl(librarySearchEl.value);
      if (classified.ok) {
        e.preventDefault();
        importUrlEl.value = librarySearchEl.value.trim();
        openImportPanel(false);
        importNameEl.focus();
      }
    });
    libraryCategoryEl.addEventListener('change', function () {
      ui.category = libraryCategoryEl.value;
      renderLibrary();
      persistUi();
    });

    pasteLinkEl.addEventListener('click', function () {
      openLibrary(false);
      openImportPanel(true);
    });
    filesButtonEl.addEventListener('click', function () {
      openLibrary(false);
      openImportPanel(false);
      fileInputEl.click();
    });
    importFilesEl.addEventListener('click', function (e) {
      e.preventDefault();
      fileInputEl.click();
    });
    closeImportEl.addEventListener('click', closeImportPanel);
    importFormEl.addEventListener('submit', handleImportSubmit);
    fileInputEl.addEventListener('change', handleFileInputChange);

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('focus', syncExternalState);
    window.addEventListener('beforeunload', function (e) {
      if (storageConflict || MoodState.serializeState(state) !== stateCheckpoint) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    window.addEventListener('storage', function (e) {
      if (e.storageArea === localStorage && (e.key === STORAGE_KEY || e.key === null)) syncExternalState();
    });

    previewVolumeEl.addEventListener('input', function () {
      var v = Number(previewVolumeEl.value);
      if (!Number.isFinite(v)) return;
      ui.previewVolume = clampNum(v, 0, 100);
      previewVolumeValueEl.textContent = ui.previewVolume + '%';
      persistUi();
    });
    previewMoodEl.addEventListener('click', function () {
      var mood = MoodState.getMood(state);
      if (!mood || !mood.layers.length) return;
      togglePreview('mood', mood.id);
    });
    saveMoodEl.addEventListener('click', handleSave);

    toastDismissEl.addEventListener('click', hideToast);
    toastActionEl.addEventListener('click', handleUndo);

    document.addEventListener('keydown', handleGlobalKeydown);
  }

  function init() {
    renderSceneSelect();
    renderMoodStrip();
    renderMoodHeader();
    renderGrid();
    renderProperties();
    librarySearchEl.value = ui.query;
    libraryCategoryEl.value = ui.category;
    renderLibrary();
    renderSaveState();
    previewVolumeEl.value = ui.previewVolume;
    previewVolumeValueEl.textContent = ui.previewVolume + '%';
    setDrawerOpen(false);
    refreshPreviewVisuals();
    bindEvents();
  }

  init();
})(typeof window !== 'undefined' ? window : this);
