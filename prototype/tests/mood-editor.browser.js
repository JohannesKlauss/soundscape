// DOM smoke test for the mood editor controller.
// Not a unit test file for a test runner: this file's entire contents are
// a single named async function, meant to be loaded directly via
// chrome-devtools `evaluate_script` with format: "function" and
// sourcePath pointing at this file. It drives the live DOM of
// mood-editor.html (already loaded in the target page) and returns a
// structured pass/fail report instead of throwing, so one evaluate_script
// call reports every assertion.
//
// Usage (chrome-devtools MCP):
//   evaluate_script({ pageId, format: 'function',
//     sourcePath: 'prototype/tests/mood-editor.browser.js' })
//
// Takes no arguments; reads `window`/`document` directly and uses
// `localStorage` for persistence checks. Clears localStorage for the
// current origin before and after running so repeat runs start clean.
// The caller is responsible for (re)loading mood-editor.html before
// invoking this, so the controller boots fresh.

async function runMoodEditorSmoke() {
  const results = [];
  const STORAGE_KEY = 'soundscape.mood-prep.v1';

  function record(name, pass, detail) {
    results.push({ name: name, pass: !!pass, detail: detail === undefined ? null : String(detail) });
  }

  function assert(name, condition, detail) {
    record(name, condition, detail);
  }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function fireEvent(el, type, opts) {
    var EventCtor = (type === 'input' || type === 'change') ? Event : Event;
    var ev = new EventCtor(type, Object.assign({ bubbles: true, cancelable: true }, opts || {}));
    el.dispatchEvent(ev);
    return ev;
  }

  function clickAction(container, selector) {
    var el = typeof container === 'string' ? qs(container) : container;
    var target = selector ? el.querySelector(selector) : el;
    if (!target) return false;
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  // Reload the page fresh so the controller boots against a clean storage
  // key and the current DOM/script state, then wait for initial render.
  // We cannot navigate from inside the evaluated script, so we assume the
  // caller has already loaded (or reloaded) mood-editor.html immediately
  // before invoking this function. We just wait for the strip to populate.

  var deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    var strip = qs('#moodStrip');
    if (strip && strip.querySelectorAll('[data-mood-id]').length > 0) break;
    await wait(50);
  }

  // --- Initial render: 3 moods in strip, 5 cards in grid for Tavern Evening
  var moodButtons = qsa('#moodStrip [data-mood-id]');
  assert('initial moodStrip has 3 moods', moodButtons.length === 3, 'found ' + moodButtons.length);

  var cards = qsa('#soundGrid .sound-card');
  assert('initial soundGrid has 5 cards', cards.length === 5, 'found ' + cards.length);

  var moodNameInput = qs('#moodName');
  assert('moodName shows Tavern Evening', moodNameInput && moodNameInput.value === 'Tavern Evening', moodNameInput && moodNameInput.value);

  // --- Search opens drawer and filters results
  var librarySearch = qs('#librarySearch');
  var libraryDrawer = qs('#libraryDrawer');
  librarySearch.focus();
  fireEvent(librarySearch, 'focus');
  librarySearch.value = 'rain';
  fireEvent(librarySearch, 'input');

  assert('searching opens the library drawer', document.body.classList.contains('library-open'));
  assert('open drawer is not inert', libraryDrawer.inert === false, 'inert=' + libraryDrawer.inert);

  var visibleLibraryItems = qsa('#libraryResults .library-item');
  var rainMatches = visibleLibraryItems.filter(function (item) {
    return /rain/i.test(item.textContent || '');
  });
  assert('search "rain" filters library results', visibleLibraryItems.length > 0 && visibleLibraryItems.length === rainMatches.length,
    'visible=' + visibleLibraryItems.length + ' matching=' + rainMatches.length);

  // --- Add sound: adds a 6th card without losing the active query
  // "Rain on Roof" is already a layer in Tavern Evening (per seed data) would
  // be a dup; use a sound guaranteed not yet in the mood: clear search and
  // search a sound not in the Tavern Evening mood (e.g. "waves").
  librarySearch.value = 'waves';
  fireEvent(librarySearch, 'input');
  var wavesRow = qsa('#libraryResults .library-item').find(function (item) {
    return /waves/i.test(item.textContent || '');
  });
  assert('found a non-dup library row for "waves"', !!wavesRow);
  if (wavesRow) {
    var addBtn = wavesRow.querySelector('button.library-add');
    assert('waves row has an Add button', !!addBtn);
    if (addBtn) addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  var cardsAfterAdd = qsa('#soundGrid .sound-card');
  assert('adding a sound yields a 6th card', cardsAfterAdd.length === 6, 'found ' + cardsAfterAdd.length);
  assert('search query is preserved after add', qs('#librarySearch').value === 'waves', qs('#librarySearch').value);

  // --- Volume change persists across mood switches (slider -> switch -> back)
  // Re-query live DOM: prior steps triggered full grid re-renders (add sound),
  // so any node captured earlier would be stale/detached.
  var firstCard = qsa('#soundGrid .sound-card')[0];
  var firstCardId = firstCard && firstCard.getAttribute('data-layer-id');
  var range = firstCard && firstCard.querySelector('input[type="range"][data-field="volume"]');
  assert('first card has a volume range input', !!range);
  if (range) {
    range.value = '13';
    fireEvent(range, 'input');
  }

  var sceneMoodButtons = qsa('#moodStrip [data-mood-id]');
  var otherMoodBtn = sceneMoodButtons.find(function (b) { return b.getAttribute('data-mood-id') !== moodButtons[0].getAttribute('data-mood-id'); });
  assert('a second mood button exists to switch to', !!otherMoodBtn);
  if (otherMoodBtn) {
    otherMoodBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    var backMoodBtn = qsa('#moodStrip [data-mood-id]').find(function (b) { return b.getAttribute('data-mood-id') === moodButtons[0].getAttribute('data-mood-id'); });
    if (backMoodBtn) backMoodBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }
  var restoredCard = qs('#soundGrid .sound-card[data-layer-id="' + firstCardId + '"]');
  var restoredRange = restoredCard && restoredCard.querySelector('input[type="range"][data-field="volume"]');
  assert('volume change survives a mood round-trip', !!restoredRange && restoredRange.value === '13', restoredRange && restoredRange.value);

  // --- New mood is empty and opens the library with empty-state content
  var newMoodBtn = qs('#newMood');
  newMoodBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  var newMoodCards = qsa('#soundGrid .sound-card');
  assert('new mood starts with zero cards', newMoodCards.length === 0, 'found ' + newMoodCards.length);
  assert('new mood opens the library drawer', document.body.classList.contains('library-open'));
  var emptyState = qs('#soundGrid .empty-state') || qs('#soundGrid [class*="empty"]');
  assert('new mood grid shows an empty-state hint', !!emptyState);

  // --- Rename + save marks the mood clean
  var saveStateEl = qs('#saveState');
  var newNameInput = qs('#moodName');
  newNameInput.value = 'Brawl Breaks Out';
  fireEvent(newNameInput, 'input');
  var dirtyAfterRename = saveStateEl ? saveStateEl.textContent : '';
  var saveBtn = qs('#saveMood');
  saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  var cleanAfterSave = saveStateEl ? saveStateEl.textContent : '';
  assert('renaming marks save state dirty before saving', /unsaved|dirty|not saved/i.test(dirtyAfterRename || ''), dirtyAfterRename);
  assert('saving marks save state clean', /saved/i.test(cleanAfterSave || '') && !/unsaved|dirty|not saved/i.test(cleanAfterSave || ''), cleanAfterSave);

  // --- Invalid URL import shows inline error, no dialog
  var pasteLinkBtn = qs('#pasteLink');
  pasteLinkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  var importUrlInput = qs('#importUrl');
  var importForm = qs('#importForm');
  var importFeedback = qs('#importFeedback');
  assert('paste link opens the import panel', importForm && !qs('#importPanel').hidden);
  importUrlInput.value = 'not a url';
  fireEvent(importUrlInput, 'input');
  importForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  assert('invalid import URL shows inline feedback', importFeedback && /url|link|valid/i.test(importFeedback.textContent || ''), importFeedback && importFeedback.textContent);

  // --- Valid URL import simulates add and creates a named layer
  var gridBefore = qsa('#soundGrid .sound-card').length;
  importUrlInput.value = 'https://www.youtube.com/watch?v=abc123';
  fireEvent(importUrlInput, 'input');
  importForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  // import simulates a ~500ms pending state before completing
  var importDeadline = Date.now() + 2000;
  while (Date.now() < importDeadline && qsa('#soundGrid .sound-card').length <= gridBefore) {
    await wait(50);
  }
  var gridAfterImport = qsa('#soundGrid .sound-card');
  assert('YouTube URL import adds a new layer card', gridAfterImport.length === gridBefore + 1, 'before=' + gridBefore + ' after=' + gridAfterImport.length);
  var importedTitleFound = gridAfterImport.some(function (c) {
    return /youtube/i.test(c.textContent || '');
  });
  assert('imported layer card references YouTube audio', importedTitleFound);

  // --- No-results state is clear when a search matches nothing
  librarySearch.value = 'zzzzznoexist';
  fireEvent(librarySearch, 'input');
  var noResultsEl = qs('#libraryResults .no-results') || qs('#libraryResults [class*="empty"]') || qs('#libraryResults [class*="no-result"]');
  var rowsForBogusQuery = qsa('#libraryResults .library-item');
  assert('nonsense search yields no library rows', rowsForBogusQuery.length === 0, 'rows=' + rowsForBogusQuery.length);
  assert('nonsense search shows a no-results message', !!noResultsEl && /no .*(sound|result)/i.test(noResultsEl.textContent || ''), noResultsEl && noResultsEl.textContent);

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  var failed = results.filter(function (r) { return !r.pass; });
  return {
    ok: failed.length === 0,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results: results,
  };
}
