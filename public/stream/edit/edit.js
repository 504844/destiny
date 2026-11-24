/* Stream overlays editor (/stream/edit): PIN, form, live previews, save, GIF download.
   Uses js/content.js (defaults, normalize) and gif.js (DJGif). */
(function () {
  'use strict';
  var D = window.DJStream;
  var PIN_KEY = 'dj-stream-pin';
  var ORIGIN = location.origin;

  var state = null;      // what's on screen
  var savedJson = null;  // last saved version
  var pin = localStorage.getItem(PIN_KEY) || '';
  var frames = {};       // card -> { iframe, stage, ready, h }
  var previewTimer = null;

  var $ = function (id) { return document.getElementById(id); };

  var ICONS = {
    up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
    remove: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
  };

  // ---------- API ----------
  function api(body) {
    return fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
    });
  }

  // ---------- PIN ----------
  function showLock(msg) {
    $('app').hidden = true;
    $('lock').hidden = false;
    $('lockErr').textContent = msg || '';
    $('pin').value = '';
    $('pin').focus();
  }

  $('lockForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('pin').value.trim();
    if (!p) return;
    $('unlockBtn').disabled = true;
    $('lockErr').textContent = '';
    api({ pin: p, check: true }).then(function (j) {
      $('unlockBtn').disabled = false;
      if (j.ok) {
        pin = p;
        localStorage.setItem(PIN_KEY, p);
        start();
      } else {
        $('lockErr').textContent = j.status === 401 ? 'That PIN is not right.' : 'Could not check the PIN. Try again.';
      }
    }).catch(function () {
      $('unlockBtn').disabled = false;
      $('lockErr').textContent = 'No connection. Try again.';
    });
  });

  $('logout').addEventListener('click', function (e) {
    e.preventDefault();
    localStorage.removeItem(PIN_KEY);
    pin = '';
    showLock();
  });

  // ---------- state helpers ----------
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function setPath(obj, path, value) {
    var keys = path.split('.');
    var last = keys.pop();
    var target = keys.reduce(function (o, k) { return o[k]; }, obj);
    target[last] = value;
  }

  function isDirty() { return JSON.stringify(state) !== savedJson; }

  function setStatus(text, kind) {
    var s = $('status');
    s.textContent = text;
    s.className = 'status' + (kind ? ' ' + kind : '');
  }

  function changed(structural) {
    var dirty = isDirty();
    $('saveBtn').disabled = !dirty;
    $('discardBtn').disabled = !dirty;
    setStatus(dirty ? 'Unsaved changes' : 'All changes saved', dirty ? 'dirty' : '');
    if (structural) renderSections();
    schedulePreview();
  }

  // ---------- form building ----------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.append(c); });
    return e;
  }

  function textField(label, path, opts) {
    opts = opts || {};
    var input = el('input', { type: opts.type || 'text' });
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.inputmode) input.setAttribute('inputmode', opts.inputmode);
    input.value = getPath(state, path) || '';
    input.addEventListener('input', function () {
      var v = input.value;
      if (opts.upper) {
        var pos = input.selectionStart;
        v = v.toUpperCase();
        input.value = v;
        input.setSelectionRange(pos, pos);
      }
      setPath(state, path, v);
      changed(false);
    });
    return el('label', { class: 'f' }, [el('span', { text: label }), input]);
  }

  function checkField(label, path, structural) {
    var input = el('input', { type: 'checkbox' });
    input.checked = !!getPath(state, path);
    input.addEventListener('change', function () {
      setPath(state, path, input.checked);
      changed(structural);
    });
    return el('label', { class: 'check' }, [input, document.createTextNode(label)]);
  }

  // a row of buttons, one of which is chosen (like radio buttons)
  function choiceField(label, path, options, note) {
    var current = getPath(state, path);
    var group = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
    options.forEach(function (o) {
      var on = o.value === current;
      var b = el('button', { type: 'button', class: 'seg-btn' + (on ? ' on' : ''), role: 'radio', 'aria-checked': String(on), text: o.label });
      b.addEventListener('click', function () {
        if (getPath(state, path) === o.value) return;
        setPath(state, path, o.value);
        changed(true);
      });
      group.append(b);
    });
    return el('div', { class: 'field' }, [
      el('span', { text: label }),
      el('div', { class: 'seg-row' }, [group, note ? el('span', { class: 'muted seg-note', text: note }) : null])
    ]);
  }

  function switchField(path) {
    var input = el('input', { type: 'checkbox' });
    input.checked = !!getPath(state, path);
    input.addEventListener('change', function () {
      setPath(state, path, input.checked);
      changed(true);
    });
    return el('label', { class: 'switch' }, [
      document.createTextNode('Show on stream'), input, el('span', { class: 'track' })
    ]);
  }

  function iconBtn(kind, label, onClick, disabled) {
    var b = el('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, html: ICONS[kind] });
    if (disabled) b.disabled = true;
    b.addEventListener('click', onClick);
    return b;
  }

  function moves(listPath, i, min) {
    var list = getPath(state, listPath);
    return el('div', { class: 'moves' }, [
      iconBtn('up', 'Move up', function () { swap(list, i, i - 1); }, i === 0),
      iconBtn('down', 'Move down', function () { swap(list, i, i + 1); }, i === list.length - 1),
      iconBtn('remove', 'Remove', function () { list.splice(i, 1); changed(true); }, list.length <= (min || 0))
    ]);
  }

  function swap(list, a, b) {
    var t = list[a]; list[a] = list[b]; list[b] = t;
    changed(true);
  }

  function previewBox(card, label) {
    var f = frames[card];
    if (!f) {
      var iframe = el('iframe', { src: '/stream/' + card + '/?preview', title: label + ' preview', loading: 'eager', tabindex: '-1' });
      var stage = el('div', { class: 'stage' }, [iframe, el('div', { class: 'hidden-note', text: 'Hidden on stream' })]);
      f = frames[card] = { iframe: iframe, stage: stage, ready: false, h: 0 };
    }
    return el('div', { class: 'preview' }, [
      el('div', { class: 'preview-label' }, [el('span', { text: 'Preview' })]),
      f.stage
    ]);
  }

  function panel(title, showPath, fields, card) {
    var on = getPath(state, showPath);
    return el('section', { class: 'panel' + (on ? '' : ' off') }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: title }), switchField(showPath)]),
      el('div', { class: 'panel-body' }, [el('div', { class: 'fields' }, fields), previewBox(card, title)])
    ]);
  }

  function pricesPanel() {
    var p = state.prices;
    var tiers = p.tiers.map(function (t, i) {
      var base = 'prices.tiers.' + i;
      return el('div', { class: 'item tier' }, [
        textField('Amount', base + '.n', { inputmode: 'numeric' }),
        textField('Word', base + '.label', { placeholder: 'songs' }),
        textField('Coins', base + '.coins', { inputmode: 'numeric' }),
        textField('Price', base + '.price', { inputmode: 'decimal' }),
        checkField('Highlight', base + '.best', false),
        moves('prices.tiers', i, 0)
      ]);
    });
    var addTier = el('button', { type: 'button', class: 'btn small', text: '+ Add price' });
    addTier.disabled = p.tiers.length >= 6;
    addTier.addEventListener('click', function () {
      p.tiers.push({ n: '', label: 'songs', coins: '', price: '', best: false });
      changed(true);
    });

    var extraOn = p.extra.show;
    var extra = el('div', { class: 'sub-box' }, [
      el('div', { class: 'group-title' }, [el('span', { text: 'Extra item (bottom left)' }), checkField('Show', 'prices.extra.show', true)]),
      extraOn ? el('div', { class: 'grid2' }, [
        textField('Name', 'prices.extra.name', { upper: true }),
        textField('Note', 'prices.extra.note', { placeholder: '~1.5 min' })
      ]) : null,
      extraOn ? el('div', { class: 'grid2' }, [
        textField('Coins', 'prices.extra.coins', { inputmode: 'numeric' }),
        textField('Price', 'prices.extra.price', { inputmode: 'decimal' })
      ]) : null
    ]);

    return panel('Prices', 'prices.show', [
      el('div', { class: 'grid2' }, [
        textField('Title', 'prices.title', { upper: true }),
        textField('Top right text', 'prices.unit')
      ]),
      el('div', { class: 'grid2' }, [
        textField('Coin word', 'prices.coinWord', { placeholder: 'coins' }),
        textField('Money sign', 'prices.currency', { placeholder: 'E or €' })
      ]),
      el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, [el('span', { text: 'Prices (left to right)' }), addTier]),
        el('div', { class: 'list' }, tiers)
      ]),
      extra,
      el('div', { class: 'sub-box' }, [
        el('div', { class: 'group-title' }, [el('span', { text: 'Bottom right text' })]),
        el('div', { class: 'grid2' }, [
          textField('Text', 'prices.footer'),
          textField('Bold part', 'prices.footerBold')
        ])
      ])
    ], 'prices');
  }

  function commandsPanel() {
    var c = state.commands;
    var items = c.items.map(function (it, i) {
      var base = 'commands.items.' + i;
      return el('div', { class: 'item cmd' }, [
        textField('Command', base + '.cmd'),
        textField('Hint (optional)', base + '.hint'),
        textField('What it does', base + '.desc'),
        moves('commands.items', i, 1)
      ]);
    });
    var add = el('button', { type: 'button', class: 'btn small', text: '+ Add command' });
    add.disabled = c.items.length >= 8;
    add.addEventListener('click', function () {
      c.items.push({ cmd: '!', hint: '', desc: '' });
      changed(true);
    });
    return panel('Chat commands', 'commands.show', [
      el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, [el('span', { text: 'Commands (4 per row)' }), add]),
        el('div', { class: 'list' }, items)
      ])
    ], 'commands');
  }

  function gigPanel() {
    var g = state.gig;
    var items = g.items.map(function (it, i) {
      var base = 'gig.items.' + i;
      var date = textField('Date', base + '.date', { type: 'date' });
      var past = el('div', { class: 'past-note', text: 'This date has passed, so this gig is hidden on stream.' });
      past.hidden = !D.isPast(it.date);
      date.querySelector('input').addEventListener('input', function (e) { past.hidden = !D.isPast(e.target.value); });
      return el('div', { class: 'item gig' }, [
        date,
        textField('Event or venue name', base + '.venue', { placeholder: 'Bedroom Bangers' }),
        textField('Venue (optional)', base + '.place', { placeholder: "Youngs'Club" }),
        textField('City', base + '.city', { placeholder: 'Vilnius' }),
        textField('Tag (optional)', base + '.tag', { upper: true, placeholder: 'TRANCE' }),
        moves('gig.items', i, 1),
        past
      ]);
    });
    var add = el('button', { type: 'button', class: 'btn small', text: '+ Add gig' });
    add.disabled = g.items.length >= D.MAX_GIGS;
    add.addEventListener('click', function () {
      g.items.push({ date: '', venue: '', place: '', city: '', tag: '' });
      changed(true);
    });
    return panel('Gigs', 'gig.show', [
      el('div', { class: 'group' }, [
        el('div', { class: 'group-title' }, [el('span', { text: 'Up to 3 gigs. They sort by date, and past ones hide by themselves.' }), add]),
        el('div', { class: 'list' }, items)
      ]),
      el('div', { class: 'sub-box' }, [
        el('div', { class: 'grid2' }, [
          textField('Small text above the next gig', 'gig.label', { upper: true }),
          textField('Small text above later gigs', 'gig.labelMany', { upper: true })
        ]),
        choiceField('With 2 or 3 gigs, show each one for', 'gig.rollSec',
          D.ROLL_SECS.map(function (s) { return { value: s, label: s + ' s' }; }),
          'Then the card rolls to the next gig, in time with the lights.')
      ])
    ], 'gig');
  }

  function lookPanel() {
    var color = el('input', { type: 'color', 'aria-label': 'Accent color' });
    var hex = el('input', { type: 'text', 'aria-label': 'Color code', maxlength: '7' });
    color.value = hex.value = state.accent;
    color.addEventListener('input', function () {
      hex.value = color.value;
      state.accent = color.value;
      changed(false);
    });
    hex.addEventListener('input', function () {
      var v = hex.value.trim();
      if (v && v[0] !== '#') v = '#' + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        color.value = v.toLowerCase();
        state.accent = v.toLowerCase();
        changed(false);
      }
    });
    var reset = el('button', { type: 'button', class: 'btn small', text: 'Original color' });
    reset.addEventListener('click', function () {
      state.accent = D.DEFAULTS.accent;
      changed(true);
    });
    return el('section', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, [el('h2', { text: 'Color' })]),
      el('div', { style: 'padding:16px;display:grid;gap:6px' }, [
        el('span', { class: 'group-title', text: 'Main color of all cards' }),
        el('div', { class: 'color-row' }, [color, hex, reset])
      ])
    ]);
  }

  function renderSections() {
    // keep the scroll position when the form is rebuilt
    var scrollY = window.scrollY;
    var box = $('sections');
    box.textContent = '';
    box.style.display = 'grid';
    box.style.gap = '16px';
    box.append(pricesPanel(), commandsPanel(), gigPanel(), lookPanel());
    window.scrollTo(0, scrollY);
    Object.keys(frames).forEach(fitFrame);
  }

  // ---------- preview ----------
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(sendPreview, 60);
  }

  function sendPreview() {
    Object.keys(frames).forEach(function (card) {
      var f = frames[card];
      if (f.ready && f.iframe.contentWindow) {
        f.iframe.contentWindow.postMessage({ type: 'dj-stream-preview', data: state }, ORIGIN);
      }
    });
  }

  function fitFrame(card) {
    var f = frames[card];
    if (!f) return;
    var w = f.stage.clientWidth || 440;
    var scale = w / 900;
    var h = f.h || 0;
    f.iframe.style.height = Math.max(h, 1) + 'px';
    f.iframe.style.transform = 'scale(' + scale + ')';
    f.stage.style.height = Math.max(Math.ceil(h * scale), 60) + 'px';
    f.stage.classList.toggle('empty', h === 0);
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || !e.data) return;
    var f = frames[e.data.card];
    if (!f || e.source !== f.iframe.contentWindow) return;
    if (e.data.type === 'dj-stream-ready') {
      f.ready = true;
      sendPreview();
    } else if (e.data.type === 'dj-stream-size') {
      f.h = e.data.h;
      fitFrame(e.data.card);
    }
  });

  window.addEventListener('resize', function () { Object.keys(frames).forEach(fitFrame); });

  // ---------- links ----------
  var LINKS = [
    { card: 'prices', name: 'Prices' },
    { card: 'commands', name: 'Chat commands' },
    { card: 'gig', name: 'Gigs' },
    { card: 'all', name: 'All in one' }
  ];

  function renderLinks() {
    var box = $('links');
    box.textContent = '';
    LINKS.forEach(function (l) {
      var url = ORIGIN + '/stream/' + l.card + '/';
      var copy = el('button', { type: 'button', class: 'btn small', text: 'Copy' });
      copy.addEventListener('click', function () {
        navigator.clipboard.writeText(url).then(function () {
          copy.textContent = 'Copied';
          setTimeout(function () { copy.textContent = 'Copy'; }, 1500);
        });
      });
      box.append(el('div', { class: 'link-row' }, [
        el('span', { class: 'link-name', text: l.name }),
        el('code', { text: url, title: url }),
        el('div', { class: 'link-actions' }, [copy, gifButton(l)])
      ]));
    });
  }

  // ---------- GIF download ----------
  // A looping GIF of the card with what's on screen now (saved or not), for when a Link
  // source stutters in Studio. See gif.js.
  var gifBusy = false;

  function gifButton(l) {
    var label = 'Download GIF';
    var b = el('button', { type: 'button', class: 'btn small', text: label });
    var resetTimer = null;
    b.addEventListener('click', function () {
      if (gifBusy) return;
      gifBusy = true;
      clearTimeout(resetTimer);
      document.querySelectorAll('.gif-btn').forEach(function (x) { x.disabled = true; });
      b.textContent = 'Making GIF… 0%';
      window.DJGif.make(l.card, JSON.parse(JSON.stringify(state)), function (p) {
        b.textContent = 'Making GIF… ' + Math.round(p * 100) + '%';
      }).then(function (blob) {
        var a = el('a', { href: URL.createObjectURL(blob), download: 'dj-destiny-' + l.card + '.gif' });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
        b.textContent = 'Downloaded';
      }).catch(function (err) {
        console.error(err);
        b.textContent = err && err.empty ? 'Nothing to show' : 'Could not make GIF';
      }).then(function () {
        gifBusy = false;
        document.querySelectorAll('.gif-btn').forEach(function (x) { x.disabled = false; });
        resetTimer = setTimeout(function () { b.textContent = label; }, 2500);
      });
    });
    b.classList.add('gif-btn');
    return b;
  }

  // ---------- save ----------
  function save() {
    if (!isDirty()) return;
    $('saveBtn').disabled = true;
    setStatus('Saving…', '');
    var snapshot = JSON.stringify(state);
    api({ pin: pin, data: JSON.parse(snapshot) }).then(function (j) {
      if (j.ok) {
        savedJson = snapshot;
        changed(false);
        if (!isDirty()) setStatus('Saved. Live on stream in a few seconds', 'ok');
      } else if (j.status === 401) {
        localStorage.removeItem(PIN_KEY);
        setStatus('PIN not accepted', 'err');
        $('saveBtn').disabled = false;
        showLockKeepingState();
      } else {
        setStatus('Could not save: ' + (j.error || 'try again'), 'err');
        $('saveBtn').disabled = false;
      }
    }).catch(function () {
      setStatus('Could not save: no connection', 'err');
      $('saveBtn').disabled = false;
    });
  }

  // PIN changed while editing: ask again without losing the edits
  function showLockKeepingState() {
    $('app').hidden = true;
    $('lock').hidden = false;
    $('lockErr').textContent = "That PIN didn't work. Enter it again, your edits are kept.";
    $('pin').focus();
  }

  $('saveBtn').addEventListener('click', save);
  $('discardBtn').addEventListener('click', function () {
    state = JSON.parse(savedJson);
    changed(true);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', function (e) {
    if (state && isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- start ----------
  function start() {
    $('lock').hidden = true;
    $('app').hidden = false;
    if (state) { changed(true); return; } // came back from the PIN screen with edits
    setStatus('Loading…', '');
    fetch('/api/stream?fresh=1', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (j) { return j.data; })
      .catch(function () { return undefined; })
      .then(function (data) {
        state = D.normalize(data || null);
        savedJson = data ? JSON.stringify(state) : null;
        renderSections();
        renderLinks();
        changed(false);
        if (data === undefined) setStatus('Could not load saved content. Showing defaults', 'err');
        else if (!data) setStatus('Not saved yet. Press Save to go live', 'dirty');
      });
  }

  if (pin) start(); else showLock();
})();
