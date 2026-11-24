/* DJ Destiny stream overlays: running a page.
   Pages: /stream/prices, /stream/commands, /stream/gig, /stream/all (see README for Studio).
   Each page loads, in order: js/content.js, js/motion.js, js/cards.js, js/live.js.

   Live mode (in TikTok LIVE Studio): draws the last known content at once, then checks
   /api/stream every 5 s and redraws when the content changes. With ?preview (the editor's
   previews and GIF maker) content comes from the parent page instead. */
(function (S) {
  'use strict';

  var POLL_MS = 5000;
  var CACHE_KEY = 'dj-stream-overlays';

  var which = document.body && document.body.getAttribute('data-card');
  if (!which) return;

  var preview = new URLSearchParams(location.search).has('preview');
  document.body.classList.add(which === 'all' ? 'all' : 'single');
  var root = document.getElementById('root') || document.body;
  var lastJson = null;

  // Scale the design to whatever size TikTok Studio gives the Link source, as
  // large as fits both ways. Text is re-rendered at that size, so it stays sharp.
  // A card is designed 900px wide; the all-in-one block 1080px wide.
  // Studio draws a Link source at most ~1080x1032, so at 1080 wide the
  // all-in-one block (about 800px tall) lands 1:1 on the 1080x1920 canvas.
  function fit() {
    var body = document.body;
    body.style.zoom = '1';
    var w = window.innerWidth;
    var h = window.innerHeight;
    // the lights are measured at the final size: text lays out a little differently when zoomed
    if (!w || !h || preview) { S.startMotion(); return; }
    var baseW = which === 'all' ? 1080 : 900;
    var baseH;
    if (which === 'all') {
      // cards are absolutely placed, so measure the lowest one
      body.style.height = 'auto';
      var bottom = 0;
      var slots = body.querySelectorAll('.slot');
      for (var i = 0; i < slots.length; i++) bottom = Math.max(bottom, slots[i].getBoundingClientRect().bottom);
      baseH = Math.ceil(bottom) + 20;
      body.style.height = baseH + 'px';
    } else {
      baseH = body.scrollHeight;
    }
    var s = baseH ? Math.min(w / baseW, h / baseH) : w / baseW;
    body.style.zoom = String(s);
    S.startMotion();
  }
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  function reportSize() {
    if (!preview || window.parent === window) return;
    window.parent.postMessage({ type: 'dj-stream-size', card: which, h: root.children.length ? document.body.scrollHeight : 0 }, location.origin);
  }

  function show(raw) {
    var data = S.normalize(raw);
    // include the date, so past gigs drop off by themselves during a long stream
    var json = JSON.stringify(data) + S.today();
    if (json === lastJson) return;
    lastJson = json;
    S.mount(root, data, which);
    fit();
    requestAnimationFrame(reportSize);
  }

  if (preview) {
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'dj-stream-preview') return;
      show(e.data.data);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reportSize);
    show(null);
    window.parent.postMessage({ type: 'dj-stream-ready', card: which }, location.origin);
    return;
  }

  // Live mode: draw the last known content at once, then keep checking for updates.
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { cached = null; }
  show(cached);

  function tick() {
    fetch('/api/stream', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        if (j.data) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(j.data)); } catch (e) { /* storage full or blocked */ }
        }
        show(j.data || null);
      })
      .catch(function () { /* offline: keep showing what we have */ })
      .then(function () { setTimeout(tick, POLL_MS); });
  }
  tick();
})(window.DJStream);
