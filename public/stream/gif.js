/* DJ Destiny stream overlays: download a card as a looping GIF.
   Used by /stream/edit as a fallback for when a Link source stutters in TikTok LIVE Studio.

   How it works:
   1. The card is laid out by the real overlay page (/stream/<card>/?preview) in a hidden iframe,
      with the editor's current data.
   2. That page is drawn into still pictures (SVG foreignObject, fonts come embedded in
      overlay.css): with the breathing tiles dim and bright, and with 2-3 gigs once per gig,
      plus each gig on its own for the roll. Animations are frozen and the light is left out.
   3. Every frame is then computed here: the tiles blend between dim and bright, the light is
      drawn on the card's border from the same dot chain and path the live page animates, and
      during a roll the two gigs are drawn turning in 3D like the page does (all of it from
      js/motion.js: GLOW, glowPath, glowDotAt, rollState).
   4. Frames are written as a GIF89a with one shared palette, each frame storing only the
      pixels that changed, compressed as soon as it's made so long loops stay light.

   GIF has no partial transparency, so the card is made solid (as if over black) and its soft
   drop shadow is left out. The loop starts on a beat (clock time 0). It is 14 s, one full trip
   of the light, or with a gig roll long enough to show every gig and whole trips of the light
   (e.g. 3 gigs every 14 s: 42 s). */
