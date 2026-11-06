async function livePaletteCheck() {
  const checks = [];
  const $ = s => document.querySelector(s);
  const style = el => getComputedStyle(el);
  const root = style(document.documentElement);
  const check = (name, value, detail) => checks.push({name,pass:Boolean(value),detail});
  // Canonical values read directly from the incumbent live-view.html :root.
  const liveInk = '#f5f4f0';
  const liveRgb = 'rgb(245, 244, 240)';
  check('foreground matches the live-view ink token',root.getPropertyValue('--ink').trim()===liveInk,root.getPropertyValue('--ink').trim());
  check('editor canvas matches the live-view void',style($('#editor')).backgroundColor==='rgb(10, 10, 12)',style($('#editor')).backgroundColor);
  check('selection and slider accent use live-view white, not beige/green',root.getPropertyValue('--selection').trim()===liveInk,root.getPropertyValue('--selection').trim());
  $('#libraryToggle').click();
  for(const selector of ['.properties','.library-bar','.library-drawer','.sound-card']) {
    const color=style($(selector)).backgroundColor;
    const channels=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    check(selector+' has no olive/green chrome',channels[1]<=Math.max(channels[0],channels[2])+1,color);
  }
  $('#previewMood').click();
  await new Promise(resolve => setTimeout(resolve, 200));
  check('active preview uses the same white treatment as live selection',style($('#previewMood')).backgroundColor===liveRgb,style($('#previewMood')).backgroundColor);
  check('checkbox accent matches the live-view white controls',style($('#soundSettings input[type="checkbox"]')).accentColor===liveRgb,style($('#soundSettings input[type="checkbox"]')).accentColor);
  check('phone-only property toggles are absent',!$('#propertiesToggle')&&!$('#closeProperties'));
  check('properties stay a persistent desktop pane',style($('#soundPanel')).display!=='none'&&$('#soundPanel').getBoundingClientRect().width>0);
  return {ok:checks.every(x=>x.pass),viewport:[innerWidth,innerHeight],total:checks.length,passed:checks.filter(x=>x.pass).length,checks};
}
