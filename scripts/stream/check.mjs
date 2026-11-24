// Automated checks for the stream overlays (public/stream). Run before every deploy:
//
//   npm run stream:check
//
// 1. Logic: content clean-up (normalize), past gigs, the light's path and clock maths.
// 2. Every overlay page in headless Chrome, with 0, 1, 2 and 3 gigs, at TikTok Studio's
//    Link size: the right cards and rows, every animation running, each light's path
//    matching its card, no errors, and no repaints at all while animating (the
//    animations must stay on the GPU compositor, or the overlay can stutter on stream).
// 3. The beat: all lights line up in the middle of their cards on the beat.
// 4. The editor: opens, previews, typing, Save, guide and links.
// 5. The editor's GIF download: frames, timing, and "nothing to show".
//
// Uses the local test server (dev-server.mjs) and the Chrome installed on this computer
// (set CHROME=path to use another). Nothing here talks to the live site.
import vm from 'node:vm';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { startServer } from './dev-server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const STREAM = resolve(HERE, '../../public/stream');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(ok, label, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : ''}`);
}

// ---------- test content ----------
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const GIGS = [
  { date: day(11), venue: 'Graffitti Underground', place: '', city: 'Kaunas', tag: 'TRANCE' },
  { date: day(25), venue: 'Test Club', place: 'Youngs Club', city: 'Vilnius', tag: 'TECHNO' },
  { date: day(46), venue: 'Third Venue', place: '', city: 'Riga', tag: '' },
];
const withGigs = (n) => ({
  gig: { show: true, items: n ? GIGS.slice(0, n) : [{ date: day(-3), venue: 'Past gig', place: '', city: 'Kaunas', tag: '' }] },
});

// ---------- 1. logic ----------
async function logicChecks() {
  console.log('Logic');
  const ctx = { window: {}, document: { body: null }, console };
  for (const f of ['js/content.js', 'js/motion.js']) vm.runInNewContext(await readFile(join(STREAM, f), 'utf8'), ctx);
  const D = ctx.window.DJStream;
  check(!!D && typeof D.normalize === 'function', 'content.js and motion.js load and export DJStream');

  const def = D.normalize(null);
  check(JSON.stringify(def) === JSON.stringify(D.DEFAULTS), 'no content gives the defaults');
  const bad = D.normalize({ accent: 'red', prices: { tiers: Array(9).fill({ n: 1 }) }, commands: { items: 'x' }, gig: { items: Array(5).fill({}) } });
  check(bad.accent === D.DEFAULTS.accent, 'a bad colour falls back to the default');
  check(bad.prices.tiers.length === 6 && bad.prices.tiers[0].n === '1', 'prices are capped at 6 and turned into text');
  check(bad.commands.items.length === D.DEFAULTS.commands.items.length, 'broken commands fall back to the defaults');
  check(bad.gig.items.length === D.MAX_GIGS, 'gigs are capped at ' + D.MAX_GIGS);
  const old = D.normalize({ gig: { venue: 'Old style', date: '2030-01-02', city: 'Kaunas' } });
  check(old.gig.items.length === 1 && old.gig.items[0].venue === 'Old style', 'content saved before gigs were a list still works');
  check(D.isPast(day(-1)) && !D.isPast(day(0)) && !D.isPast(day(1)) && !D.isPast(''), 'a gig counts as past only from the day after');

  const path = D.glowPath(858, 248, 28);
  const p0 = path.pts[0], pN = path.pts[path.pts.length - 1];
  check(p0[0] === pN[0] && p0[1] === pN[1], 'the light path is a closed loop');
  check(path.at.every((v, i) => i === 0 || v >= path.at[i - 1]), 'the light path only moves forward');
  const expected = 2 * (857 + 247) - (8 - 2 * Math.PI) * 27.5; // rounded rectangle on the ring's centre line
  check(Math.abs(path.total - expected) < 1, 'the light path is as long as the border', { total: path.total, expected });
  const L = D.GLOW.loopMs;
  check(Math.abs(D.glowDotAt(path, 0, 5 * L)) < 1e-6, 'the light is at the top middle on every whole loop');
  check(Math.abs(D.glowDotAt(path, 0, 5 * L + L / 2) - path.total / 2) < 1e-6, 'and at the bottom middle half-way');
  const step = (D.glowDotAt(path, 0, 1000) - D.glowDotAt(path, 0, 0) + path.total) % path.total;
  check(Math.abs(step - path.total / L * 1000) < 1e-6, 'the light moves at a steady speed');
}

