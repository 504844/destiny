/* DJ Destiny stream overlays: motion.

   Every card's light travels clockwise along its rounded border at a steady pace, and all of
   it runs on one shared clock: the time of day. So the cards stay in step even as separate
   Link sources, and move on a beat. Every 7 s the three lights line up in one column: across
   the middle of the top edges gliding right, then 7 s later across the middle of the bottom
   edges gliding left. The cards have different heights, so in between the lights drift a
   little apart and then fall back into line. On each beat the lights swell to full strength
   and the highlighted tiles brighten with them; in between both settle down again.

   The light is a chain of soft dots inside .glow (a 1px ring mask, see overlay.css). Dots and
   tiles only animate transform and opacity, so the GPU compositor runs them without repaints.
   The dot strengths were fitted to the brightness profile of the earlier rotating light.

   The maths (GLOW, glowPath, glowDotAt) is shared with the editor's GIF maker (gif.js). */
(function (S) {
  'use strict';

  var GLOW = {
    loopMs: 14000,    // one trip around a card, starting at the top middle on whole multiples of the clock
    beatMs: 7000,     // lights and tiles are brightest on each beat (every half loop)
    rest: 0.45,       // light strength half-way between beats
    beatEase: [0.37, 0, 0.63, 1], // rise and fall like a wave (sine ease), for the swell and the tiles
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

  // the shared clock, and the matching time on this page's animation timeline
  function clockNow() {
    var t = document.timeline && document.timeline.currentTime;
    if (typeof t !== 'number') t = performance.now();
    return { tl: t, ms: performance.timeOrigin + t };
  }

  // an animation that rises from `low` to 1 on every beat and settles back, like the tiles' breath
  function onBeat(target, low, pseudo, now) {
    var opts = { duration: GLOW.beatMs, iterations: Infinity };
    if (pseudo) opts.pseudoElement = pseudo;
    var ease = 'cubic-bezier(' + GLOW.beatEase.join(', ') + ')';
    var anim = target.animate(
      [{ opacity: low, easing: ease }, { opacity: 1, easing: ease }, { opacity: low }],
      opts
    );
    anim.startTime = now.tl - beatProgress(now.ms) * GLOW.beatMs;
    return anim;
  }

  // the light's elements, added to every card (see cards.js)
  function glow() {
    var g = document.createElement('div');
    g.className = 'glow';
    GLOW.dots.forEach(function () { g.append(document.createElement('i')); });
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

  // ---- gig roll ----
  // With 2 or 3 gigs the gig card shows one at a time (.roll, see cards.js). Every rollMs the
  // shown gig turns up and away like a cube face while the next one turns in from below, as one
  // rigid cube: both faces use the same timing and easing. The turn ends on the beat (rollMs is a
  // multiple of GLOW.beatMs), as the lights line up and the date tiles are brightest.
  // Gig n is in front from clock time n * rollMs (mod rollMs * count), so separate sources agree.
  var ROLL = {
    turnMs: 1000,                       // how long one roll takes
    ease: [0.65, -0.12, 0.32, 1.12]     // cubic-bezier: a slight wind-up, then a soft snap
  };

  // CSS cubic-bezier timing function as a JS function (for the GIF maker, which draws the roll)
  function cubicBezier(x1, y1, x2, y2) {
    function at(a, b, t) { return 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 30; i++) {
        var v = at(x1, x2, t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return at(y1, y2, t);
    };
  }
  var rollEase = cubicBezier(ROLL.ease[0], ROLL.ease[1], ROLL.ease[2], ROLL.ease[3]);

  // Where gig n of count is at clock time ms: its turn in degrees (0 = facing us, 90 = rolled
  // up and away, -90 = waiting below) and whether it's drawn at all.
  function rollState(n, count, rollMs, ms) {
    var P = rollMs * count, T = ROLL.turnMs;
    var u = (((ms - n * rollMs) % P) + P) % P;
    if (u < rollMs - T) return { deg: 0, shown: true };
    if (u < rollMs) return { deg: 90 * rollEase((u - (rollMs - T)) / T), shown: true };
    if (u < P - T) return { deg: -90, shown: false };
    return { deg: -90 + 90 * rollEase((u - (P - T)) / T), shown: true };
  }

  // the turn as a transform: around the middle of a cube as deep as the roll is tall
  function rollTransform(deg, h) {
    return 'translateZ(' + (-h).toFixed(2) + 'px) rotateX(' + deg + 'deg) translateZ(' + h.toFixed(2) + 'px)';
  }

  // (Re)start a gig roll for its current height. One looping animation per face, matching rollState.
  function startRoll(roll, now) {
    var H = roll.offsetHeight;
    var count = roll.children.length;
    var rollMs = Number(roll.getAttribute('data-roll-ms')) || 14000;
    var size = H + 'x' + count + 'x' + rollMs;
    if (!H || count < 2 || roll.getAttribute('data-size') === size) return;
    roll.setAttribute('data-size', size);
    var P = rollMs * count, T = ROLL.turnMs, h = H / 2;
    var ease = 'cubic-bezier(' + ROLL.ease.join(', ') + ')';
    // Only the transform animates. A waiting face is parked turned around (180deg): faces never
    // draw their back (backface-visibility: hidden), so it's fully hidden without any fading.
    var frames = [
      { offset: 0, transform: rollTransform(0, h) },
      { offset: (rollMs - T) / P, transform: rollTransform(0, h), easing: ease },
      { offset: rollMs / P, transform: rollTransform(90, h) },
      { offset: rollMs / P, transform: rollTransform(180, h) },
      { offset: (P - T) / P, transform: rollTransform(180, h) },
      { offset: (P - T) / P, transform: rollTransform(-90, h), easing: ease },
      { offset: 1, transform: rollTransform(0, h) }
    ];
    Array.prototype.forEach.call(roll.children, function (face, n) {
      face.getAnimations().forEach(function (a) { a.cancel(); });
      var anim = face.animate(frames, { duration: P, iterations: Infinity });
      anim.startTime = now.tl - ((((now.ms - n * rollMs) % P) + P) % P);
    });
  }

  // start everything that isn't running yet, and refit lights and rolls to anything that changed size
  function startMotion() {
    var now = clockNow();
    var gs = document.querySelectorAll('.glow');
    for (var i = 0; i < gs.length; i++) startGlow(gs[i], now);
    var ts = document.querySelectorAll('.tier.best, .date');
    for (var j = 0; j < ts.length; j++) startBreathe(ts[j], now);
    var rs = document.querySelectorAll('.roll');
    for (var k = 0; k < rs.length; k++) startRoll(rs[k], now);
  }

  S.GLOW = GLOW;
  S.glowPath = glowPath;
  S.glowDotAt = glowDotAt;
  S.beatProgress = beatProgress;
  S.clockNow = clockNow;
  S.glow = glow;
  S.ROLL = ROLL;
  S.cubicBezier = cubicBezier;
  S.rollState = rollState;
  S.startMotion = startMotion;
})(window.DJStream = window.DJStream || {});
