// Curated, private desktop feature-preview state, driven through the real UI.
// The two named files are metadata fixtures, not playable or downloaded audio.
async function showSoundStackPreview() {
  const $ = selector => document.querySelector(selector);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const card = '#soundGrid .sound-card[data-layer-id="evening-hearth"]';
  $(card + ' .sound-title').click();
  $('#soundSettings [data-action="stack-add"]').click();
  $('#importCategory').value = 'ambience';
  const transfer = new DataTransfer();
  for (const name of ['Low embers.wav', 'Lively flame.wav']) transfer.items.add(new File(['private prototype metadata'], name, {type: 'audio/wav'}));
  $('#fileInput').files = transfer.files;
  $('#fileInput').dispatchEvent(new Event('change', {bubbles: true}));
  $('#cancelReplace').click();
  $(card + ' .tile-listen').click();
  $('#soundPanel').scrollTop = 0;
  document.activeElement?.blur();
  const panel = $('#soundPanel').getBoundingClientRect();
  const sourceRows = all('#soundSettings .stack-source');
  const controls = all('#soundSettings .stack-source button').map(el => {
    const r = el.getBoundingClientRect();
    return {label: el.getAttribute('aria-label'), fitsWidth: r.left >= panel.left && r.right <= panel.right};
  });
  const crossfade = $('#soundSettings [data-field="crossfade"]').getBoundingClientRect();
  const order = $('#soundSettings [data-field="rotation"]').getBoundingClientRect();
  const current = $('#soundSettings .stack-source[aria-current="true"]');
  const ok = all('#soundGrid .sound-card').length === 5 && sourceRows.length === 3 && controls.every(c => c.fitsWidth) && !!current && crossfade.bottom <= panel.bottom && order.bottom <= panel.bottom;
  return {ok, viewport: [innerWidth, innerHeight], tiles: all('#soundGrid .sound-card').length, sounds: sourceRows.map(el => el.querySelector('.stack-source-name').textContent), current: current?.dataset.soundId, controls, crossfadeVisible: crossfade.bottom <= panel.bottom, orderVisible: order.bottom <= panel.bottom, palette: {ink: getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(), void: getComputedStyle(document.documentElement).getPropertyValue('--void').trim()}};
}
