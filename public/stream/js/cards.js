/* DJ Destiny stream overlays: drawing the cards.
   mount() builds the cards for a page from normalized content (content.js). Text is only
   ever set as text, never as HTML, so nothing typed in the editor can run on stream. */
(function (S) {
  'use strict';

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
      // a command without a hint still gets its hint line (a non-breaking space keeps its height),
      // so every description sits on the same line
      cmd.append(el('div', 'c', i.cmd), el('div', 'syn', i.hint || '\u00a0'), el('div', 'd', i.desc));
      grid.append(cmd);
    });
    card.append(grid);
    return card;
  }

  function dateTile(date, cls) {
    var m = S.DATE_RE.exec(date || '');
    if (!m) return null;
    var tile = el('div', cls);
    tile.append(el('div', 'day', m[3]), el('div', 'mon', S.MONTHS[parseInt(m[2], 10) - 1] || ''));
    return tile;
  }

  function gigMeta(i) { return [i.place, i.city].filter(Boolean).join(' · '); }

  // one gig: date tile, small label, venue, place and city, and on the right its tag
  // (and with several gigs, dots showing which one of how many this is)
  function gigFace(i, label, n, count) {
    var ev = el('div', 'ev');
    var tile = dateTile(i.date, 'date');
    if (tile) ev.append(tile);
    var info = el('div');
    if (label) info.append(el('div', 'lab', label));
    if (i.venue) info.append(el('div', 'venue', i.venue));
    if (gigMeta(i)) info.append(el('div', 'meta', gigMeta(i)));
    ev.append(info);
    if (count < 2) {
      if (i.tag) ev.append(el('div', 'tag', i.tag));
      return ev;
    }
    var side = el('div', 'side');
    if (i.tag) side.append(el('div', 'tag', i.tag));
    var pips = el('div', 'pips');
    for (var k = 0; k < count; k++) pips.append(el('i', k === n ? 'on' : null));
    side.append(pips);
    ev.append(side);
    return ev;
  }

  // One gig: the original card. Two or three: one gig at a time, rolling to the next like a
  // cube every g.rollSec seconds (js/motion.js runs the roll). The next gig comes first and
  // keeps the small label for one gig; the later ones use the label for several.
  function renderGig(g) {
    var items = S.upcoming(g.items);
    if (!items.length) return null;
    var card = el('div', 'card');
    card.style.padding = '12px 16px';
    if (items.length === 1) {
      card.append(gigFace(items[0], g.label, 0, 1));
      return card;
    }
    var roll = el('div', 'roll');
    roll.setAttribute('data-roll-ms', String(g.rollSec * 1000));
    items.forEach(function (it, n) {
      var face = el('div', 'face');
      face.append(gigFace(it, n === 0 ? g.label : g.labelMany, n, items.length));
      roll.append(face);
    });
    card.append(roll);
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
    card.prepend(S.glow());
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

  // draw the cards of one page ('prices', 'commands', 'gig' or 'all') into root
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

  S.mount = mount;
})(window.DJStream = window.DJStream || {});
