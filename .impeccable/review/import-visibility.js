async function importVisibility() {
  document.getElementById('pasteLink').click();
  const url = document.getElementById('importUrl');
  url.value = 'not-a-link';
  document.getElementById('importForm').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const panel = document.getElementById('importPanel').getBoundingClientRect();
  const box = id => { const r = document.getElementById(id).getBoundingClientRect(); return {id,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}; };
  const visible = r => r.width > 0 && r.height > 0 && r.top >= panel.top && r.bottom <= panel.bottom && r.left >= 0 && r.right <= innerWidth;
  const feedback = box('importFeedback');
  const drop = box('importFiles');
  const category = box('importCategory');
  const submit = box('importSubmit');
  const checks = [
    {name:'invalid URL feedback is completely visible without scrolling',pass:visible(feedback)},
    {name:'file drop and choose-files sublabel are completely visible',pass:visible(drop)},
    {name:'import type selector remains visible',pass:visible(category)},
    {name:'import action remains visible',pass:visible(submit)},
  ];
  return {ok:checks.every(x=>x.pass),viewport:[innerWidth,innerHeight],checks,panel:{top:panel.top,bottom:panel.bottom,height:panel.height},feedback,drop,category,submit};
}
