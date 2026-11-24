/* DJ Destiny stream overlays: download a card as a looping GIF.
   Used by /stream/edit as a fallback for when a Link source stutters in TikTok LIVE Studio.

   How it works:
   1. The card is laid out by the real overlay page (/stream/<card>/?preview) in a hidden iframe,
      with the editor's current data.
   2. That page is drawn into an image twice (SVG foreignObject, fonts come embedded in
      overlay.css): once with the breathing tiles dim, once bright. Animations are frozen and
      the travelling border light is left out.
   3. Every frame is then computed here: the tiles blend between the two images, and the light
      is drawn on the card's border from the same dot chain and path the live page animates
      (DJStream.GLOW and glowPath in js/motion.js).
   4. Frames are written as a GIF89a with one shared palette, each frame storing only the
      pixels that changed.

   GIF has no partial transparency, so the card is made solid (as if over black) and its soft
   drop shadow is left out. The loop is 14 s, one full trip of the light, and starts on the
   beat where the lights line up (see js/motion.js); there are two beats in it. */
(function () {
  'use strict';

  var LOOP_S = 14;          // one trip of the border light (GLOW.loopMs in js/motion.js)
  var BREATHE_S = 7;        // two beats per loop (GLOW.beatMs): lights and tiles peak on each
  // 30 frames a second, to match the stream. GIF frame times are whole 1/100 s, so they go
  // 30, 30, 40 ms: exactly 30 a second on average, and each frame lands on a stream frame.
  var FPS = 30;
  var DELAYS_CS = [3, 3, 4];
  var FRAMES = LOOP_S * FPS;
  var TRANSPARENT = 0;      // palette index for see-through pixels

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

  function rasterize(doc, css, w, h, bright) {
    var freeze =
      '*,*::before,*::after{animation:none!important;transition:none!important}' +
      '.glow{display:none!important}' +
      '.tier.best::after,.date::after{opacity:' + (bright ? 1 : 0) + '!important}';
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

  // Draw the image and flatten it over black: GIF pixels are either solid or see-through.
  function flatten(img, w, h, region) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    var src = ctx.getImageData(region.x, region.y, region.w, region.h).data;
    var n = region.w * region.h;
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

  // Draw the page twice and keep the second result once two runs match, so a font that
  // was still loading on the first draw can't end up in the GIF.
  function stableFlatten(doc, css, w, h, region, bright) {
    var tries = 0;
    var last = null;
    function step() {
      return rasterize(doc, css, w, h, bright).then(function (img) {
        var f = flatten(img, w, h, region);
        tries++;
        if (last && same(last.rgb, f.rgb)) return f;
        last = f;
        return tries >= 4 ? f : step();
      });
    }
    return step();
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

  // CSS ease-in-out, cubic-bezier(0.42, 0, 0.58, 1)
  function easeInOut(x) {
    var t = x;
    for (var i = 0; i < 8; i++) {
      var bx = 3 * (1 - t) * (1 - t) * t * 0.42 + 3 * (1 - t) * t * t * 0.58 + t * t * t;
      var d = 3 * (1 - t) * (1 - t) * 0.42 + 6 * (1 - t) * t * (0.58 - 0.42) + 3 * t * t * (1 - 0.58);
      if (!d) break;
      t -= (bx - x) / d;
      t = Math.min(1, Math.max(0, t));
    }
    return 3 * (1 - t) * t * t + t * t * t;
  }

  // tile brightness 0..1; the page starts each breath half-way, so it peaks on the beat (time 0)
  function breathe(time) {
    var p = ((time / BREATHE_S + 0.5) % 1 + 1) % 1;
    return p < 0.5 ? easeInOut(p * 2) : 1 - easeInOut((p - 0.5) * 2);
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

  // GIF LZW with 8-bit pixels, written in 255-byte sub-blocks
  function writeLzw(out, pixels) {
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
    out.byte(8);
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
    for (var s = 0; s < n; s += 255) {
      var len = Math.min(255, n - s);
      out.byte(len);
      out.bytes(buf.subarray(s, s + len), len);
    }
    out.byte(0);
  }

  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  // ---------- put it together ----------

  async function make(card, data, onProgress) {
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

      var dim = await stableFlatten(doc, css, w, h, region, false);
      if (!dim.solid.some(function (v) { return v; })) throw new Error('The card came out empty');
      progress(0.08);
      var bright = await stableFlatten(doc, css, w, h, region, true);
      progress(0.16);

      var accent = (doc.documentElement.style.getPropertyValue('--cy') || '46, 230, 220').split(',').map(function (v) { return parseInt(v, 10); });
      var rings = Array.prototype.map.call(doc.querySelectorAll('.glow'), function (g) {
        var ring = ringPixels(doc, g, region);
        ring.pix = ring.pix.filter(function (px) { return dim.solid[px.p]; });
        return ring;
      });

      // pixels where the breathing tiles change
      var tiles = [];
      for (var p = 0; p < N; p++) {
        if (!dim.solid[p]) continue;
        var q = p * 3;
        if (dim.rgb[q] !== bright.rgb[q] || dim.rgb[q + 1] !== bright.rgb[q + 1] || dim.rgb[q + 2] !== bright.rgb[q + 2]) tiles.push(p);
      }

      // palette from the still card plus the colours the moving parts pass through
      var hist = new Map();
      function count(r, g, b, c) { var k = key(r, g, b); hist.set(k, (hist.get(k) || 0) + c); }
      for (p = 0; p < N; p++) if (dim.solid[p]) count(dim.rgb[p * 3], dim.rgb[p * 3 + 1], dim.rgb[p * 3 + 2], 1);
      [0.2, 0.4, 0.6, 0.8, 1].forEach(function (o) {
        tiles.forEach(function (p) {
          var q = p * 3;
          count(Math.round(dim.rgb[q] + (bright.rgb[q] - dim.rgb[q]) * o), Math.round(dim.rgb[q + 1] + (bright.rgb[q + 1] - dim.rgb[q + 1]) * o), Math.round(dim.rgb[q + 2] + (bright.rgb[q + 2] - dim.rgb[q + 2]) * o), 1);
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
      var palette = buildPalette(hist, 255);
      var match = makeMatcher(palette);
      progress(0.22);

      // the still card as palette indices
      var base = new Uint8Array(N);
      for (p = 0; p < N; p++) base[p] = dim.solid[p] ? match(dim.rgb[p * 3], dim.rgb[p * 3 + 1], dim.rgb[p * 3 + 2]) : TRANSPARENT;

      var moving = tiles.slice();
      rings.forEach(function (ring) { ring.pix.forEach(function (px) { moving.push(px.p); }); });

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

      var frames = []; // { x, y, w, h, pixels, delay }
      var prev = null;
      for (var f = 0; f < FRAMES; f++) {
        var time = f / FPS;
        var delay = DELAYS_CS[f % DELAYS_CS.length];
        var cur = base.slice();
        var o = breathe(time);
        for (var i = 0; i < tiles.length; i++) {
          var tp = tiles[i], tq = tp * 3;
          cur[tp] = match(
            Math.round(dim.rgb[tq] + (bright.rgb[tq] - dim.rgb[tq]) * o),
            Math.round(dim.rgb[tq + 1] + (bright.rgb[tq + 1] - dim.rgb[tq + 1]) * o),
            Math.round(dim.rgb[tq + 2] + (bright.rgb[tq + 2] - dim.rgb[tq + 2]) * o));
        }
        for (var ri = 0; ri < rings.length; ri++) {
          var ring = rings[ri];
          var dots = dotsAt(ring, time);
          var swell = window.DJStream.GLOW.rest + (1 - window.DJStream.GLOW.rest) * o; // the light swells on the beat, like the tiles
          for (var k = 0; k < ring.pix.length; k++) {
            var px = ring.pix[k];
            var a = lightAt(dots, px.x, px.y) * px.cov * swell;
            if (!a) continue;
            var pq = px.p * 3;
            cur[px.p] = match(
              Math.round(dim.rgb[pq] * (1 - a) + accent[0] * a),
              Math.round(dim.rgb[pq + 1] * (1 - a) + accent[1] * a),
              Math.round(dim.rgb[pq + 2] * (1 - a) + accent[2] * a));
          }
        }

        if (!prev) {
          frames.push({ x: 0, y: 0, w: W, h: H, pixels: cur, delay: delay });
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
          if (maxX < 0) {
            frames[frames.length - 1].delay += delay; // nothing changed: hold the last frame longer
          } else {
            var bw = maxX - minX + 1, bh = maxY - minY + 1;
            var part = new Uint8Array(bw * bh);
            for (var yy = 0; yy < bh; yy++) {
              var row = (minY + yy) * W + minX;
              for (var xx = 0; xx < bw; xx++) {
                var v = cur[row + xx];
                part[yy * bw + xx] = v === prev[row + xx] ? TRANSPARENT : v;
              }
            }
            frames.push({ x: minX, y: minY, w: bw, h: bh, pixels: part, delay: delay });
          }
        }
        prev = cur;
        if (f % 10 === 9) { progress(0.22 + 0.5 * (f + 1) / FRAMES); await tick(); }
      }

      for (var fi = 0; fi < frames.length; fi++) {
        var fr = frames[fi];
        out.byte(0x21); out.byte(0xF9); out.byte(4);
        out.byte((1 << 2) | 1); // keep the frame underneath, index 0 is see-through
        out.u16(fr.delay);
        out.byte(TRANSPARENT);
        out.byte(0);
        out.byte(0x2C);
        out.u16(fr.x); out.u16(fr.y); out.u16(fr.w); out.u16(fr.h);
        out.byte(0);
        writeLzw(out, fr.pixels);
        if (fi % 10 === 9) { progress(0.72 + 0.28 * (fi + 1) / frames.length); await tick(); }
      }
      out.byte(0x3B);
      progress(1);
      return new Blob([out.result()], { type: 'image/gif' });
    } finally {
      opened.iframe.remove();
    }
  }

  window.DJGif = { make: make };
})();
