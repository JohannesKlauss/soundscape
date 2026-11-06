(function () {
  'use strict';

  var Mood = window.MoodState;
  var Library = window.LibraryState;
  var key = 'soundscape.mood-prep.v1';
  var dragType = 'application/x-soundscape-sound';
  var examples = [
    { id: 'rain-roof', name: 'Rain on a roof', tags: ['rain', 'weather', 'ambience'], category: 'ambience' },
    { id: 'forest-night', name: 'Forest at night', tags: ['forest', 'night', 'ambience'], category: 'ambience' },
    { id: 'tavern-crowd', name: 'Tavern crowd', tags: ['tavern', 'crowd', 'voices'], category: 'ambience' },
    { id: 'fireplace', name: 'Crackling fire', tags: ['fire', 'hearth', 'tavern'], category: 'ambience' },
    { id: 'waves', name: 'Waves on shore', tags: ['waves', 'sea', 'water'], category: 'ambience' },
    { id: 'thunder', name: 'Distant thunder', tags: ['thunder', 'storm', 'rain'], category: 'effects' },
    { id: 'footsteps', name: 'Stone footsteps', tags: ['footsteps', 'dungeon', 'stone'], category: 'effects' },
    { id: 'lute', name: 'Lute melody', tags: ['lute', 'music', 'tavern'], category: 'music' }
  ];
  var state;
  var writable = true;
  var inspected = null;
  var nameDraftSound = null;
  var nameDraftDirty = false;
  var displayedMood = null;
  var selected = new Set();
  var preview = null;
  var filter = 'all';
  var bulkOpen = false;
  var tagOpen = false;
  var dragDepth = 0;
  var $ = function (id) { return document.getElementById(id); };

  function restore(raw) {
    if (!raw) return Library.createState();
    var parsed = JSON.parse(raw);
    var restored = Library.restoreState(raw);
    if (JSON.stringify(parsed) !== Library.serializeState(restored)) throw new Error('Invalid shared snapshot');
    return restored;
  }
  function load() {
    try {
      return restore(localStorage.getItem(key));
    } catch (e) {
      writable = false;
      return Library.createState();
    }
  }
  state = load();

  function toast(message) {
    $('toastMessage').textContent = message;
    $('toast').hidden = false;
  }
  function sync() {
    if (!writable) return;
    try {
      var raw = localStorage.getItem(key);
      state = restore(raw);
    } catch (e) {
      writable = false;
      toast('Browser storage is unavailable or the shared snapshot is invalid. Changes last only in this tab.');
    }
  }
  function change(operation) {
    sync();
    try {
      var result = operation();
      try {
        if (!writable) throw new Error('Storage unavailable');
        localStorage.setItem(key, Library.serializeState(state));
      } catch (e) {
        writable = false;
        toast('Browser storage is unavailable or the shared snapshot is invalid. Changes last only in this tab.');
      }
      return { result: result, persisted: writable };
    } catch (e) {
      toast(e.message === 'Sound is referenced by a mood' ? 'Cannot delete: this sound is used by a mood or a saved mood baseline. Remove it from both and save the mood first.' : e.message);
      render();
      return null;
    }
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(text, className, action, label) {
    var node = el('button', className, text);
    node.type = 'button';
    if (action) node.dataset.action = action;
    if (label) node.setAttribute('aria-label', label);
    return node;
  }
  function previewIcon(playing) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var shape = document.createElementNS(ns, playing ? 'rect' : 'use');
    if (playing) {
      shape.setAttribute('x', '6'); shape.setAttribute('y', '6');
      shape.setAttribute('width', '12'); shape.setAttribute('height', '12');
    } else shape.setAttribute('href', '#i-play');
    svg.appendChild(shape);
    return svg;
  }
  function categoryName(category) {
    return category === 'effects' ? 'Effects' : category.charAt(0).toUpperCase() + category.slice(1);
  }
  function sourceName(sound) {
    return ({ demo: 'Demo sound', file: 'File metadata', url: 'Link metadata', youtube: 'YouTube metadata', freesound: 'Simulated Freesound' })[sound.sourceType] || sound.sourceType;
  }
  function formatDate(sound) {
    if (!sound.addedAt) return '—';
    var date = new Date(sound.addedAt);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  }
  function soundById(id) { return state.library.find(function (s) { return s.id === id; }); }
  function togglePreview(kind, id) {
    var next = kind + ':' + id;
    preview = preview === next ? null : next;
    render();
  }
  function tagList(container, tags, action) {
    container.replaceChildren();
    tags.forEach(function (tag) {
      var item = action ? button(tag + ' ×', 'tag', action, 'Remove tag ' + tag) : el('span', 'tag', tag);
      if (action) item.dataset.tag = tag;
      container.appendChild(item);
    });
    if (!tags.length) container.appendChild(el('span', '', 'No tags'));
  }
  function validTags(sound) {
    return (Array.isArray(sound.tags) ? sound.tags : []).filter(function (tag) { return typeof tag === 'string' && tag.trim(); });
  }
  function sortedTags(sound) {
    return validTags(sound).sort(function (a, b) {
      var left = a.toLowerCase();
      var right = b.toLowerCase();
      return left < right ? -1 : left > right ? 1 : 0;
    });
  }
  function tagGradient(tags) {
    if (!tags.length) return '';
    var stops = tags.map(function (tag, index) {
      var hash = 2166136261;
      Array.from(tag.toLowerCase()).forEach(function (character) {
        hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
      });
      var color = 'hsl(' + ((hash >>> 0) % 360) + ' 65% 65%)';
      return color + ' ' + (index * 100 / tags.length) + '% ' + ((index + 1) * 100 / tags.length) + '%';
    });
    return 'linear-gradient(120deg, ' + stops.join(', ') + ')';
  }
  function localResults() {
    var category = filter === 'recent' ? 'all' : filter;
    var results = Library.searchLibrary(state, $('librarySearch').value, category);
    if (filter === 'recent' || $('sortSounds').value === 'recent') {
      results.sort(function (a, b) { return (b.addedAt || '').localeCompare(a.addedAt || '') || a.name.localeCompare(b.name); });
    } else results.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return results;
  }
  function renderLocal() {
    var category = filter === 'recent' ? 'all' : filter;
    var results = localResults();
    $('localResults').replaceChildren();
    results.forEach(function (sound) {
      var row = el('tr', sound.id === inspected ? 'is-inspected' : '');
      var tags = sortedTags(sound);
      if (tags.length) row.style.setProperty('--tag-gradient', tagGradient(tags));
      row.dataset.soundId = sound.id;
      row.draggable = true;
      row.title = 'Drag this local sound to the mood editor';
      var selectCell = el('td');
      var checkbox = el('input');
      checkbox.type = 'checkbox'; checkbox.dataset.action = 'select'; checkbox.checked = selected.has(sound.id);
      checkbox.setAttribute('aria-label', 'Select ' + sound.name);
      selectCell.appendChild(checkbox); row.appendChild(selectCell);
      var previewCell = el('td');
      var playing = preview === 'local:' + sound.id;
      var play = button('', 'play-button', 'preview', (playing ? 'Stop simulated preview of ' : 'Simulate preview of ') + sound.name);
      play.appendChild(previewIcon(playing));
      play.setAttribute('aria-pressed', String(playing));
      previewCell.appendChild(play); row.appendChild(previewCell);
      var nameCell = el('td');
      var inspect = button('', 'sound-select', 'inspect');
      inspect.setAttribute('aria-pressed', String(sound.id === inspected));
      inspect.appendChild(el('strong', '', sound.name));
      inspect.appendChild(el('small', '', sourceName(sound) + (tags.length ? ' · ' + tags.join(', ') : ' · No tags')));
      nameCell.appendChild(inspect); row.appendChild(nameCell);
      row.appendChild(el('td', '', categoryName(sound.category)));
      row.appendChild(el('td', '', '—'));
      row.appendChild(el('td', '', formatDate(sound)));
      $('localResults').appendChild(row);
    });
    $('localEmpty').hidden = results.length > 0;
    $('localCount').textContent = results.length + (results.length === 1 ? ' sound' : ' sounds');
    $('sidebarCount').textContent = state.library.length;
    $('libraryStatus').textContent = 'Sound library · ' + state.library.length + ' sounds · ' + (writable ? 'metadata stored locally' : 'this tab only');
    $('selectionBar').hidden = !selected.size;
    $('selectionCount').textContent = selected.size + ' selected';
    $('bulkTagEditor').hidden = !selected.size || !bulkOpen;
    $('bulkTagsButton').setAttribute('aria-expanded', String(bulkOpen && selected.size > 0));
    var tags = [];
    state.library.forEach(function (sound) {
      if (selected.has(sound.id)) validTags(sound).forEach(function (tag) {
        if (!tags.some(function (t) { return t.toLowerCase() === tag.toLowerCase(); })) tags.push(tag);
      });
    });
    tagList($('bulkTags'), tags, 'remove-bulk-tag');
    document.querySelectorAll('[data-library-filter]').forEach(function (node) {
      node.setAttribute('aria-pressed', String(node.dataset.libraryFilter === filter));
    });
    $('typeFilter').value = category;
  }
  function renderRemote() {
    var query = $('librarySearch').value.trim();
    var results = query ? Library.searchFreesound(examples, query) : [];
    var container = $('freesoundResults');
    container.replaceChildren();
    if (!results.length) container.appendChild(el('p', 'empty-state', query ? 'No simulated Freesound results match this search.' : 'Enter a search term to find simulated results.'));
    results.forEach(function (result) {
      var row = el('div', 'selection-bar');
      row.dataset.remoteId = result.id;
      var playing = preview === 'remote:' + result.id;
      var play = button('', 'play-button', 'remote-preview', (playing ? 'Stop simulated preview of ' : 'Simulate preview of ') + result.name);
      play.appendChild(previewIcon(playing));
      play.setAttribute('aria-pressed', String(playing));
      row.appendChild(play);
      row.appendChild(el('span', '', result.name + ' · Simulated Freesound · ' + result.tags.join(', ')));
      var imported = state.library.some(function (s) { return s.sourceType === 'freesound' && s.sourceId === result.id; });
      var download = button(imported ? 'In library' : 'Add simulated download', '', 'remote-add');
      download.disabled = imported;
      row.appendChild(download);
      container.appendChild(row);
    });
    $('freesoundStatus').textContent = query ? results.length + ' simulated results · no audio or network' : '';
  }
  function renderInspector() {
    var sound = soundById(inspected);
    $('inspectorContent').hidden = !sound;
    $('inspectorEmpty').hidden = !!sound;
    $('selectedStatus').textContent = sound ? 'Selected: ' + sound.name : 'No sound selected';
    if (!sound) return;
    $('inspectorName').textContent = sound.name;
    $('inspectorSummary').textContent = categoryName(sound.category) + ' · ' + sourceName(sound);
    if (nameDraftSound !== sound.id || !nameDraftDirty) {
      $('soundName').value = sound.name;
      nameDraftSound = sound.id;
      nameDraftDirty = false;
    }
    $('detailFile').textContent = sound.source || '—';
    $('detailDuration').textContent = 'Not available';
    $('detailFormat').textContent = 'Not available';
    $('detailSize').textContent = 'Not stored';
    $('detailAdded').textContent = formatDate(sound);
    var playing = preview === 'local:' + sound.id;
    $('inspectorPreview').replaceChildren(previewIcon(playing));
    $('inspectorPreview').setAttribute('aria-label', (playing ? 'Stop simulated preview of ' : 'Simulate preview of ') + sound.name);
    $('inspectorPreview').setAttribute('aria-pressed', String(playing));
    $('previewStatus').textContent = playing ? 'Simulated preview · no audio' : 'Preview is simulated · no audio';
    $('previewTime').textContent = '—';
    var tags = validTags(sound);
    tagList($('inspectorTags'), tags);
    tagList($('editableTags'), tags, 'remove-tag');
    $('tagEditor').hidden = !tagOpen;
    $('editTags').setAttribute('aria-expanded', String(tagOpen));
    var mood = Mood.getMood(state);
    displayedMood = mood ? { sceneId: state.activeSceneId, id: mood.id, name: mood.name } : null;
    $('addToSoundboard').disabled = !mood;
    $('addToSoundboard').textContent = mood ? 'Add to ' + mood.name : 'No mood selected';
  }
  function render() {
    selected.forEach(function (id) { if (!soundById(id)) selected.delete(id); });
    renderLocal(); renderRemote(); renderInspector();
  }
  function validateTagMetadata(ids) {
    ids.forEach(function (id) {
      var sound = soundById(id);
      if (sound && sound.tags != null && (!Array.isArray(sound.tags) || sound.tags.some(function (tag) { return typeof tag !== 'string'; }))) {
        throw new Error('Cannot edit tags: a selected sound has invalid tag metadata.');
      }
    });
  }
  function addTag(input, ids) {
    var value = input.value.trim();
    if (!value) { toast('Enter a tag first.'); return; }
    if (change(function () { validateTagMetadata(ids); return Library.addTags(state, ids, [value]); })) {
      input.value = '';
      render();
    }
  }
  function importFiles(files) {
    var accepted = Array.from(files).filter(function (file) {
      return file.type.indexOf('audio/') === 0 || /\.(wav|mp3|ogg|flac|m4a|aac|aif|aiff)$/i.test(file.name);
    });
    if (!accepted.length) { toast('Choose audio files to import.'); return; }
    var outcome = change(function () {
      return accepted.map(function (file) {
        var sound = Library.importSound(state, { name: file.name.replace(/\.[^.]+$/, '') || file.name, category: 'effects', sourceType: 'file', source: file.name });
        sound.addedAt = new Date().toISOString();
        return sound;
      });
    });
    if (!outcome) return;
    inspected = outcome.result[0].id;
    render();
    if (outcome.persisted) toast(accepted.length + ' file metadata imported. Audio is not stored.' + (accepted.length < files.length ? ' Non-audio files were skipped.' : ''));
  }
  $('librarySearch').addEventListener('input', render);
  $('typeFilter').addEventListener('change', function () { filter = this.value; render(); });
  $('sortSounds').addEventListener('change', render);
  document.querySelectorAll('[data-library-filter]').forEach(function (node) {
    node.addEventListener('click', function () { filter = node.dataset.libraryFilter; render(); });
  });
  $('localResults').addEventListener('change', function (event) {
    var row = event.target.closest('[data-sound-id]');
    if (!row || event.target.dataset.action !== 'select') return;
    if (event.target.checked) selected.add(row.dataset.soundId); else selected.delete(row.dataset.soundId);
    render();
  });
  $('localResults').addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    var row = event.target.closest('[data-sound-id]');
    if (!target || !row) return;
    if (target.dataset.action === 'inspect') {
      inspected = row.dataset.soundId; tagOpen = false; $('deleteConfirm').hidden = true; $('openEditor').hidden = true; render();
    } else if (target.dataset.action === 'preview') togglePreview('local', row.dataset.soundId);
  });
  $('localResults').addEventListener('dragstart', function (event) {
    var row = event.target.closest('[data-sound-id]');
    if (!row || !event.dataTransfer) return;
    event.dataTransfer.setData(dragType, row.dataset.soundId);
    event.dataTransfer.effectAllowed = 'copy';
  });
  $('freesoundResults').addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    var row = event.target.closest('[data-remote-id]');
    if (!target || !row) return;
    var result = examples.find(function (item) { return item.id === row.dataset.remoteId; });
    if (target.dataset.action === 'remote-preview') { togglePreview('remote', result.id); return; }
    var outcome = change(function () {
      var sound = Library.importFreesound(state, result, { category: result.category, loop: result.category !== 'effects' });
      if (!sound.addedAt) sound.addedAt = new Date().toISOString();
      return sound;
    });
    if (outcome) {
      inspected = outcome.result.id; render();
      if (outcome.persisted) toast('Simulated Freesound result added. No audio was downloaded.');
    }
  });
  $('inspectorPreview').addEventListener('click', function () { if (inspected) togglePreview('local', inspected); });
  $('bulkTagsButton').addEventListener('click', function () { bulkOpen = !bulkOpen; render(); });
  $('clearSelection').addEventListener('click', function () { selected.clear(); bulkOpen = false; render(); });
  $('applyBulkTag').addEventListener('click', function () { addTag($('bulkTagInput'), Array.from(selected)); });
  $('editTags').addEventListener('click', function () { tagOpen = !tagOpen; render(); });
  $('addTag').addEventListener('click', function () { addTag($('tagInput'), [inspected]); });
  function removeTag(event, ids) {
    var target = event.target.closest('[data-tag]');
    if (!target) return;
    if (change(function () { validateTagMetadata(ids); return Library.removeTags(state, ids, [target.dataset.tag]); })) render();
  }
  $('editableTags').addEventListener('click', function (event) { removeTag(event, [inspected]); });
  $('bulkTags').addEventListener('click', function (event) { removeTag(event, Array.from(selected)); });
  $('soundName').addEventListener('input', function () { nameDraftDirty = true; });
  $('renameForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var name = $('soundName').value;
    var outcome = change(function () { return Library.renameSound(state, inspected, name); });
    if (outcome) { nameDraftDirty = false; render(); if (outcome.persisted) toast('Sound renamed.'); }
  });
  $('deleteSound').addEventListener('click', function () { $('deleteConfirm').hidden = false; this.setAttribute('aria-expanded', 'true'); });
  $('cancelDelete').addEventListener('click', function () { $('deleteConfirm').hidden = true; $('deleteSound').setAttribute('aria-expanded', 'false'); });
  $('confirmDelete').addEventListener('click', function () {
    var outcome = change(function () { return Library.deleteSound(state, inspected); });
    if (!outcome) return;
    selected.delete(inspected); inspected = null; preview = null; $('deleteConfirm').hidden = true;
    $('deleteSound').setAttribute('aria-expanded', 'false'); render();
    if (outcome.persisted) toast('Sound deleted.');
  });
  $('addToSoundboard').addEventListener('click', function () {
    var destination = displayedMood;
    var outcome = change(function () {
      var mood = Mood.getMood(state);
      if (!mood) throw new Error('Select a mood in the editor first.');
      if (!destination || destination.sceneId !== state.activeSceneId || destination.id !== mood.id || destination.name !== mood.name) {
        throw new Error('The selected mood changed. Review the destination and try again.');
      }
      var existing = mood.layers.some(function (layer) { return layer.soundId === inspected || (layer.additionalSoundIds || []).indexOf(inspected) !== -1; });
      Mood.addSound(state, inspected);
      return { name: mood.name, existing: existing };
    });
    if (!outcome) return;
    $('openEditor').hidden = !outcome.persisted;
    render();
    if (outcome.persisted) toast(outcome.result.existing ? 'Sound already in ' + outcome.result.name + '. Open the mood editor.' : 'Added to ' + outcome.result.name + '. Open the mood editor to save the mood.');
  });
  $('filesButton').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function () { importFiles(this.files); this.value = ''; });
  $('linkButton').addEventListener('click', function () { $('linkImport').hidden = false; this.setAttribute('aria-expanded', 'true'); $('importUrl').focus(); });
  $('closeImport').addEventListener('click', function () { $('linkImport').hidden = true; $('linkButton').setAttribute('aria-expanded', 'false'); $('importFeedback').textContent = ''; });
  $('importForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var url;
    try {
      url = new URL($('importUrl').value.trim());
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error();
    } catch (e) { $('importFeedback').textContent = 'Enter a valid http or https URL without credentials.'; return; }
    var youtube = /^(www\.|m\.)?(youtube\.com|youtu\.be)$/i.test(url.hostname);
    var filename = url.pathname.split('/').pop();
    try { filename = decodeURIComponent(filename); } catch (e) { filename = ''; }
    var name = youtube ? 'YouTube import' : filename.replace(/\.[^.]+$/, '') || 'Audio link';
    var outcome = change(function () {
      var sound = Library.importSound(state, { name: name, category: 'effects', sourceType: youtube ? 'youtube' : 'url', source: url.href });
      sound.addedAt = new Date().toISOString();
      return sound;
    });
    if (!outcome) return;
    inspected = outcome.result.id; $('importUrl').value = ''; $('importFeedback').textContent = 'Metadata added only; no audio was downloaded.'; render();
    if (outcome.persisted) toast('Link metadata imported. No audio was downloaded.');
  });
  function hasFiles(event) { return event.dataTransfer && Array.from(event.dataTransfer.types).indexOf('Files') !== -1; }
  window.addEventListener('dragenter', function (event) { if (hasFiles(event)) { event.preventDefault(); dragDepth++; $('fileDropOverlay').hidden = false; } });
  window.addEventListener('dragleave', function (event) { if (hasFiles(event)) { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('fileDropOverlay').hidden = true; } });
  window.addEventListener('dragover', function (event) { if (hasFiles(event)) event.preventDefault(); });
  window.addEventListener('drop', function (event) { if (hasFiles(event)) { event.preventDefault(); dragDepth = 0; $('fileDropOverlay').hidden = true; importFiles(event.dataTransfer.files); } });
  window.addEventListener('storage', function (event) { if ((event.key === key || event.key === null) && writable) { sync(); render(); } });
  $('toastDismiss').addEventListener('click', function () { $('toast').hidden = true; });
  var initialResults = localResults();
  inspected = initialResults.length ? initialResults[0].id : null;
  render();
  if (!writable) toast('Browser storage is unavailable or the shared snapshot is invalid. Changes last only in this tab.');
})();
