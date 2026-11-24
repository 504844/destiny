/* DJ Destiny stream overlays.
   Pages: /stream/prices, /stream/commands, /stream/gig, /stream/all
   Content is edited at /stream/edit and served by /api/stream.
   Each overlay page checks for new content every few seconds and redraws itself. */
(function () {
  'use strict';

  var POLL_MS = 5000;
  var CACHE_KEY = 'dj-stream-overlays';

  var DEFAULTS = {
    accent: '#2ee6dc',
    prices: {
      show: true,
      title: 'SONG ANALYSIS',
      unit: 'coins · E',
      coinWord: 'coins',
      currency: 'E',
      tiers: [
        { n: '1', label: 'song', coins: '300', price: '1.5', best: false },
        { n: '11', label: 'songs', coins: '3300', price: '15', best: false },
        { n: '35', label: 'songs', coins: '10350', price: '45', best: false },
        { n: '60', label: 'songs', coins: '18000', price: '75', best: true }
      ],
      extra: { show: true, name: 'BBX FREESTYLE', note: '~1.5 min', coins: '800', price: '4' },
      footer: 'Spotify requests & more:',
      footerBold: 'TikTok bio'
    },
    commands: {
      show: true,
      items: [
        { cmd: '!play', hint: '[song - artist]', desc: 'Add song to queue' },
        { cmd: '!revoke', hint: '', desc: 'Remove request' },
        { cmd: '!beats', hint: '', desc: 'Beats you have left' },
        { cmd: '!send', hint: '[beats] [username]', desc: 'Send beats to user' }
      ]
    },
    gig: {
      show: true,
      label: 'NEXT LIVE GIG',
      labelMany: 'UPCOMING GIGS',
      items: [
        { date: '2026-11-06', venue: 'Graffitti Underground', place: '', city: 'Kaunas', tag: 'TRANCE' }
      ]
    }
  };

  var MAX_GIGS = 3;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // today's date on this computer as YYYY-MM-DD
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // a gig counts as past from the day after its date
  function isPast(date) { return DATE_RE.test(date || '') && date < today(); }

  // gigs still to come, soonest first (gigs without a date go last)
  function upcoming(items) {
    var key = function (g) { return g.date || '9999'; };
    return items
      .filter(function (g) { return !isPast(g.date) && (g.venue || g.place || g.city || g.date); })
      .sort(function (a, b) { return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; })
      .slice(0, MAX_GIGS);
  }

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function str(v, fallback) { return v === undefined || v === null ? fallback : String(v); }
  function bool(v, fallback) { return typeof v === 'boolean' ? v : fallback; }

  // Fill any missing field from the defaults so old or partial data never breaks a page.
  function normalize(input) {
    var d = input && typeof input === 'object' ? input : {};
    var o = clone(DEFAULTS);
    if (typeof d.accent === 'string' && /^#[0-9a-f]{6}$/i.test(d.accent)) o.accent = d.accent;

    var p = d.prices || {};
    ['title', 'unit', 'coinWord', 'currency', 'footer', 'footerBold'].forEach(function (k) { o.prices[k] = str(p[k], o.prices[k]); });
    o.prices.show = bool(p.show, true);
    if (Array.isArray(p.tiers)) {
      o.prices.tiers = p.tiers.slice(0, 6).map(function (t) {
        t = t || {};
        return { n: str(t.n, ''), label: str(t.label, ''), coins: str(t.coins, ''), price: str(t.price, ''), best: !!t.best };
      });
    }
    var x = p.extra || {};
    o.prices.extra = {
      show: bool(x.show, o.prices.extra.show),
      name: str(x.name, o.prices.extra.name),
      note: str(x.note, o.prices.extra.note),
      coins: str(x.coins, o.prices.extra.coins),
      price: str(x.price, o.prices.extra.price)
    };

    var c = d.commands || {};
    o.commands.show = bool(c.show, true);
    if (Array.isArray(c.items)) {
      o.commands.items = c.items.slice(0, 8).map(function (i) {
        i = i || {};
        return { cmd: str(i.cmd, ''), hint: str(i.hint, ''), desc: str(i.desc, '') };
      });
    }

    var g = d.gig || {};
    o.gig.show = bool(g.show, true);
    o.gig.label = str(g.label, o.gig.label);
    o.gig.labelMany = str(g.labelMany, o.gig.labelMany);
    var gigItem = function (i) {
      i = i || {};
      return { date: str(i.date, ''), venue: str(i.venue, ''), place: str(i.place, ''), city: str(i.city, ''), tag: str(i.tag, '') };
    };
    if (Array.isArray(g.items)) {
      o.gig.items = g.items.slice(0, MAX_GIGS).map(gigItem);
    } else if (g.venue !== undefined || g.date !== undefined || g.city !== undefined) {
      o.gig.items = [gigItem(g)]; // content saved before gigs became a list
    }
    return o;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function priceSuffix(p, price) {
    var parts = [];
    if (p.coinWord) parts.push(p.coinWord);
    if (price) parts.push(price + (p.currency ? ' ' + p.currency : ''));
    return parts.join(' · ');
  }

  function renderPrices(p) {
    var card = el('div', 'card');
    if (p.title || p.unit) {
      var head = el('div', 'head');
      head.append(el('div', 'title', p.title), el('div', 'unit', p.unit));
      card.append(head);
    }
    if (p.tiers.length) {
      var tiers = el('div', 'tiers');
      tiers.style.gridTemplateColumns = 'repeat(' + p.tiers.length + ', 1fr)';
      p.tiers.forEach(function (t) {
        var tier = el('div', 'tier' + (t.best ? ' best' : ''));
        var price = el('div', 'price', t.coins + ' ');
        var eur = el('span', 'eur', priceSuffix(p, t.price));
        eur.style.margin = '0';
        price.append(eur);
        tier.append(el('div', 'n', t.n), el('div', 'lbl', t.label), price);
        tiers.append(tier);
      });
      card.append(tiers);
    }
    var x = p.extra;
    var hasExtra = x.show && (x.name || x.note || x.coins);
    var hasFoot = p.footer || p.footerBold;
    if (hasExtra || hasFoot) {
      var row = el('div', 'row' + (p.tiers.length || p.title || p.unit ? '' : ' solo'));
      if (hasExtra) {
        var name = el('div', 'name', x.name);
        if (x.note) name.append(el('span', null, x.note));
        if (x.coins || x.price) {
          var xp = el('span', 'price', x.coins + ' ');
          xp.style.marginLeft = '14px';
          var xe = el('span', 'eur', priceSuffix(p, x.price));
          xe.style.margin = '0';
          xp.append(xe);
          name.append(xp);
        }
        row.append(name);
      }
      if (hasFoot) {
        var foot = el('div', 'foot', p.footer ? p.footer + ' ' : '');
        if (p.footerBold) foot.append(el('b', null, p.footerBold));
        row.append(foot);
      }
      card.append(row);
    }
    return card;
  }

  function renderCommands(c) {
    var card = el('div', 'card');
    var grid = el('div', 'cmds');
    var cols = Math.min(Math.max(c.items.length, 1), 4);
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    c.items.forEach(function (i) {
      var cmd = el('div', 'cmd');
      cmd.append(el('div', 'c', i.cmd), el('div', 'syn', i.hint || ' '), el('div', 'd', i.desc));
      grid.append(cmd);
    });
    card.append(grid);
    return card;
  }

  function dateTile(date, cls) {
    var m = DATE_RE.exec(date || '');
    if (!m) return null;
    var tile = el('div', cls);
    tile.append(el('div', 'day', m[3]), el('div', 'mon', MONTHS[parseInt(m[2], 10) - 1] || ''));
    return tile;
  }

  function gigMeta(i) { return [i.place, i.city].filter(Boolean).join(' · '); }

  // One gig: the original card. Two or three: a list with the next one highlighted.
  function renderGig(g) {
    var items = upcoming(g.items);
    if (!items.length) return null;
    var card = el('div', 'card');

    if (items.length === 1) {
      var i = items[0];
      card.style.padding = '12px 16px';
      var ev = el('div', 'ev');
      var tile = dateTile(i.date, 'date');
      if (tile) ev.append(tile);
      var info = el('div');
      if (g.label) info.append(el('div', 'lab', g.label));
      if (i.venue) info.append(el('div', 'venue', i.venue));
      if (gigMeta(i)) info.append(el('div', 'meta', gigMeta(i)));
      ev.append(info);
      if (i.tag) ev.append(el('div', 'tag', i.tag));
      card.append(ev);
      return card;
    }

    card.className = 'card gigs';
    if (g.labelMany) card.append(el('div', 'lab', g.labelMany));
    items.forEach(function (it, n) {
      var row = el('div', 'gig-row');
      var t = dateTile(it.date, n === 0 ? 'date' : 'date dim');
      if (t) row.append(t);
      var inf = el('div', 'gig-info');
      if (it.venue) inf.append(el('div', 'venue', it.venue));
      if (gigMeta(it)) inf.append(el('div', 'meta', gigMeta(it)));
      row.append(inf);
      if (it.tag) row.append(el('div', 'tag', it.tag));
      card.append(row);
    });
    return card;
  }

  function applyAccent(hex) {
    var n = parseInt(hex.slice(1), 16);
    var rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    var soft = rgb.map(function (v) { return Math.round(v + (255 - v) * 0.65); });
    var s = document.documentElement.style;
    s.setProperty('--accent', hex);
    s.setProperty('--cy', rgb.join(', '));
    s.setProperty('--soft', 'rgb(' + soft.join(', ') + ')');
  }

  // ---- motion ----
  // Every card's light travels clockwise along its rounded border at a steady pace, and all of
  // it runs on one shared clock: the time of day. So the cards stay in step even as separate
  // Link sources, and move on a beat. Every 7 s the three lights line up in one column: across
  // the middle of the top edges gliding right, then 7 s later across the middle of the bottom
  // edges gliding left. The cards have different heights, so in between the lights drift a
  // little apart and then fall back into line. On each beat the lights swell to full strength
  // and the highlighted tiles brighten with them; in between both settle down again.
  //
  // The light is a chain of soft dots inside .glow (a 1px ring mask, see overlay.css). Dots and
  // tiles only animate transform and opacity, so the GPU compositor runs them without repaints.
  // The dot strengths were fitted to the brightness profile of the earlier rotating light.
  var GLOW = {
    loopMs: 14000,    // one trip around a card, starting at the top middle on whole multiples of the clock
    beatMs: 7000,     // lights and tiles are brightest on each beat (every half loop)
    rest: 0.45,       // light strength half-way between beats
    spacing: 20,      // px between dots along the border
    radius: 24,       // px, each dot fades out linearly to this radius
    dots: [0.84, 0.66, 0.42, 0.2, 0.11, 0.1, 0.08, 0.07, 0.05, 0.035, 0.015]
  };

  // Centre line of the 1px ring of a w x h card with corner radius r (the .glow box), as
  // points from the middle of the top edge, clockwise, with the distance along it to each point.
  function glowPath(w, h, r) {
    var x0 = 0.5, y0 = 0.5, x1 = w - 0.5, y1 = h - 0.5;
    var cr = Math.max(0, Math.min(r - 0.5, (x1 - x0) / 2, (y1 - y0) / 2));
    var corners = [[x1 - cr, y0 + cr, -90], [x1 - cr, y1 - cr, 0], [x0 + cr, y1 - cr, 90], [x0 + cr, y0 + cr, 180]];
    var pts = [[w / 2, y0]];
    corners.forEach(function (c) {
      for (var i = 0; i <= 8; i++) {
        var a = (c[2] + 90 * i / 8) * Math.PI / 180;
        pts.push([c[0] + cr * Math.cos(a), c[1] + cr * Math.sin(a)]);
      }
    });
    pts.push([w / 2, y0]);
    var at = [0];
    for (var j = 1; j < pts.length; j++) {
      at.push(at[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    }
    return { pts: pts, at: at, total: at[at.length - 1] };
  }

  // distance along the path (from the top middle, clockwise) of dot k at clock time ms:
  // the head is at the top middle on every whole loop, and at the bottom middle half-way
  function glowDotAt(path, k, ms) {
    var L = GLOW.loopMs;
    var frac = (((ms % L) + L) % L) / L;
    var s = frac * path.total - k * GLOW.spacing;
    return ((s % path.total) + path.total) % path.total;
  }

  // where in its beat cycle the clock is, 0..1, with the beat itself at 0.5 (keyframes peak there)
  function beatProgress(ms) {
    var B = GLOW.beatMs;
    return ((ms / B + 0.5) % 1 + 1) % 1;
  }

  // an animation that rises from `low` to 1 on every beat and settles back, like the tiles' breath
  function onBeat(target, low, pseudo, now) {
    var opts = { duration: GLOW.beatMs, iterations: Infinity };
    if (pseudo) opts.pseudoElement = pseudo;
    var anim = target.animate(
      [{ opacity: low, easing: 'ease-in-out' }, { opacity: 1, easing: 'ease-in-out' }, { opacity: low }],
      opts
    );
    anim.startTime = now.tl - beatProgress(now.ms) * GLOW.beatMs;
    return anim;
  }

  // the shared clock, and the matching time on this page's animation timeline
  function clockNow() {
    var t = document.timeline && document.timeline.currentTime;
    if (typeof t !== 'number') t = performance.now();
    return { tl: t, ms: performance.timeOrigin + t };
  }

  function glow() {
    var g = el('div', 'glow');
    GLOW.dots.forEach(function () { g.append(el('i')); });
    return g;
  }

  // (Re)start a card's light for its current size (in the page's own px, as laid out now).
  function startGlow(g, now) {
    var w = g.offsetWidth, h = g.offsetHeight;
    var r = parseFloat(getComputedStyle(g).borderTopLeftRadius) || 0;
    var size = w + 'x' + h + 'x' + r;
    if (!w || !h || g.getAttribute('data-size') === size) return;
    g.setAttribute('data-size', size);
    var path = glowPath(w, h, r);
    var frames = path.pts.map(function (p, i) {
      return { transform: 'translate(' + p[0].toFixed(2) + 'px, ' + p[1].toFixed(2) + 'px)', offset: path.at[i] / path.total };
    });
    var L = GLOW.loopMs;
    Array.prototype.forEach.call(g.children, function (dot, k) {
      dot.getAnimations().forEach(function (a) { a.cancel(); });
      dot.style.opacity = GLOW.dots[k];
      var anim = dot.animate(frames, { duration: L, iterations: Infinity, easing: 'linear' });
      anim.startTime = now.tl - glowDotAt(path, k, now.ms) / path.total * L;
    });
    // the whole light swells on the beat
    if (!g.getAttribute('data-swell')) {
      g.setAttribute('data-swell', '1');
      onBeat(g, GLOW.rest, null, now);
    }
  }

  // highlighted tiles: an accent layer (::after) fades in and out, brightest on each beat
  function startBreathe(tile, now) {
    if (tile.getAttribute('data-breathe')) return;
    tile.setAttribute('data-breathe', '1');
    onBeat(tile, 0, '::after', now);
  }

  function startMotion() {
    var now = clockNow();
    var gs = document.querySelectorAll('.glow');
    for (var i = 0; i < gs.length; i++) startGlow(gs[i], now);
    var ts = document.querySelectorAll('.tier.best, .date:not(.dim)');
    for (var j = 0; j < ts.length; j++) startBreathe(ts[j], now);
  }

  function slot(n, card) {
    var s = el('div', 'slot s' + n);
    card.prepend(glow());
    s.append(card);
    return s;
  }

  var builders = {
    prices: function (d) { return d.prices.show ? slot(1, renderPrices(d.prices)) : null; },
    commands: function (d) { return d.commands.show && d.commands.items.length ? slot(2, renderCommands(d.commands)) : null; },
    gig: function (d) {
      var card = d.gig.show ? renderGig(d.gig) : null;
      return card ? slot(3, card) : null;
    }
  };

  function mount(root, data, which) {
    applyAccent(data.accent);
    // Stop the old cards' animations first. Removed elements can't use the GPU, so their
    // animations would keep running on the main thread on every frame, piling up with each save.
    if (root.getAnimations) root.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    root.textContent = '';
    if (which === 'all') {
      var p = builders.prices(data);
      if (p) root.append(p);
      var stack = el('div', 'stack');
      ['commands', 'gig'].forEach(function (k) { var s = builders[k](data); if (s) stack.append(s); });
      root.append(stack);
    } else if (builders[which]) {
      var one = builders[which](data);
      if (one) root.append(one);
    }
  }

  window.DJStream = {
    DEFAULTS: DEFAULTS, normalize: normalize, clone: clone, isPast: isPast, MAX_GIGS: MAX_GIGS,
    GLOW: GLOW, glowPath: glowPath, glowDotAt: glowDotAt
  };

  var which = document.body && document.body.getAttribute('data-card');
  if (!which) return; // loaded by the editor only for DEFAULTS/normalize

  var params = new URLSearchParams(location.search);
  var preview = params.has('preview');
  document.body.classList.add(which === 'all' ? 'all' : 'single');

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
    if (!w || !h || preview) { startMotion(); return; }
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
    startMotion();
  }
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  var root = document.getElementById('root') || document.body;
  var lastJson = null;

  function reportSize() {
    if (!preview || window.parent === window) return;
    window.parent.postMessage({ type: 'dj-stream-size', card: which, h: root.children.length ? document.body.scrollHeight : 0 }, location.origin);
  }

  function show(raw) {
    var data = normalize(raw);
    // include the date, so past gigs drop off by themselves during a long stream
    var json = JSON.stringify(data) + today();
    if (json === lastJson) return;
    lastJson = json;
    mount(root, data, which);
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
})();
