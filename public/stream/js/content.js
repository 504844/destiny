/* DJ Destiny stream overlays: the content.
   Default content, and normalize(): turns whatever /api/stream returns (old, partial or
   broken) into complete content, so a page never breaks on bad data. Also gig dates.
   Loaded by the overlay pages (see live.js for the order) and by the editor. */
(function (S) {
  'use strict';

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
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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

  S.DEFAULTS = DEFAULTS;
  S.MAX_GIGS = MAX_GIGS;
  S.DATE_RE = DATE_RE;
  S.MONTHS = MONTHS;
  S.today = today;
  S.isPast = isPast;
  S.upcoming = upcoming;
  S.clone = clone;
  S.normalize = normalize;
})(window.DJStream = window.DJStream || {});
