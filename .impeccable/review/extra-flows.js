async function runExtraFlowChecks() {
  const checks = [];
  const STORAGE_KEY = 'soundscape.mood-prep.v1';

  function assert(name, condition, detail) {
    checks.push({ name: name, pass: !!condition, detail: detail === undefined ? null : String(detail) });
  }
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fire(el, type, opts) {
    var ev = new Event(type, Object.assign({ bubbles: true, cancelable: true }, opts || {}));
    el.dispatchEvent(ev);
    return ev;
  }
  function click(el) { if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function fireRange(el, value) { el.value = String(value); fire(el, 'input'); }
  function fireCheckbox(el, checked) { el.checked = checked; fire(el, 'change'); }
  function keydown(opts) {
    document.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, opts)));
  }
  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }
  function findMood(state, moodId) {
    for (var sc of state.scenes) { for (var m of sc.moods) { if (m.id === moodId) return m; } }
    return null;
  }
  function findLayer(mood, layerId) {
    return mood.layers.find(function (l) { return l.id === layerId; });
  }

  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

  var deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    if (qsa('#moodStrip [data-mood-id]').length > 0) break;
    await wait(50);
  }
  assert('baseline: Tavern Evening active on fresh load', qs('#moodName').value === 'Tavern Evening', qs('#moodName').value);

  // -----------------------------------------------------------------
  // (1) URL import pending, then immediate mood switch -> lands on
  //     the ORIGINAL (target) mood, not the one switched to meanwhile.
  // -----------------------------------------------------------------
  (function () {
    click(qs('#pasteLink'));
    var urlInput = qs('#importUrl');
    var nameInput = qs('#importName');
    urlInput.value = 'https://example.com/pending-import.mp3';
    fire(urlInput, 'input');
    nameInput.value = 'Pending Import Sound';
    fire(nameInput, 'input');
    qs('#importForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    // Switch mood immediately, before the ~500ms simulated import resolves.
    click(qs('#moodStrip [data-mood-id="rain-mood"]'));
  })();
  assert('import-1: UI switched to Rain Rolls In immediately', qs('#moodName').value === 'Rain Rolls In', qs('#moodName').value);

  await wait(900);
  var afterImportState = readState();
  var evening = findMood(afterImportState, 'evening');
  var rainMood = findMood(afterImportState, 'rain-mood');
  var importedInEvening = evening.layers.find(function (l) {
    var snd = afterImportState.library.find(function (s) { return s.id === l.soundId; });
    return snd && snd.source === 'https://example.com/pending-import.mp3';
  });
  var importedInRain = rainMood.layers.find(function (l) {
    var snd = afterImportState.library.find(function (s) { return s.id === l.soundId; });
    return snd && snd.source === 'https://example.com/pending-import.mp3';
  });
  assert('import-1: imported sound landed in original target mood (Tavern Evening)', !!importedInEvening);
  assert('import-1: imported sound did NOT leak into the mood switched to during import', !importedInRain, importedInRain ? importedInRain.id : null);
  assert('import-1: active mood after resolve stays on the mood user switched to', afterImportState.activeMoodId === 'rain-mood', afterImportState.activeMoodId);
  assert('import-1: Rain Rolls In grid still shows only its own sounds (no leaked card)', qsa('#soundGrid .sound-card').length === rainMood.layers.length, qsa('#soundGrid .sound-card').length + ' vs ' + rainMood.layers.length);
  var toastText = (qs('#toastMessage') || {}).textContent || '';
  assert('import-1: toast credits the original mood name, not the one switched to', /Tavern Evening/.test(toastText) && !/Rain Rolls In/.test(toastText), toastText);

  // Back to Tavern Evening for subsequent checks.
  click(qs('#moodStrip [data-mood-id="evening"]'));
  await wait(20);

  // -----------------------------------------------------------------
  // (2) Replace preserves volume/pan/fades of the layer being replaced.
  // -----------------------------------------------------------------
  click(qs('#soundGrid .sound-card[data-layer-id="evening-crowd"]'));
  await wait(20);
  var volRange = qs('#soundSettings input[data-field="volume"]');
  var panRange = qs('#soundSettings input[data-field="pan"]');
  var fiRange = qs('#soundSettings input[data-field="fadeIn"]');
  var foRange = qs('#soundSettings input[data-field="fadeOut"]');
  fireRange(volRange, 77);
  fireRange(panRange, -40);
  fireRange(fiRange, 3);
  fireRange(foRange, 5);
  click(qs('#soundSettings [data-action="replace-layer"][data-layer-id="evening-crowd"]'));
  await wait(20);
  assert('replace-2: library drawer opened for replacement', document.body.classList.contains('library-open'));
  var replaceTarget = qs('#libraryResults [data-sound-id="thunder"][data-action="add-sound"]');
  assert('replace-2: thunder is selectable as a replacement (not already in mood)', !!replaceTarget && !replaceTarget.disabled);
  click(replaceTarget);
  var afterReplace = readState();
  var replacedLayer = findLayer(findMood(afterReplace, 'evening'), 'evening-crowd');
  assert('replace-2: layer id kept, soundId swapped to thunder', replacedLayer && replacedLayer.soundId === 'thunder', JSON.stringify(replacedLayer));
  assert('replace-2: volume preserved after replace', replacedLayer && replacedLayer.volume === 77, replacedLayer && replacedLayer.volume);
  assert('replace-2: pan preserved after replace', replacedLayer && replacedLayer.pan === -40, replacedLayer && replacedLayer.pan);
  assert('replace-2: fadeIn preserved after replace', replacedLayer && replacedLayer.fadeIn === 3, replacedLayer && replacedLayer.fadeIn);
  assert('replace-2: fadeOut preserved after replace', replacedLayer && replacedLayer.fadeOut === 5, replacedLayer && replacedLayer.fadeOut);
  click(qs('#closeLibrary'));

  // -----------------------------------------------------------------
  // (3) Remove + Undo after a mood switch restores to the ORIGINAL mood.
  // -----------------------------------------------------------------
  click(qs('#soundGrid .sound-card[data-layer-id="evening-lute"]'));
  await wait(20);
  click(qs('#soundSettings [data-action="remove-layer"][data-layer-id="evening-lute"]'));
  var midRemoveState = readState();
  // Last Call already contains lute in the seed; compare its full mix before/after.
  var lastCallBeforeUndo = JSON.stringify(findMood(midRemoveState, 'last-call').layers);
  assert('undo-3: lute removed from evening mood', !findLayer(findMood(midRemoveState, 'evening'), 'evening-lute'));
  // Switch away before undoing.
  click(qs('#moodStrip [data-mood-id="last-call"]'));
  await wait(20);
  assert('undo-3: switched to Last Call before undoing', qs('#moodName').value === 'Last Call', qs('#moodName').value);
  var toastActionVisible = !qs('#toastAction').hidden && !qs('#toast').hidden;
  assert('undo-3: undo toast still available after switching moods', toastActionVisible);
  click(qs('#toastAction'));
  var afterUndoState = readState();
  var restoredLute = findLayer(findMood(afterUndoState, 'evening'), 'evening-lute');
  assert('undo-3: lute restored into ORIGINAL (evening) mood, not current (last-call)', !!restoredLute, JSON.stringify(restoredLute));
  assert('undo-3: active mood remains Last Call (undo did not jump the user back)', afterUndoState.activeMoodId === 'last-call', afterUndoState.activeMoodId);
  assert('undo-3: currently active mood is unchanged by undo in another mood', JSON.stringify(findMood(afterUndoState, 'last-call').layers) === lastCallBeforeUndo);

  // -----------------------------------------------------------------
  // (4) File drop: valid + invalid + multiple, with metadata checks.
  // -----------------------------------------------------------------
  click(qs('#moodStrip [data-mood-id="evening"]'));
  await wait(20);
  qs('#importCategory') && (qs('#importCategory').value = 'effects');
  var gridCountBeforeDrop = qsa('#soundGrid .sound-card').length;
  var dropResult = { attempted: false, error: null };
  try {
    var dt = new DataTransfer();
    dt.items.add(new File(['x'], 'crash-sound.mp3', { type: 'audio/mpeg' }));
    dt.items.add(new File(['x'], 'readme.txt', { type: 'text/plain' }));
    dt.items.add(new File(['x'], 'ambient-loop.wav', { type: 'audio/wav' }));
    var dropEvt = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvt, 'dataTransfer', { value: dt });
    window.dispatchEvent(dropEvt);
    dropResult.attempted = true;
  } catch (e) {
    dropResult.error = e.message;
  }
  await wait(20);
  var stateAfterDrop = readState();
  var evAfterDrop = findMood(stateAfterDrop, 'evening');
  assert('filedrop-4: synthetic multi-file drop dispatched', dropResult.attempted, dropResult.error);
  if (dropResult.attempted) {
    assert('filedrop-4: 2 valid audio files added as layers, 1 invalid skipped',
      evAfterDrop.layers.length === gridCountBeforeDrop + 2, 'before=' + gridCountBeforeDrop + ' after=' + evAfterDrop.layers.length);
    var mp3Sound = stateAfterDrop.library.find(function (s) { return s.source === 'crash-sound.mp3'; });
    var wavSound = stateAfterDrop.library.find(function (s) { return s.source === 'ambient-loop.wav'; });
    var txtSound = stateAfterDrop.library.find(function (s) { return s.source === 'readme.txt'; });
    assert('filedrop-4: valid .mp3 imported with derived name + sourceType file + chosen category', mp3Sound && mp3Sound.name === 'crash-sound' && mp3Sound.sourceType === 'file' && mp3Sound.category === 'effects', JSON.stringify(mp3Sound));
    assert('filedrop-4: valid .wav imported with its own metadata', wavSound && wavSound.name === 'ambient-loop' && wavSound.sourceType === 'file', JSON.stringify(wavSound));
    assert('filedrop-4: invalid .txt file was NOT imported into the library', !txtSound);
    var dropToast = (qs('#toastMessage') || {}).textContent || '';
    assert('filedrop-4: toast reports partial success (2 added, 1 skipped)', /2/.test(dropToast) && /1/.test(dropToast) && /skip/i.test(dropToast), dropToast);
  }

  // All-invalid drop: nothing added, distinct toast.
  var gridCountBeforeBadDrop = evAfterDrop ? evAfterDrop.layers.length : gridCountBeforeDrop;
  try {
    var dt2 = new DataTransfer();
    dt2.items.add(new File(['x'], 'document.pdf', { type: 'application/pdf' }));
    var dropEvt2 = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvt2, 'dataTransfer', { value: dt2 });
    window.dispatchEvent(dropEvt2);
  } catch (e) {}
  await wait(20);
  var stateAfterBadDrop = readState();
  assert('filedrop-4: all-invalid drop adds nothing', findMood(stateAfterBadDrop, 'evening').layers.length === gridCountBeforeBadDrop);
  var badDropToast = (qs('#toastMessage') || {}).textContent || '';
  assert('filedrop-4: all-invalid drop shows an unsupported-type toast', /not supported/i.test(badDropToast), badDropToast);

  // -----------------------------------------------------------------
  // (5) Keyboard: search focus, Escape stack, Cmd+S, typing guard.
  // -----------------------------------------------------------------
  document.activeElement && document.activeElement.blur();
  keydown({ key: '/' });
  assert('kbd-5: "/" focuses library search when not typing', document.activeElement === qs('#librarySearch'));
  qs('#librarySearch').blur();

  var sceneForDigits = readState();
  var moodBeforeDigit = sceneForDigits.activeMoodId;
  keydown({ key: '2' });
  var afterDigit = readState();
  assert('kbd-5: digit key switches mood when not typing', afterDigit.activeMoodId !== moodBeforeDigit && afterDigit.activeMoodId === 'rain-mood', afterDigit.activeMoodId);

  // Typing guard: focus mood name, press a digit, must NOT switch mood.
  click(qs('#moodStrip [data-mood-id="evening"]'));
  await wait(20);
  var moodNameEl = qs('#moodName');
  moodNameEl.focus();
  var moodBeforeTypedDigit = readState().activeMoodId;
  keydown({ key: '3' });
  var afterTypedDigit = readState();
  assert('kbd-5: digit key ignored while typing in mood name (typing guard)', afterTypedDigit.activeMoodId === moodBeforeTypedDigit, afterTypedDigit.activeMoodId);
  var slashBefore = document.activeElement;
  keydown({ key: '/' });
  assert('kbd-5: "/" does not steal focus while typing in an input', document.activeElement === moodNameEl, document.activeElement && document.activeElement.id);

  // Desktop Escape priority: import > drawer > preview; properties remain visible.
  click(qs('#pasteLink'));
  var mood = readState();
  var moodObj = findMood(mood, mood.activeMoodId);
  if (moodObj.layers.length) click(qs('#soundGrid .sound-card[data-layer-id="' + moodObj.layers[0].id + '"] .tile-listen'));
  moodNameEl.blur();
  assert('kbd-5: import panel open before Escape sequence', !qs('#importPanel').hidden);
  keydown({ key: 'Escape' });
  assert('kbd-5: Escape #1 closes import panel first', qs('#importPanel').hidden);
  assert('kbd-5: Escape #1 leaves drawer open', document.body.classList.contains('library-open'));
  keydown({ key: 'Escape' });
  assert('kbd-5: Escape #2 closes the library drawer next', !document.body.classList.contains('library-open'));
  assert('kbd-5: sound properties remain a persistent desktop pane', getComputedStyle(qs('#soundPanel')).display !== 'none');
  keydown({ key: 'Escape' });
  assert('kbd-5: Escape #3 stops the remaining sound preview', !qs('#soundGrid .tile-listen[aria-pressed="true"]'));

  // Cmd+S saves even while a text field is focused.
  moodNameEl.focus();
  moodNameEl.value = 'Tavern Evening (edited)';
  fire(moodNameEl, 'input');
  var dirtyBeforeSave = qs('#saveState').textContent;
  keydown({ key: 's', metaKey: true });
  var cleanAfterSave = qs('#saveState').textContent;
  assert('kbd-5: edit marks state dirty before Cmd+S', /unsaved/i.test(dirtyBeforeSave), dirtyBeforeSave);
  assert('kbd-5: Cmd+S saves while input is focused (no typing guard on save)', /saved/i.test(cleanAfterSave) && !/unsaved/i.test(cleanAfterSave), cleanAfterSave);

  // -----------------------------------------------------------------
  // (6) "Reload" preserves drafts: serialized draft rehydrates identically.
  //     (Cannot navigate from inside this eval context, so this verifies
  //     the exact mechanism a real reload relies on: persistDraft's
  //     localStorage write + MoodState.restoreState on the next boot.)
  // -----------------------------------------------------------------
  click(qs('#soundGrid .sound-card[data-layer-id="evening-hearth"]'));
  await wait(20);
  var hearthVol = qs('#soundSettings input[data-field="volume"]');
  fireRange(hearthVol, 91);
  var preReloadSerialized = localStorage.getItem(STORAGE_KEY);
  assert('reload-6: draft persisted to localStorage after mutation', !!preReloadSerialized && /91/.test(preReloadSerialized));
  var rehydrated = window.MoodState.restoreState(preReloadSerialized);
  var liveNow = JSON.parse(preReloadSerialized);
  assert('reload-6: MoodState.restoreState reproduces identical scenes/library from the persisted draft',
    JSON.stringify(rehydrated.scenes) === JSON.stringify(liveNow.scenes) && JSON.stringify(rehydrated.library) === JSON.stringify(liveNow.library));
  assert('reload-6: rehydrated draft keeps the same active scene/mood/selection',
    rehydrated.activeSceneId === liveNow.activeSceneId && rehydrated.activeMoodId === liveNow.activeMoodId && rehydrated.selectedLayerId === liveNow.selectedLayerId);
  var rehydratedHearth = findLayer(findMood(rehydrated, rehydrated.activeMoodId), 'evening-hearth');
  assert('reload-6: edited volume (91) survives the restoreState round-trip', rehydratedHearth && rehydratedHearth.volume === 91, rehydratedHearth && rehydratedHearth.volume);
  // Corrupt-draft resilience: garbage in storage should fall back to a fresh, valid state rather than throwing.
  var fallback = window.MoodState.restoreState('{not json');
  assert('reload-6: corrupted localStorage value falls back to a fresh valid state (no throw)', fallback && fallback.version === 1 && Array.isArray(fallback.scenes));

  // -----------------------------------------------------------------
  // (7) No unintended media/network downloads during import/drop flows.
  // -----------------------------------------------------------------
  var fetchCalls = [];
  var xhrCalls = [];
  var origFetch = window.fetch;
  var origXhrOpen = XMLHttpRequest.prototype.open;
  window.fetch = function () { fetchCalls.push(Array.prototype.slice.call(arguments)); return origFetch ? origFetch.apply(this, arguments) : Promise.reject(new Error('no fetch')); };
  XMLHttpRequest.prototype.open = function () { xhrCalls.push(Array.prototype.slice.call(arguments)); return origXhrOpen.apply(this, arguments); };
  try {
    click(qs('#pasteLink'));
    var netUrlInput = qs('#importUrl');
    netUrlInput.value = 'https://example.com/network-check.mp3';
    fire(netUrlInput, 'input');
    qs('#importForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await wait(700);
    var dt3 = new DataTransfer();
    dt3.items.add(new File(['x'], 'network-check.wav', { type: 'audio/wav' }));
    var dropEvt3 = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvt3, 'dataTransfer', { value: dt3 });
    window.dispatchEvent(dropEvt3);
    await wait(50);
  } finally {
    window.fetch = origFetch;
    XMLHttpRequest.prototype.open = origXhrOpen;
  }
  assert('network-7: URL import + file drop issue zero fetch() calls', fetchCalls.length === 0, JSON.stringify(fetchCalls));
  assert('network-7: URL import + file drop issue zero XHR requests', xhrCalls.length === 0, JSON.stringify(xhrCalls));
  var mediaEls = qsa('audio,video');
  assert('network-7: no <audio>/<video> elements were created by import/drop', mediaEls.length === 0, mediaEls.length);
  var resourceEntries = (performance.getEntriesByType('resource') || []).map(function (e) { return e.name; });
  var suspiciousFetches = resourceEntries.filter(function (n) { return /example\.com|crash-sound|ambient-loop|network-check|blob:/.test(n); });
  assert('network-7: no network/resource entries for the imported/dropped sound sources', suspiciousFetches.length === 0, JSON.stringify(suspiciousFetches));

  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

  var failed = checks.filter(function (c) { return !c.pass; });
  return { ok: failed.length === 0, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks: checks };
}
