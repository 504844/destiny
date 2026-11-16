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
      date: '2026-11-06',
      label: 'NEXT LIVE GIG',
      venue: 'Graffitti Underground',
      city: 'Kaunas',
      tag: 'TRANCE'
    }
  };

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
    ['date', 'label', 'venue', 'city', 'tag'].forEach(function (k) { o.gig[k] = str(g[k], o.gig[k]); });
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

  function renderGig(g) {
    var card = el('div', 'card');
    card.style.padding = '12px 16px';
    var ev = el('div', 'ev');
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(g.date || '');
    if (m) {
      var date = el('div', 'date');
      date.append(el('div', 'day', m[3]), el('div', 'mon', MONTHS[parseInt(m[2], 10) - 1] || ''));
      ev.append(date);
    }
    var info = el('div');
    if (g.label) info.append(el('div', 'lab', g.label));
    if (g.venue) info.append(el('div', 'venue', g.venue));
    if (g.city) info.append(el('div', 'meta', g.city));
    ev.append(info);
    if (g.tag) ev.append(el('div', 'tag', g.tag));
    card.append(ev);
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

  function slot(n, card) {
    var s = el('div', 'slot s' + n);
    s.append(card);
    return s;
  }

  var builders = {
    prices: function (d) { return d.prices.show ? slot(1, renderPrices(d.prices)) : null; },
    commands: function (d) { return d.commands.show && d.commands.items.length ? slot(2, renderCommands(d.commands)) : null; },
    gig: function (d) { return d.gig.show ? slot(3, renderGig(d.gig)) : null; }
  };

  function mount(root, data, which) {
    applyAccent(data.accent);
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

  window.DJStream = { DEFAULTS: DEFAULTS, normalize: normalize, clone: clone };

  var which = document.body && document.body.getAttribute('data-card');
  if (!which) return; // loaded by the editor only for DEFAULTS/normalize

  var params = new URLSearchParams(location.search);
  var preview = params.has('preview');
  document.body.classList.add(which === 'all' ? 'all' : 'single');
  var root = document.getElementById('root') || document.body;
  var lastJson = null;

  function reportSize() {
    if (!preview || window.parent === window) return;
    window.parent.postMessage({ type: 'dj-stream-size', card: which, h: document.body.scrollHeight }, location.origin);
  }

  function show(raw) {
    var data = normalize(raw);
    var json = JSON.stringify(data);
    if (json === lastJson) return;
    lastJson = json;
    mount(root, data, which);
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
