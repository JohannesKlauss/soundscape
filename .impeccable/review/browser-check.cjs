'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.impeccable/review');
const URL = 'http://127.0.0.1:4317/mood-editor.html';
const mode = process.argv[2] || 'all';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'soundscape-browser-check-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, 'about:blank',
], {stdio: ['ignore', 'ignore', 'pipe']});
let socket;
let sessionId;
let nextId = 0;
const pending = new Map();
const listeners = new Set();
const errors = [];

function send(method, params = {}, session = sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params, ...(session ? {sessionId: session} : {})}));
  });
}
function event(method) {
  return new Promise(resolve => {
    const listener = message => {
      if (message.method === method && message.sessionId === sessionId) { listeners.delete(listener); resolve(message); }
    };
    listeners.add(listener);
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true, userGesture: true});
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function runFunction(source) { return evaluate('(\n' + source + '\n)()'); }
async function navigate(url = URL) {
  const loaded = event('Page.loadEventFired');
  await send('Page.navigate', {url});
  await loaded;
  await evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
}
async function reset(width = 1440, height = 900) {
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  await evaluate('localStorage.clear()');
  await navigate();
}
async function capture(name) {
  await evaluate('document.fonts.ready.then(() => new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 300)))');
  const image = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false, fromSurface: true});
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(image.data, 'base64'));
  return evaluate(`(() => {
    const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[inert], [hidden], [aria-hidden="true"]'); };
    return {width: innerWidth, height: innerHeight, rootOverflow: document.documentElement.scrollWidth > innerWidth,
      brokenImages: [...document.images].filter(el => !el.complete || !el.naturalWidth).map(el => el.src),
      clippedControls: [...document.querySelectorAll('button,input,select')].filter(el => visible(el) && !el.closest('.mood-strip,.editor,.library-results,.import-panel,.properties')).filter(el => {
        const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1;
      }).map(el => el.getAttribute('aria-label') || el.textContent.trim() || el.id)
    };
  })()`);
}

(async () => {
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let text = '';
      const timer = setTimeout(() => reject(new Error('Chrome did not announce a debugging endpoint')), 20000);
      chrome.stderr.on('data', chunk => {
        text += chunk;
        const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      chrome.once('error', reject);
      chrome.once('exit', code => { if (!text.includes('DevTools listening')) reject(new Error('Chrome exited: ' + code)); });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
    socket.addEventListener('message', raw => {
      const message = JSON.parse(String(raw.data));
      if (message.id) {
        const item = pending.get(message.id);
        if (item) { clearTimeout(item.timer); pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result); }
      } else {
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        for (const listener of listeners) listener(message);
      }
    });
    const target = await send('Target.createTarget', {url: 'about:blank'}, null);
    sessionId = (await send('Target.attachToTarget', {targetId: target.targetId, flatten: true}, null)).sessionId;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: Number(process.argv[4]) || 1440, height: Number(process.argv[5]) || 900, deviceScaleFactor: 1, mobile: false});
    await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
    await navigate();
    const report = {mode, errors};
    if (mode === 'all' || mode === 'smoke') {
      report.smoke = await runFunction(fs.readFileSync(path.join(ROOT, 'prototype/tests/mood-editor.browser.js'), 'utf8'));
      if (!report.smoke.ok) process.exitCode = 1;
    }
    if (mode === 'script') {
      report.script = await runFunction(fs.readFileSync(path.resolve(process.argv[3]), 'utf8'));
      if (report.script?.ok === false) process.exitCode = 1;
      if (process.argv[6]) report.capture = await capture(path.basename(process.argv[6]));
    }
    if (mode === 'all') {
      await reset();
      await evaluate(`(() => { const r = document.querySelector('[data-layer-id="evening-crowd"] input[data-field="volume"]'); r.value = '19'; r.dispatchEvent(new Event('input',{bubbles:true})); const q = document.getElementById('librarySearch'); q.value = 'rain'; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
      await navigate();
      report.reload = await evaluate(`({volume:document.querySelector('[data-layer-id="evening-crowd"] input[data-field="volume"]').value, query:document.getElementById('librarySearch').value})`);
      report.reload.ok = report.reload.volume === '19' && report.reload.query === 'rain';
      if (!report.reload.ok) process.exitCode = 1;
    }
    if (mode === 'all' || mode === 'capture') {
      report.captures = {};
      await reset();
      report.captures.desktop = await capture('desktop');
      await evaluate("document.getElementById('librarySearch').focus()");
      report.captures.drawer = await capture('drawer');
      await evaluate("document.getElementById('pasteLink').click(); document.getElementById('importUrl').value='not-a-link'; document.getElementById('importForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
      report.captures.import = await capture('import');
      await reset(1280, 800);
      report.captures.compact = await capture('compact');
      await reset(2128, 833);
      report.captures.wide = await capture('user-2128');
      await reset(1024, 768);
      report.captures.narrowDesktop = await capture('narrow-desktop');
      await reset();
      await evaluate("document.getElementById('newMood').click()");
      report.captures.empty = await capture('empty');
      await reset();
      await navigate('http://127.0.0.1:4317/live-view.html');
      report.captures.live = await capture('live-view');
      await navigate('file://' + path.join(ROOT, 'prototype/mood-editor.html'));
      report.localFile = await evaluate(`({cards:document.querySelectorAll('.sound-card').length, images:[...document.images].every(x=>x.complete&&x.naturalWidth), fonts:[...document.fonts].map(x=>({family:x.family,status:x.status}))})`);
    }
    fs.writeFileSync(path.join(OUT, mode === 'script' ? 'extra-flow-report.json' : (mode === 'capture' ? 'capture-report.json' : 'browser-report.json')), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (socket?.readyState === WebSocket.OPEN) {
      try { await send('Browser.close', {}, null); } catch {}
      socket.close();
    }
    chrome.kill('SIGTERM');
    for (const item of pending.values()) clearTimeout(item.timer);
    fs.rmSync(profile, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
  }
})();