(function () {
  'use strict';

  var LIGHT_MS = 14000;     // one trip of the border light (GLOW.loopMs in js/motion.js)
  var BREATHE_S = 7;        // the beat (GLOW.beatMs): lights and tiles peak on each
  // 30 frames a second, to match the stream. GIF frame times are whole 1/100 s, so they go
  // 30, 30, 40 ms: exactly 30 a second on average, and each frame lands on a stream frame.
  var FPS = 30;
  var DELAYS_CS = [3, 3, 4];
  var TRANSPARENT = 0;      // palette index for see-through pixels

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  // ---------- 1. lay the card out with the current data ----------

  function openCard(card, data) {
    return new Promise(function (resolve, reject) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.tabIndex = -1;
      iframe.style.cssText = 'position:fixed;left:-20000px;top:0;width:1100px;height:1400px;border:0;opacity:0;pointer-events:none;color-scheme:light';
      var timer = setTimeout(function () { done(new Error('The card did not load')); }, 15000);
      var sent = false;

      function onMessage(e) {
        if (e.source !== iframe.contentWindow || !e.data) return;
        if (e.data.type === 'dj-stream-ready' && !sent) {
          sent = true;
          iframe.contentWindow.postMessage({ type: 'dj-stream-preview', data: data }, location.origin);
        } else if (e.data.type === 'dj-stream-size' && sent) {
          var doc = iframe.contentDocument;
          (doc.fonts ? doc.fonts.ready : Promise.resolve()).then(function () {
            requestAnimationFrame(function () { done(null, { iframe: iframe, doc: doc }); });
          });
        }
      }

      function done(err, result) {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        if (err) { iframe.remove(); reject(err); } else resolve(result);
      }

      window.addEventListener('message', onMessage);
      iframe.src = '/stream/' + card + '/?preview';
      document.body.append(iframe);
    });
  }

  // ---------- 2. draw the page into an image ----------

  var cssText = null;
  function overlayCss() {
    if (!cssText) cssText = fetch('/stream/overlay.css', { cache: 'no-store' }).then(function (r) { return r.text(); });
    return cssText;
  }

  var DIM = '.tier.best::after,.date::after{opacity:0!important}';
  var BRIGHT = '.tier.best::after,.date::after{opacity:1!important}';

  // which gig of a roll to draw: 'front' gig n facing us (the others not drawn), 'none' no gigs
  // (just the card behind them), 'only' gig n alone with nothing else drawn (for the turn).
  // The other gigs are hidden outright: these still pictures are drawn flat, where a gig turned
  // around (as the live page parks them) would show through mirrored.
  function faceCss(n, mode) {
    if (mode === 'none') return '.roll>.face{visibility:hidden!important}';
    var sel = '.roll>.face:nth-child(' + (n + 1) + ')';
    var css = '.roll>.face{visibility:hidden!important;transform:none!important}' + sel + '{visibility:visible!important}';
    if (mode === 'only') css += 'body *{visibility:hidden!important}' + sel + ',' + sel + ' *{visibility:visible!important}';
    return css;
  }

  function rasterize(doc, css, w, h, extra) {
    var freeze =
      '*,*::before,*::after{animation:none!important;transition:none!important}' +
      '.glow{display:none!important}' + extra;
    var root = new XMLSerializer().serializeToString(doc.getElementById('root'));
    var htmlStyle = (doc.documentElement.getAttribute('style') || '').replace(/"/g, '&quot;');
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<foreignObject x="0" y="0" width="' + w + '" height="' + h + '">' +
      '<html xmlns="http://www.w3.org/1999/xhtml" style="' + htmlStyle + '">' +
      '<head><style><![CDATA[' + css + freeze + ']]></style></head>' +
      // the all-in-one page places its cards absolutely, so its body needs the height the live page gives it
      '<body class="' + doc.body.className + '" style="height:' + h + 'px">' + root + '</body></html>' +
      '</foreignObject></svg>';
    var img = new Image();
    img.width = w;
    img.height = h;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return img.decode().then(function () { return img; });
  }

  function canvas2d(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d', { willReadFrequently: true });
    return c;
  }

  function pixelsOf(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; }

  // Draw the page and keep the part in rect. Drawn until two runs match, so a font that was
  // still loading on the first draw can't end up in the GIF.
  async function stableCrop(doc, css, w, h, rect, extra) {
    var last = null;
    for (var tries = 0; tries < 4; tries++) {
      var img = await rasterize(doc, css, w, h, extra);
      var c = canvas2d(rect.w, rect.h);
      c.getContext('2d').drawImage(img, -rect.x, -rect.y, w, h);
      var px = pixelsOf(c);
      if (last && same(last, px)) return c;
      last = px;
    }
    return c;
  }

  // Flatten over black: GIF pixels are either solid or see-through.
  function flattenData(src) {
    var n = src.length / 4;
    var rgb = new Uint8Array(n * 3);
    var solid = new Uint8Array(n);
    for (var p = 0; p < n; p++) {
      var a = src[p * 4 + 3];
      if (a < 128) continue; // the drop shadow and anything fainter become see-through
      solid[p] = 1;
      rgb[p * 3] = Math.round(src[p * 4] * a / 255);
      rgb[p * 3 + 1] = Math.round(src[p * 4 + 1] * a / 255);
      rgb[p * 3 + 2] = Math.round(src[p * 4 + 2] * a / 255);
    }
    return { rgb: rgb, solid: solid };
  }

  function same(a, b) {
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // ---------- 3. the moving parts ----------

  // The border light: .glow is a 1px ring just inside the card border (a mask, rounded like
  // the card), lit by a chain of soft dots that travels along it (see GLOW in js/motion.js).
  // Returns the ring's pixels with how much of each pixel the ring covers.
  function ringPixels(doc, glowEl, region) {
    var w = glowEl.offsetWidth, h = glowEl.offsetHeight;
    var r = parseFloat(doc.defaultView.getComputedStyle(glowEl).borderTopLeftRadius) || 0;
    var rect = glowEl.getBoundingClientRect();
    var ox = rect.left - region.x, oy = rect.top - region.y;
    var S = 4; // 4x4 samples per pixel for smooth edges

    function inRounded(x, y, a0, b0, a1, b1, rad) {
      if (x < a0 || x > a1 || y < b0 || y > b1) return false;
      var dx = x < a0 + rad ? a0 + rad - x : x > a1 - rad ? x - (a1 - rad) : 0;
      var dy = y < b0 + rad ? b0 + rad - y : y > b1 - rad ? y - (b1 - rad) : 0;
      return dx * dx + dy * dy <= rad * rad;
    }
    // inside the rounded box, outside the box 1px in (its content box, corner radius r - 1)
    function inRing(x, y) {
      return inRounded(x, y, 0, 0, w, h, r) && !inRounded(x, y, 1, 1, w - 1, h - 1, Math.max(0, r - 1));
    }

    var pix = [];
    var edge = r + 2;
    for (var py = Math.max(0, Math.floor(oy) - 1); py < Math.min(region.h, Math.ceil(oy + h) + 1); py++) {
      var ly = py + 0.5 - oy;
      for (var px = Math.max(0, Math.floor(ox) - 1); px < Math.min(region.w, Math.ceil(ox + w) + 1); px++) {
        var lx = px + 0.5 - ox;
        var nearSide = lx < 3 || lx > w - 3 || ly < 3 || ly > h - 3;
        var nearCorner = (lx < edge || lx > w - edge) && (ly < edge || ly > h - edge);
        if (!nearSide && !nearCorner) continue;
        var hit = 0;
        for (var sy = 0; sy < S; sy++) for (var sx = 0; sx < S; sx++) {
          if (inRing(px + (sx + 0.5) / S - ox, py + (sy + 0.5) / S - oy)) hit++;
        }
        if (hit) pix.push({ p: py * region.w + px, x: lx, y: ly, cov: hit / (S * S) });
      }
    }
    var D = window.DJStream;
    return { pix: pix, path: D.glowPath(w, h, r) };
  }

  // point at distance s along the path (straight lines between its points, like the animation)
  function pointAt(path, s) {
    s = ((s % path.total) + path.total) % path.total;
    var at = path.at, i = 1;
    while (i < at.length - 1 && at[i] < s) i++;
    var a = path.pts[i - 1], b = path.pts[i];
    var t = at[i] > at[i - 1] ? (s - at[i - 1]) / (at[i] - at[i - 1]) : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  // where each dot of a card's light is at a moment (seconds on the shared clock, as on the page)
  function dotsAt(ring, time) {
    var D = window.DJStream;
    return D.GLOW.dots.map(function (alpha, k) {
      var p = pointAt(ring.path, D.glowDotAt(ring.path, k, time * 1000));
      return { x: p[0], y: p[1], a: alpha };
    });
  }

  // how strongly the dots light a pixel: each dot fades out linearly to GLOW.radius,
  // and overlapping dots stack like layers of the same colour
  function lightAt(dots, x, y) {
    var R = window.DJStream.GLOW.radius, clear = 1;
    for (var i = 0; i < dots.length; i++) {
      var d = Math.hypot(x - dots[i].x, y - dots[i].y);
      if (d < R) clear *= 1 - dots[i].a * (1 - d / R);
    }
    return 1 - clear;
  }

  // tile brightness 0..1, on the same curve as the page (GLOW.beatEase); the page starts each
  // breath half-way, so it peaks on the beat (time 0)
  var beatEase = null;
  function breathe(time) {
    if (!beatEase) beatEase = window.DJStream.cubicBezier.apply(null, window.DJStream.GLOW.beatEase);
    var p = ((time / BREATHE_S + 0.5) % 1 + 1) % 1;
    return p < 0.5 ? beatEase(p * 2) : 1 - beatEase((p - 0.5) * 2);
  }

  // ---------- gig roll ----------

  // Draw one gig turned by deg degrees, as the page does: rotateX around the middle of a cube
  // as deep as the roll is tall, seen through the .roll's perspective from its centre.
  // Each row of the picture comes from one row of the gig (worked back through the projection),
  // stretched sideways by how near that row is.
  function drawTurned(ctx, face, deg, d) {
    var Wf = face.width, Hf = face.height, cx = Wf / 2, cy = Hf / 2, h = Hf / 2;
    var th = deg * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
    if (c <= 1e-4) return; // edge-on or turned away: faces never draw their back
    for (var j = 0; j < Hf; j++) {
      var Y = j + 0.5 - cy;
      var den = d * c + Y * sn;
      if (den <= 0) continue;
      var y = (Y * (d - h * c + h) + d * h * sn) / den;
      var sy = Math.floor(y + cy);
      if (sy < 0 || sy >= Hf) continue;
      var k = d / (d - (y * sn + h * c - h));
      ctx.drawImage(face, 0, sy, Wf, 1, cx - cx * k, j, Wf * k, 1);
    }
  }

  // the roll's area during a turn: the card behind it, then every gig that's showing
  function drawRoll(behind, faces, states, d) {
    var c = canvas2d(behind.width, behind.height);
    var ctx = c.getContext('2d');
    ctx.drawImage(behind, 0, 0);
    states.forEach(function (st, n) { if (st.shown) drawTurned(ctx, faces[n], st.deg, d); });
    return flattenData(pixelsOf(c));
  }

  // ---------- palette ----------

  function key(r, g, b) { return (r << 16) | (g << 8) | b; }

  // median cut over the colours the GIF will use, rare colours weighted up so the light keeps its fade
  function buildPalette(hist, size) {
    var colors = [];
    hist.forEach(function (count, k) {
      colors.push({ r: k >> 16, g: (k >> 8) & 255, b: k & 255, w: Math.sqrt(count) });
    });
    if (colors.length <= size) return colors.map(function (c) { return [c.r, c.g, c.b]; });

    function boxInfo(list) {
      var mn = [255, 255, 255], mx = [0, 0, 0], w = 0;
      list.forEach(function (c) {
        var v = [c.r, c.g, c.b];
        for (var i = 0; i < 3; i++) { if (v[i] < mn[i]) mn[i] = v[i]; if (v[i] > mx[i]) mx[i] = v[i]; }
        w += c.w;
      });
      var ranges = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
      var ch = ranges.indexOf(Math.max.apply(null, ranges));
      return { list: list, ch: ch, score: list.length > 1 ? ranges[ch] * Math.sqrt(w) : -1, w: w };
    }

    var boxes = [boxInfo(colors)];
    while (boxes.length < size) {
      var bi = 0;
      for (var i = 1; i < boxes.length; i++) if (boxes[i].score > boxes[bi].score) bi = i;
      var box = boxes[bi];
      if (box.score <= 0) break;
      var chName = ['r', 'g', 'b'][box.ch];
      var list = box.list.slice().sort(function (a, b) { return a[chName] - b[chName]; });
      var half = box.w / 2, acc = 0, cut = 1;
      for (var j = 0; j < list.length - 1; j++) { acc += list[j].w; if (acc >= half) { cut = j + 1; break; } }
      boxes.splice(bi, 1, boxInfo(list.slice(0, cut)), boxInfo(list.slice(cut)));
    }
    return boxes.map(function (b) {
      var r = 0, g = 0, bl = 0;
      b.list.forEach(function (c) { r += c.r * c.w; g += c.g * c.w; bl += c.b * c.w; });
      return [Math.round(r / b.w), Math.round(g / b.w), Math.round(bl / b.w)];
    });
  }

  function makeMatcher(palette) {
    var cache = new Map();
    return function (r, g, b) {
      var k = key(r, g, b);
      var hit = cache.get(k);
      if (hit !== undefined) return hit;
      var best = 1, bestD = Infinity;
      for (var i = 0; i < palette.length; i++) {
        var c = palette[i];
        var dr = c[0] - r, dg = c[1] - g, db = c[2] - b;
        var d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (d < bestD) { bestD = d; best = i + 1; }
      }
      cache.set(k, best);
      return best;
    };
  }

  // ---------- 4. GIF writing ----------

  function Bytes() { this.buf = new Uint8Array(1 << 20); this.len = 0; }
  Bytes.prototype.ensure = function (n) {
    if (this.len + n <= this.buf.length) return;
    var next = new Uint8Array(Math.max(this.buf.length * 2, this.len + n));
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  };
  Bytes.prototype.byte = function (b) { this.ensure(1); this.buf[this.len++] = b; };
  Bytes.prototype.u16 = function (v) { this.byte(v & 255); this.byte((v >> 8) & 255); };
  Bytes.prototype.str = function (s) { for (var i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); };
  Bytes.prototype.bytes = function (arr, n) { this.ensure(n); this.buf.set(arr.subarray(0, n), this.len); this.len += n; };
  Bytes.prototype.result = function () { return this.buf.slice(0, this.len); };

  var lzwTable = new Int16Array(4096 * 256);
  var lzwOut = new Uint8Array(1 << 20);

  // GIF LZW with 8-bit pixels, in 255-byte sub-blocks: returns the image data bytes
  function lzw(pixels) {
    var CLEAR = 256, EOI = 257;
    var codeSize = 9, next = 258, cur = 0, nbits = 0, n = 0;
    if (lzwOut.length < pixels.length * 2 + 1024) lzwOut = new Uint8Array(pixels.length * 2 + 1024);
    var buf = lzwOut;
    function emit(code) {
      cur |= code << nbits;
      nbits += codeSize;
      while (nbits >= 8) { buf[n++] = cur & 255; cur >>>= 8; nbits -= 8; }
    }
    lzwTable.fill(-1);
    emit(CLEAR);
    var prefix = pixels[0];
    for (var i = 1; i < pixels.length; i++) {
      var k = pixels[i];
      var kk = (prefix << 8) | k;
      var v = lzwTable[kk];
      if (v >= 0) { prefix = v; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(CLEAR);
        lzwTable.fill(-1);
        codeSize = 9;
        next = 258;
      } else {
        if (next >= (1 << codeSize)) codeSize++;
        lzwTable[kk] = next++;
      }
      prefix = k;
    }
    emit(prefix);
    emit(EOI);
    if (nbits > 0) buf[n++] = cur & 255;
    var out = new Uint8Array(1 + n + Math.ceil(n / 255) + 1);
    var o = 0;
    out[o++] = 8;
    for (var s = 0; s < n; s += 255) {
      var len = Math.min(255, n - s);
      out[o++] = len;
      out.set(buf.subarray(s, s + len), o);
      o += len;
    }
    out[o++] = 0;
    return out.subarray(0, o);
  }

  function writeFrame(out, fr) {
    out.byte(0x21); out.byte(0xF9); out.byte(4);
    out.byte((1 << 2) | 1); // keep the frame underneath, index 0 is see-through
    out.u16(fr.delay);
    out.byte(TRANSPARENT);
    out.byte(0);
    out.byte(0x2C);
    out.u16(fr.x); out.u16(fr.y); out.u16(fr.w); out.u16(fr.h);
    out.byte(0);
    out.bytes(fr.data, fr.data.length);
  }

  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  // ---------- put it together ----------

  async function make(card, data, onProgress) {
    var D = window.DJStream;
    var progress = onProgress || function () {};
    progress(0);
    var css = await overlayCss();
    var opened = await openCard(card, data);
    var doc = opened.doc;
    try {
      var slots = doc.querySelectorAll('.slot');
      if (!slots.length) throw Object.assign(new Error('Nothing to show on this card'), { empty: true });

      // the whole page, and the part of it the GIF keeps
      var w, h, region;
      if (card === 'all') {
        var bottom = 0;
        slots.forEach(function (s) { bottom = Math.max(bottom, s.getBoundingClientRect().bottom); });
        w = 1080;
        h = Math.ceil(bottom) + 20;
        region = { x: 0, y: 0, w: w, h: h };
      } else {
        var r = doc.querySelector('.card').getBoundingClientRect();
        w = Math.ceil(doc.body.getBoundingClientRect().width);
        h = Math.ceil(Math.max(doc.body.scrollHeight, r.bottom + 20));
        region = { x: Math.floor(r.left), y: Math.floor(r.top), w: Math.ceil(r.right) - Math.floor(r.left), h: Math.ceil(r.bottom) - Math.floor(r.top) };
      }
      var W = region.w, H = region.h, N = W * H;

      // a gig roll, if there is one: its area, its gigs and their timing
      var rollEl = doc.querySelector('.roll');
      var roll = null;
      if (rollEl && rollEl.children.length > 1) {
        var rr = rollEl.getBoundingClientRect();
        var rx = Math.round(rr.left) - region.x, ry = Math.round(rr.top) - region.y;
        roll = {
          rect: { x: rx, y: ry, w: Math.round(rr.width), h: Math.round(rr.height) },
          count: rollEl.children.length,
          ms: Number(rollEl.getAttribute('data-roll-ms')) || 14000,
          persp: parseFloat(doc.defaultView.getComputedStyle(rollEl).perspective) || 520
        };
      }
      var faceCount = roll ? roll.count : 1;
      var loopMs = roll ? lcm(LIGHT_MS, roll.ms * roll.count) : LIGHT_MS;
      var FRAMES = Math.round(loopMs / 1000 * FPS);

      // still pictures: each gig in front (or just the card), with tiles dim and bright
      var steps = faceCount * 2 + (roll ? faceCount * 2 + 1 : 0), done = 0;
      var step = function () { progress(0.2 * (++done) / steps); };
      var dimF = [], brightF = [];
      for (var f = 0; f < faceCount; f++) {
        var front = roll ? faceCss(f, 'front') : '';
        dimF.push(flattenData(pixelsOf(await stableCrop(doc, css, w, h, region, front + DIM)))); step();
        brightF.push(flattenData(pixelsOf(await stableCrop(doc, css, w, h, region, front + BRIGHT)))); step();
      }
      if (!dimF[0].solid.some(function (v) { return v; })) throw new Error('The card came out empty');
      // for the turn: the card behind the gigs, and each gig on its own (dim and bright)
      var behind = null, faceDim = [], faceBright = [];
      if (roll) {
        var rollRect = { x: roll.rect.x + region.x, y: roll.rect.y + region.y, w: roll.rect.w, h: roll.rect.h };
        behind = await stableCrop(doc, css, w, h, rollRect, faceCss(0, 'none') + DIM); step();
        for (f = 0; f < faceCount; f++) {
          faceDim.push(await stableCrop(doc, css, w, h, rollRect, faceCss(f, 'only') + DIM)); step();
          faceBright.push(await stableCrop(doc, css, w, h, rollRect, faceCss(f, 'only') + BRIGHT)); step();
        }
      }
      var dim = dimF[0];

      var accent = (doc.documentElement.style.getPropertyValue('--cy') || '46, 230, 220').split(',').map(function (v) { return parseInt(v, 10); });
      var rings = Array.prototype.map.call(doc.querySelectorAll('.glow'), function (g) {
        var ring = ringPixels(doc, g, region);
        ring.pix = ring.pix.filter(function (px) { return dim.solid[px.p]; });
        return ring;
      });

      // the roll's area as pixel numbers, and which pixels are in it
      var inRoll = new Uint8Array(N), rollPix = [];
      if (roll) {
        for (var yy = 0; yy < roll.rect.h; yy++) for (var xx = 0; xx < roll.rect.w; xx++) {
          var rp = (roll.rect.y + yy) * W + roll.rect.x + xx;
          if (rp >= 0 && rp < N) { inRoll[rp] = 1; rollPix.push(rp); }
        }
      }

      // pixels where the breathing tiles change, per gig in front
      var tiles = dimF.map(function (dm, fi) {
        var br = brightF[fi], list = [];
        for (var p = 0; p < N; p++) {
          if (!dm.solid[p]) continue;
          var q = p * 3;
          if (dm.rgb[q] !== br.rgb[q] || dm.rgb[q + 1] !== br.rgb[q + 1] || dm.rgb[q + 2] !== br.rgb[q + 2]) list.push(p);
        }
        return list;
      });
      var tilesOutside = tiles[0].filter(function (p) { return !inRoll[p]; });

      // the gigs' turn states at a moment (clock time ms), and whether a turn is under way
      function rollAt(ms) {
        var states = [];
        for (var n = 0; n < roll.count; n++) states.push(D.rollState(n, roll.count, roll.ms, ms));
        var shown = states.filter(function (st) { return st.shown; });
        var turning = shown.length > 1 || shown.some(function (st) { return st.deg !== 0; });
        var frontN = states.findIndex(function (st) { return st.shown && st.deg === 0; });
        return { states: states, turning: turning, front: frontN < 0 ? 0 : frontN };
      }
      function turnPixels(states) {
        return { dim: drawRoll(behind, faceDim, states, roll.persp), bright: drawRoll(behind, faceBright, states, roll.persp) };
      }

      // palette from the still pictures plus the colours the moving parts pass through
      var hist = new Map();
      function count(r, g, b, c) { var k = key(r, g, b); hist.set(k, (hist.get(k) || 0) + c); }
      function lerpCount(a, b, q, o) {
        count(Math.round(a[q] + (b[q] - a[q]) * o), Math.round(a[q + 1] + (b[q + 1] - a[q + 1]) * o), Math.round(a[q + 2] + (b[q + 2] - a[q + 2]) * o), 1);
      }
      dimF.forEach(function (dm, fi) {
        for (var p = 0; p < N; p++) if (dm.solid[p] && (fi === 0 || inRoll[p])) count(dm.rgb[p * 3], dm.rgb[p * 3 + 1], dm.rgb[p * 3 + 2], 1);
        [0.2, 0.4, 0.6, 0.8, 1].forEach(function (o) {
          tiles[fi].forEach(function (p) { lerpCount(dm.rgb, brightF[fi].rgb, p * 3, o); });
        });
      });
      [0.03, 0.08, 0.15, 0.3, 0.45, 0.6, 0.75, 0.85].forEach(function (al) {
        rings.forEach(function (ring) {
          ring.pix.forEach(function (px) {
            var a = al * px.cov, q = px.p * 3;
            count(Math.round(dim.rgb[q] * (1 - a) + accent[0] * a), Math.round(dim.rgb[q + 1] * (1 - a) + accent[1] * a), Math.round(dim.rgb[q + 2] * (1 - a) + accent[2] * a), 1);
          });
        });
      });
      if (roll) {
        // a few moments of every turn
        for (var n = 0; n < roll.count; n++) {
          [0.2, 0.45, 0.7, 0.9].forEach(function (frac) {
            var ms = (n + 1) * roll.ms - D.ROLL.turnMs * (1 - frac);
            var tp = turnPixels(rollAt(ms).states);
            for (var i = 0; i < tp.dim.solid.length; i++) {
              if (!tp.dim.solid[i]) continue;
              lerpCount(tp.dim.rgb, tp.bright.rgb, i * 3, 0);
              lerpCount(tp.dim.rgb, tp.bright.rgb, i * 3, 1);
            }
          });
        }
      }
      var palette = buildPalette(hist, 255);
      var match = makeMatcher(palette);
      progress(0.25);

      // each still picture as palette indices
      var base = dimF.map(function (dm) {
        var b = new Uint8Array(N);
        for (var p = 0; p < N; p++) b[p] = dm.solid[p] ? match(dm.rgb[p * 3], dm.rgb[p * 3 + 1], dm.rgb[p * 3 + 2]) : TRANSPARENT;
        return b;
      });

      // every pixel that can change between frames
      var movable = new Uint8Array(N);
      tiles.forEach(function (list) { list.forEach(function (p) { movable[p] = 1; }); });
      rings.forEach(function (ring) { ring.pix.forEach(function (px) { movable[px.p] = 1; }); });
      rollPix.forEach(function (p) { movable[p] = 1; });
      var moving = [];
      for (var mp0 = 0; mp0 < N; mp0++) if (movable[mp0]) moving.push(mp0);

      // header, palette, loop forever
      var out = new Bytes();
      out.str('GIF89a');
      out.u16(W);
      out.u16(H);
      out.byte(0xF7);
      out.byte(0);
      out.byte(0);
      for (var c = 0; c < 256; c++) {
        var col = c === TRANSPARENT ? [0, 0, 0] : palette[c - 1] || [0, 0, 0];
        out.byte(col[0]); out.byte(col[1]); out.byte(col[2]);
      }
      out.byte(0x21); out.byte(0xFF); out.byte(11); out.str('NETSCAPE2.0'); out.byte(3); out.byte(1); out.u16(0); out.byte(0);

      var pending = null; // the last frame, written once we know how long it stays up
      var prev = null;
      function lerpMatch(a, b, q, o) {
        return match(Math.round(a[q] + (b[q] - a[q]) * o), Math.round(a[q + 1] + (b[q + 1] - a[q + 1]) * o), Math.round(a[q + 2] + (b[q + 2] - a[q + 2]) * o));
      }
      for (var fr = 0; fr < FRAMES; fr++) {
        var time = fr / FPS;
        var delay = DELAYS_CS[fr % DELAYS_CS.length];
        var o = breathe(time);
        var state = roll ? rollAt(time * 1000) : { turning: false, front: 0 };
        var fi = state.front;
        var dm = dimF[fi], br = brightF[fi];
        var cur = base[fi].slice();
        var i, tp;

        if (!state.turning) {
          for (i = 0; i < tiles[fi].length; i++) { tp = tiles[fi][i]; cur[tp] = lerpMatch(dm.rgb, br.rgb, tp * 3, o); }
        } else {
          for (i = 0; i < tilesOutside.length; i++) { tp = tilesOutside[i]; cur[tp] = lerpMatch(dm.rgb, br.rgb, tp * 3, o); }
          var turn = turnPixels(state.states);
          for (i = 0; i < rollPix.length; i++) {
            if (!turn.dim.solid[i]) continue;
            cur[rollPix[i]] = lerpMatch(turn.dim.rgb, turn.bright.rgb, i * 3, o);
          }
        }

        var swell = D.GLOW.rest + (1 - D.GLOW.rest) * o; // the light swells on the beat, like the tiles
        for (var ri = 0; ri < rings.length; ri++) {
          var ring = rings[ri];
          var dots = dotsAt(ring, time);
          for (var k = 0; k < ring.pix.length; k++) {
            var px = ring.pix[k];
            var a = lightAt(dots, px.x, px.y) * px.cov * swell;
            if (!a) continue;
            var pq = px.p * 3;
            cur[px.p] = match(
              Math.round(dm.rgb[pq] * (1 - a) + accent[0] * a),
              Math.round(dm.rgb[pq + 1] * (1 - a) + accent[1] * a),
              Math.round(dm.rgb[pq + 2] * (1 - a) + accent[2] * a));
          }
        }

        var frame = null;
        if (!prev) {
          frame = { x: 0, y: 0, w: W, h: H, data: lzw(cur), delay: delay };
        } else {
          // only the box around the pixels that changed; unchanged ones inside it are see-through
          var minX = W, minY = H, maxX = -1, maxY = -1;
          for (i = 0; i < moving.length; i++) {
            var mp = moving[i];
            if (cur[mp] === prev[mp]) continue;
            var mx = mp % W, my = (mp - mx) / W;
            if (mx < minX) minX = mx; if (mx > maxX) maxX = mx;
            if (my < minY) minY = my; if (my > maxY) maxY = my;
          }
          if (maxX >= 0) {
            var bw = maxX - minX + 1, bh = maxY - minY + 1;
            var part = new Uint8Array(bw * bh);
            for (var y2 = 0; y2 < bh; y2++) {
              var row = (minY + y2) * W + minX;
              for (var x2 = 0; x2 < bw; x2++) {
                var v = cur[row + x2];
                part[y2 * bw + x2] = v === prev[row + x2] ? TRANSPARENT : v;
              }
            }
            frame = { x: minX, y: minY, w: bw, h: bh, data: lzw(part), delay: delay };
          }
        }
        if (frame) {
          if (pending) writeFrame(out, pending);
          pending = frame;
        } else {
          pending.delay += delay; // nothing changed: hold the last frame longer
        }
        prev = cur;
        if (fr % 15 === 14) { progress(0.25 + 0.75 * (fr + 1) / FRAMES); await tick(); }
      }
      writeFrame(out, pending);
      out.byte(0x3B);
      progress(1);
      return new Blob([out.result()], { type: 'image/gif' });
    } finally {
      opened.iframe.remove();
    }
  }

  window.DJGif = { make: make };
})();
