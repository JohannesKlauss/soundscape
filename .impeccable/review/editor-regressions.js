async function editorRegressions() {
  const checks = [];
  const $ = selector => document.querySelector(selector);
  const click = selector => { const el = $(selector); if (!el) throw new Error('Missing ' + selector); el.click(); };
  const input = (selector, value) => { const el = $(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); };
  const check = (name, value) => checks.push({name, pass: Boolean(value)});
  const snapshot = () => JSON.parse(localStorage.getItem('soundscape.mood-prep.v1'));
  const goTavern = () => { const el = $('#sceneSelect'); el.value = 'tavern'; el.dispatchEvent(new Event('change', {bubbles:true})); click('[data-mood-id="evening"]'); };

  input('[data-layer-id="evening-crowd"] input[data-field="volume"]', '13');
  check('slider edits immediately mark the mood tab dirty', $('[data-mood-id="evening"] .mood-dirty'));

  const selectedTitle = $('[data-layer-id="evening-lute"] .sound-title');
  selectedTitle.focus();
  selectedTitle.click();
  check('selecting a layer keeps its tile and keyboard focus intact', selectedTitle.isConnected && document.activeElement === selectedTitle);

  $('#moodName').focus();
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'@', code:'Digit2', altKey:true, bubbles:true, cancelable:true}));
  check('scene shortcuts do not interrupt typing in a field', $('#sceneSelect').value === 'tavern');
  document.activeElement.blur();
  goTavern();

  click('[data-layer-id="evening-hearth"] .sound-title');
  click('#soundSettings [data-action="replace-layer"]');
  click('[data-mood-id="rain-mood"]');
  check('changing mood cancels a stale replacement target', $('#replacementBar').hidden);
  input('#librarySearch', 'waves');
  click('#libraryResults [data-sound-id="waves"] .library-add');
  let s = snapshot();
  const tavern = s.scenes.find(x => x.id === 'tavern');
  check('adding after a mood switch targets the current mood', tavern.moods.find(x => x.id === 'rain-mood').layers.some(x => x.soundId === 'waves'));
  check('a previous mood is not changed by a stale replacement', tavern.moods.find(x => x.id === 'evening').layers.find(x => x.id === 'evening-hearth').soundId === 'hearth');

  goTavern();
  input('#librarySearch', 'crowd');
  click('[data-layer-id="evening-crowd"] .sound-title');
  click('#soundSettings [data-action="remove-layer"]');
  check('removing a sound immediately makes it addable in the open library', !$('#libraryResults [data-sound-id="crowd"] .library-add').disabled);
  s = snapshot();
  const current = s.scenes.find(x => x.id === s.activeSceneId).moods.find(x => x.id === s.activeMoodId);
  check('mood tab count updates after removal', $('[data-mood-id="evening"] small').textContent.trim().startsWith(String(current.layers.length)));

  $('#librarySearch').focus();
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}));
  check('Escape closes the drawer and returns focus to the editor', !document.body.classList.contains('library-open') && document.activeElement !== $('#librarySearch'));

  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new DOMException('Full', 'QuotaExceededError'); };
  try {
    click('#saveMood');
    check('storage failure does not claim saved locally', /tab|unavailable|not saved/i.test($('#saveState').textContent));
    check('save failure keeps an honest recovery message', /tab|storage|locally|reload/i.test($('#toastMessage').textContent) && !/^Mood saved\.?$/i.test($('#toastMessage').textContent));
  } finally { Storage.prototype.setItem = original; }
  goTavern();
  click('[data-layer-id="evening-lute"] .sound-title');
  click('#soundSettings [data-action="remove-layer"]');
  $('#toastAction').focus();
  await new Promise(resolve => setTimeout(resolve, 5150));
  check('Undo message does not disappear while its action has keyboard focus', !$('#toast').hidden);

  click('#previewMood');
  click('#duplicateMood');
  check('duplicating stops the previous mood preview state', $('#previewMood').getAttribute('aria-pressed') === 'false');
  click('#newMood');
  check('a new empty mood has a stopped preview label', $('#previewMood').getAttribute('aria-pressed') === 'false' && /Listen/.test($('#previewLabel').textContent));

  click('#pasteLink');
  input('#importUrl', 'https://not.youtube.com.example/audio.mp3');
  $('#importForm').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
  await new Promise(resolve => setTimeout(resolve, 650));
  const imported = snapshot().library.at(-1);
  check('lookalike provider hosts are classified as ordinary audio links', imported.sourceType === 'url');
  return {ok: checks.every(x => x.pass), total: checks.length, passed: checks.filter(x => x.pass).length, checks};
}
