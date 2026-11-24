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
      cmd.append(el('div', 'c', i.cmd), el('div', 'syn', i.hint || ' '), el('div', 'd', i.desc));
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

  // One gig: the original card. Two or three: a list with the next one highlighted.
  function renderGig(g) {
    var items = S.upcoming(g.items);
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