// ---------- Chrome over the DevTools protocol ----------
function findChrome() {
  const list = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return list.find((p) => existsSync(p));
}

async function launchChrome() {
  const exe = findChrome();
  if (!exe) throw new Error('Chrome not found. Set CHROME to its path.');
  const profile = await mkdtemp(join(tmpdir(), 'dj-stream-check-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1080,1000', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 100 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(100); }
  }
  if (!targets) throw new Error('Chrome did not start');
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, f) => { ws.onopen = r; ws.onerror = f; });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method) listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const errors = [];
  listeners.add((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && !/favicon/.test(msg.params.entry.url || '')) errors.push(msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  async function open(url, { width = 1080, height = 1000, settle = 1500 } = {}) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const loaded = new Promise((r) => { const fn = (m) => { if (m.method === 'Page.loadEventFired') { listeners.delete(fn); r(); } }; listeners.add(fn); });
    await send('Page.navigate', { url });
    await loaded;
    await sleep(settle);
  }

  // main-thread rendering work while nothing changes but the animations
  async function trace(ms = 3000) {
    await sleep(500); // let the one style update from our own inspection pass first
    const events = [];
    let done;
    const fn = (m) => {
      if (m.method === 'Tracing.dataCollected') events.push(...m.params.value);
      if (m.method === 'Tracing.tracingComplete') done();
    };
    listeners.add(fn);
    await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
    await sleep(ms);
    const finished = new Promise((r) => (done = r));
    await send('Tracing.end');
    await finished;
    listeners.delete(fn);
    const count = (n) => events.filter((e) => e.name === n && (e.ph === 'X' || e.ph === 'B')).length;
    return { paint: count('Paint'), style: count('UpdateLayoutTree'), layout: count('Layout') };
  }

  async function close() {
    try { ws.close(); } catch {}
    proc.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
  return { open, evaluate, trace, errors, close };
}

// what a page shows and whether its motion is set up right
const INSPECT = `(() => {
  const glows = [...document.querySelectorAll('.glow')].map((g) => ({
    card: g.closest('.slot').className,
    size: g.getAttribute('data-size'),
    now: g.offsetWidth + 'x' + g.offsetHeight + 'x' + parseFloat(getComputedStyle(g).borderTopLeftRadius),
    dots: g.children.length,
    running: [...g.children].filter((d) => d.getAnimations().some((a) => a.playState === 'running')).length,
    swell: g.getAnimations().filter((a) => a.playState === 'running').length,
  }));
  const tiles = [...document.querySelectorAll('.tier.best, .date')].map((t) => ({
    dim: t.classList.contains('dim'),
    anims: t.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
  }));
  return {
    slots: [...document.querySelectorAll('.slot')].map((s) => s.className),
    glows, tiles,
    gigRows: document.querySelectorAll('.gig-row').length,
    singleGig: !!document.querySelector('.ev'),
    venues: [...document.querySelectorAll('.venue')].map((v) => v.textContent),
    zoom: document.body.style.zoom,
  };
})()`;

// freeze every animation on the next beat (and half a loop later) and read where each light's head is
const BEAT = `(() => {
  const L = DJStream.GLOW.loopMs;
  const anims = document.getAnimations();
  const saved = anims.map((a) => a.currentTime);
  const wall0 = performance.timeOrigin + document.timeline.currentTime;
  const beat = Math.ceil(wall0 / L) * L;
  const at = (ms) => anims.forEach((a, i) => { a.currentTime = saved[i] + (ms - wall0); });
  const heads = () => [...document.querySelectorAll('.glow')].map((g) => {
    const m = new DOMMatrix(getComputedStyle(g.firstElementChild).transform);
    return { x: m.e, y: m.f, w: g.offsetWidth, h: g.offsetHeight, swell: +getComputedStyle(g).opacity };
  });
  at(beat); const top = heads();
  at(beat + 150); const top2 = heads();
  at(beat + L / 2); const bottom = heads();
  at(beat + L / 2 + 150); const bottom2 = heads();
  at(beat + L / 4); const between = heads();
  anims.forEach((a, i) => { a.currentTime = saved[i]; });
  return { top, top2, bottom, bottom2, between };
})()`;

async function setContent(base, data) {
  const r = await fetch(base + '/api/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: 'local', data }) });
  if (!r.ok) throw new Error('could not set test content');
}

// ---------- 2 + 3. overlay pages ----------
async function pageChecks(chrome, base) {
  const expectGig = { 0: 'hidden', 1: 'one gig', 2: '2 rows', 3: '3 rows' };
  for (const n of [0, 1, 2, 3]) {
    await setContent(base, withGigs(n));
    for (const card of ['gig', 'all', 'prices', 'commands']) {
      if (n !== 3 && (card === 'prices' || card === 'commands')) continue; // gigs don't change those
      console.log(`${card} page, ${n} gig${n === 1 ? '' : 's'} (${expectGig[n]})`);
      chrome.errors.length = 0;
      await chrome.open(`${base}/stream/${card}/`);
      const s = await chrome.evaluate(INSPECT);

      const wantSlots = card === 'all' ? (n ? 3 : 2) : card === 'gig' ? (n ? 1 : 0) : 1;
      check(s.slots.length === wantSlots, `${wantSlots} card${wantSlots === 1 ? '' : 's'} shown`, s.slots);
      if (card === 'gig' || card === 'all') {
        if (n === 0) check(s.venues.length === 0, 'no gig shown when all gigs are past', s.venues);
        if (n === 1) check(s.singleGig && s.gigRows === 0 && s.venues.length === 1, 'one gig uses the single-gig layout', s);
        if (n >= 2) check(!s.singleGig && s.gigRows === n, `${n} gigs use ${n} rows`, s);
        if (n >= 1) check(s.venues[0] === GIGS[0].venue, 'the soonest gig comes first', s.venues);
      }
      check(s.glows.length === s.slots.length, 'every card has its border light', s.glows.length);
      check(s.glows.every((g) => g.size === g.now), "every light's path matches its card's size", s.glows.map((g) => g.size + ' vs ' + g.now));
      check(s.glows.every((g) => g.dots === 11 && g.running === 11 && g.swell === 1), 'every light is moving and swelling', s.glows);
      const lit = s.tiles.filter((t) => !t.dim), dim = s.tiles.filter((t) => t.dim);
      check(lit.every((t) => t.anims === 1), `highlighted tiles breathe (${lit.length})`, lit);
      check(dim.every((t) => t.anims === 0), `later gigs' dates stay still (${dim.length})`, dim);

      const t = await chrome.trace(3000);
      check(t.paint === 0 && t.style === 0 && t.layout === 0, 'no repaints while animating (GPU only)', t);
      check(chrome.errors.length === 0, 'no errors', chrome.errors);

      if (card === 'all' && n === 3) {
        const b = await chrome.evaluate(BEAT);
        const mid = (h) => Math.abs(h.x - h.w / 2) < 1.5;
        check(b.top.every((h) => mid(h) && h.y < 2), 'on the beat every light is at the middle of its top edge', b.top);
        check(b.top.every((h, i) => b.top2[i].x > h.x), '... gliding right', b.top2);
        check(b.bottom.every((h) => mid(h) && h.y > h.h - 2), 'half a loop later, at the middle of its bottom edge', b.bottom);
        check(b.bottom.every((h, i) => b.bottom2[i].x < h.x), '... gliding left', b.bottom2);
        check(b.top.every((h) => h.swell > 0.99) && b.between.every((h) => h.swell < 0.5), 'lights swell on the beat and settle in between', b.between.map((h) => h.swell));
      }
    }
  }

  // Saving in the editor while the overlay is on stream: the cards are rebuilt, and the old
  // cards' animations must not linger (they would run on the main thread on every frame).
  console.log('all page, saving new content while it is showing');
  await setContent(base, withGigs(3));
  chrome.errors.length = 0;
  await chrome.open(`${base}/stream/all/`);
  const count = () => chrome.evaluate('document.getAnimations().length');
  const before = await count();
  for (const n of [2, 1, 3]) {
    await setContent(base, withGigs(n));
    await sleep(6500); // the overlay checks for new content every 5 s
    const s = await chrome.evaluate(INSPECT);
    const shown = n === 1 ? s.singleGig && s.venues.length === 1 : s.gigRows === n;
    check(shown, `after a save with ${n} gig${n === 1 ? '' : 's'}, the stream shows it`, s.venues);
    const expected = s.glows.reduce((sum, g) => sum + g.dots + 1, 0) + s.tiles.filter((t) => !t.dim).length;
    check((await count()) === expected, `no leftover animations (${expected} running)`, await count());
  }
  check((await count()) === before, 'back to the same number of animations as before the saves', { before, after: await count() });
  const t = await chrome.trace(3000);
  check(t.paint === 0 && t.style === 0 && t.layout === 0, 'still no repaints after several saves', t);
  check(chrome.errors.length === 0, 'no errors', chrome.errors);

  // Studio may give the source another size: paths must follow the zoom
  await setContent(base, withGigs(3));
  console.log('all page at other Link sizes');
  for (const [w, h] of [[1080, 1032], [720, 640], [1440, 1300]]) {
    await chrome.open(`${base}/stream/all/`, { width: w, height: h });
    const s = await chrome.evaluate(INSPECT);
    check(s.glows.length === 3 && s.glows.every((g) => g.size === g.now), `${w}x${h}: light paths match the cards (zoom ${s.zoom})`, s.glows.map((g) => g.size + ' vs ' + g.now));
  }
}

// ---------- 4. GIF download ----------
const GIF = (card) => `(async () => {
  try {
    const data = DJStream.normalize((await (await fetch('/api/stream?fresh=1')).json()).data);
    const blob = await DJGif.make('${card}', data);
    const dec = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/gif' });
    await dec.tracks.ready; await dec.completed;
    const n = dec.tracks.selectedTrack.frameCount;
    let total = 0; let w = 0, h = 0;
    for (let i = 0; i < n; i++) { const f = (await dec.decode({ frameIndex: i })).image; total += f.duration; w = f.displayWidth; h = f.displayHeight; f.close(); }
    return { kb: Math.round(blob.size / 1024), frames: n, ms: Math.round(total / 1000), w, h };
  } catch (e) { return { error: e.message, empty: !!e.empty }; }
})()`;

async function gifChecks(chrome, base) {
  console.log('GIF download');
  await chrome.open(`${base}/stream/edit/`, { width: 1280, height: 900, settle: 300 });
  await chrome.evaluate(`localStorage.setItem('dj-stream-pin', 'local'); 1`);
  for (const [n, card] of [[3, 'all'], [3, 'gig'], [2, 'gig'], [1, 'gig'], [3, 'prices'], [0, 'gig']]) {
    await setContent(base, withGigs(n));
    await chrome.open(`${base}/stream/edit/`, { width: 1280, height: 900, settle: 1200 });
    const r = await chrome.evaluate(GIF(card));
    if (n === 0) { check(r.empty, `${card} with no upcoming gigs says "Nothing to show"`, r); continue; }
    check(!r.error && r.frames === 420 && r.ms === 14000, `${card} (${n} gig${n === 1 ? '' : 's'}): 420 frames, 14 s loop, ${r.w}x${r.h}, ${r.kb} KB`, r);
  }
}

// ---------- 5. editor ----------
const EDITOR = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const stages = () => [...document.querySelectorAll('.stage')].map((s) => s.offsetHeight);
  const field = (label) => [...document.querySelectorAll('label.f')].find((l) => l.querySelector('span').textContent === label).querySelector('input');
  const out = {
    unlocked: !document.getElementById('app').hidden,
    status: document.getElementById('status').textContent,
    stages: stages(),
    guideParts: document.querySelectorAll('.guide-part').length,
    links: [...document.querySelectorAll('.link-row')].map((r) => r.querySelector('.link-name').textContent + ':' + !!r.querySelector('.gif-btn')),
  };
  const input = field('Small text above (2 or 3 gigs)');
  input.value = 'NEXT UP';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(600);
  const gigFrame = [...document.querySelectorAll('.stage iframe')].find((f) => f.src.includes('/stream/gig/'));
  out.previewUpdated = gigFrame.contentDocument.body.textContent.includes('NEXT UP');
  out.saveEnabled = !document.getElementById('saveBtn').disabled;
  document.getElementById('saveBtn').click();
  await wait(800);
  out.statusAfterSave = document.getElementById('status').textContent;
  out.saved = (await (await fetch('/api/stream?fresh=1')).json()).data.gig.labelMany;
  return out;
})()`;

async function editorChecks(chrome, base) {
  console.log('Editor');
  await setContent(base, withGigs(2));
  await chrome.open(`${base}/stream/edit/`, { width: 1280, height: 900, settle: 300 });
  await chrome.evaluate(`localStorage.setItem('dj-stream-pin', 'local'); 1`);
  chrome.errors.length = 0;
  await chrome.open(`${base}/stream/edit/`, { width: 1280, height: 900, settle: 2000 });
  const r = await chrome.evaluate(EDITOR);
  check(r.unlocked && r.status === 'All changes saved', 'opens with the saved content', r.status);
  check(r.stages.length === 3 && r.stages.every((h) => h > 60), 'all three previews show their card', r.stages);
  check(r.previewUpdated, 'typing updates the preview');
  check(r.saveEnabled && r.saved === 'NEXT UP' && /Saved/.test(r.statusAfterSave), 'Save stores the change', r);
  check(r.links.length === 4 && r.links.every((l) => l.endsWith(':true')), 'all four links have a Download GIF button', r.links);
  check(r.guideParts === 5, 'the guide has all its parts', r.guideParts);
  check(chrome.errors.length === 0, 'no errors', chrome.errors);
}

// ---------- run ----------
const started = Date.now();
await logicChecks();
const store = join(await mkdtemp(join(tmpdir(), 'dj-stream-store-')), 'content.json');
const { server, url } = await startServer({ port: 8790 + Math.floor(Math.random() * 100), store, quiet: true });
let chrome;
try {
  chrome = await launchChrome();
  await pageChecks(chrome, url);
  await editorChecks(chrome, url);
  await gifChecks(chrome, url);
} catch (e) {
  failures++;
  console.log('  FAIL ' + (e.stack || e.message));
} finally {
  if (chrome) await chrome.close();
  server.close();
  await rm(dirname(store), { recursive: true, force: true }).catch(() => {});
}
console.log(`\n${failures ? failures + ' check(s) failed' : 'All checks passed'} in ${Math.round((Date.now() - started) / 1000)} s`);
process.exit(failures ? 1 : 0);
