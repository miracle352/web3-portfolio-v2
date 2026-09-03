/* ══════════════════════════════════════════════════════════
   FX — ambient canvas, cursor, reveals, scrollspy, tilt,
        magnets, counters, scramble, roller, toast
   ══════════════════════════════════════════════════════════ */

window.FX = (function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame.bind(window);

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ═══════════════ ambient canvas ═══════════════════════ */
  var Bg = (function () {
    var cv, ctx, w = 0, h = 0, dpr = 1, nodes = [], running = false, rafId = 0;
    var pointer = { x: -9999, y: -9999, active: false };
    var accent = '47,128,255';

    function hexToRgb(hex) {
      hex = String(hex || '').trim();
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return '47,128,255';
      return parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16);
    }

    function readAccent() {
      var c = getComputedStyle(document.documentElement).getPropertyValue('--accent');
      accent = hexToRgb(c);
    }

    function size() {
      if (!cv) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      // density scales with area but stays bounded on phones and 4K alike
      var target = clamp(Math.round((w * h) / 30000), 18, 62);
      nodes = [];
      for (var i = 0; i < target; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.1 + 0.5
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var link = 150;

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];

        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;

        // gentle drift away from the cursor
        if (pointer.active) {
          var pdx = n.x - pointer.x, pdy = n.y - pointer.y;
          var pd2 = pdx * pdx + pdy * pdy;
          if (pd2 < 24000 && pd2 > 1) {
            var pd = Math.sqrt(pd2);
            var push = (1 - pd / 155) * 0.5;
            n.x += (pdx / pd) * push;
            n.y += (pdy / pd) * push;
          }
        }

        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var dx = n.x - m.x, dy = n.y - m.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > link * link) continue;
          var a = (1 - Math.sqrt(d2) / link) * 0.17;
          ctx.strokeStyle = 'rgba(' + accent + ',' + a.toFixed(3) + ')';
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(' + accent + ',0.5)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, 6.2832);
        ctx.fill();
      }
    }

    function loop() {
      if (!running) return;
      draw();
      rafId = raf(loop);
    }

    function start() {
      if (running || reduced) return;
      running = true; loop();
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function init() {
      cv = $('#bg-canvas');
      if (!cv || !cv.getContext) return;
      ctx = cv.getContext('2d', { alpha: true });
      if (!ctx) return;
      readAccent();
      size();

      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(size, 180);
      }, { passive: true });

      document.addEventListener('visibilitychange', function () {
        document.hidden ? stop() : start();
      });

      if (fine) {
        window.addEventListener('pointermove', function (e) {
          pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
        }, { passive: true });
        window.addEventListener('pointerleave', function () { pointer.active = false; });
      }

      if (reduced) { draw(); return; }
      start();
    }

    return { init: init, start: start, stop: stop, refresh: function () { readAccent(); } };
  })();

  /* ═══════════════ cursor ═══════════════════════════════ */
  function initCursor() {
    if (!fine || reduced) return;
    var dot = $('#cursor'), ring = $('#cursor-ring');
    if (!dot || !ring) return;

    var tx = 0, ty = 0, rx = 0, ry = 0, on = false;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; rx = tx; ry = ty; document.body.classList.add('has-cursor'); }
    }, { passive: true });

    window.addEventListener('pointerdown', function () { document.body.classList.add('cursor-hot'); });
    window.addEventListener('pointerup', function () {
      if (!document.querySelector('.hot-target:hover')) document.body.classList.remove('cursor-hot');
    });

    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('.case')) {
        document.body.classList.add('cursor-case');
      } else if (t.closest('a,button,input,textarea,select,[data-edit]')) {
        document.body.classList.add('cursor-hot');
      }
    }, true);
    document.addEventListener('pointerout', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('.case')) document.body.classList.remove('cursor-case');
      if (t.closest('a,button,input,textarea,select,[data-edit]')) {
        document.body.classList.remove('cursor-hot');
      }
    }, true);

    (function tick() {
      dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      raf(tick);
    })();
  }

  /* ═══════════════ pointer glow var ═════════════════════ */
  function initGlow() {
    if (!fine || reduced) return;
    var glow = $('#bg-glow');
    if (!glow) return;
    var t = 0;
    window.addEventListener('pointermove', function (e) {
      var now = performance.now();
      if (now - t < 40) return;
      t = now;
      glow.style.setProperty('--mx', (e.clientX / window.innerWidth * 100).toFixed(1) + '%');
      glow.style.setProperty('--my', (e.clientY / window.innerHeight * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ═══════════════ reveal on scroll ═════════════════════ */
  var revealIO = null;
  function initReveal() {
    if (reduced) {
      $$('.reveal, .stagger').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        revealIO.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

    observeReveals();
  }
  function observeReveals(root) {
    if (!revealIO) return;
    $$('.reveal:not(.in), .stagger:not(.in)', root).forEach(function (el) {
      revealIO.observe(el);
    });
  }

  /* ═══════════════ scrollspy + progress + nav ═══════════ */
  function initScroll() {
    var nav = $('#nav');
    var bar = $('#scroll-progress');
    var spies = $$('[data-spy]');
    var rails = $$('[data-rail]');
    var secs = $$('main section[id]');
    var ticking = false;
    var lastY = 0;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      raf(function () {
        var y = window.scrollY || document.documentElement.scrollTop;

        if (nav) {
          nav.classList.toggle('stuck', y > 20);
          // hide on the way down, bring it back the moment you
          // scroll up — but never while a modal owns the page,
          // and never so close to the top that it flickers
          var hide = y > 260 && y > lastY + 4 && !document.body.classList.contains('locked');
          if (hide) nav.classList.add('hide');
          else if (y < lastY - 4 || y <= 260) nav.classList.remove('hide');
        }
        lastY = y;

        if (bar) {
          var doc = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.width = (doc > 0 ? clamp(y / doc, 0, 1) * 100 : 0) + '%';
        }

        // nearest section to the upper third of the viewport
        var mark = y + window.innerHeight * 0.34;
        var active = secs.length ? secs[0].id : '';
        for (var i = 0; i < secs.length; i++) {
          if (secs[i].offsetTop <= mark) active = secs[i].id;
        }
        spies.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('data-spy') === active);
        });
        rails.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('data-rail') === active);
        });

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ═══════════════ counters ═════════════════════════════ */
  function countUp(el, raw) {
    var str = String(raw == null ? '' : raw);
    var m = str.match(/^(\D*)([\d.,]+)(.*)$/);
    if (!m || reduced) { el.textContent = str; return; }

    var pre = m[1], numStr = m[2], post = m[3];
    var hasComma = numStr.indexOf(',') > -1;
    var target = parseFloat(numStr.replace(/,/g, ''));
    if (!isFinite(target)) { el.textContent = str; return; }

    var decimals = (numStr.split('.')[1] || '').length;
    var pad = /^0\d/.test(numStr) ? numStr.replace('.', '').length : 0;
    var t0 = performance.now();
    var dur = 1100;

    function fmt(v) {
      var s = decimals ? v.toFixed(decimals) : String(Math.round(v));
      if (pad) while (s.length < pad) s = '0' + s;
      if (hasComma) {
        var bits = s.split('.');
        bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        s = bits.join('.');
      }
      return s;
    }

    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * eased) + post;
      if (p < 1) raf(step);
      else el.textContent = pre + fmt(target) + post;
    })(t0);
  }

  function watchCounters(root) {
    var els = $$('[data-count]', root);
    if (!els.length) return;
    if (reduced) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countUp(en.target, en.target.getAttribute('data-count'));
        io.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ═══════════════ sparkline bars ═══════════════════════ */
  function drawSpark(el, n) {
    if (!el) return;
    el.innerHTML = '';
    n = n || 22;
    for (var i = 0; i < n; i++) {
      var b = document.createElement('i');
      // deterministic-ish rising shape with variance
      var base = 22 + (i / n) * 52;
      var jitter = Math.sin(i * 1.7) * 14 + Math.cos(i * 0.9) * 8;
      b.style.height = clamp(base + jitter, 12, 100) + '%';
      b.style.animationDelay = (i * 28) + 'ms';
      el.appendChild(b);
    }
  }

  /* ═══════════════ text scramble ════════════════════════ */
  var GLYPHS = '█▓▒░#$%&/\\<>*+=—0123456789ABCDEFXYZ';
  function scramble(el, finalText, dur) {
    if (reduced) { el.textContent = finalText; return; }
    var chars = finalText.split('');
    var t0 = performance.now();
    dur = dur || 900;

    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var reveal = Math.floor(p * chars.length * 1.25);
      var out = '';
      for (var i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') { out += ' '; continue; }
        out += i < reveal ? chars[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) raf(step);
      else el.textContent = finalText;
    })(t0);
  }

  function initScramble() {
    var el = $('[data-scramble]');
    if (!el || reduced || !fine) return;
    var busy = false;
    el.addEventListener('pointerenter', function () {
      // never scramble a field the user is inline-editing
      if (busy || document.body.classList.contains('quick')) return;
      busy = true;
      var text = el.textContent;
      scramble(el, text, 700);
      setTimeout(function () { busy = false; }, 780);
    });
  }

  /* ═══════════════ role roller ══════════════════════════ */
  var rollerTimer = null;
  function initRoller(items) {
    var box = $('#roller');
    if (!box) return;
    clearInterval(rollerTimer);
    var list = (items || []).filter(Boolean);
    if (!list.length) { box.innerHTML = ''; return; }

    box.innerHTML = '<b>' + esc(list[0]) + '</b>';
    if (list.length < 2 || reduced) return;

    var i = 0;
    rollerTimer = setInterval(function () {
      if (document.hidden) return;
      var old = box.querySelector('b');
      i = (i + 1) % list.length;
      var next = document.createElement('b');
      next.textContent = list[i];
      next.className = 'in';
      if (old) {
        old.className = 'out';
        setTimeout(function () { if (old.parentNode) old.remove(); }, 400);
      }
      box.appendChild(next);
    }, 2600);
  }

  /* ═══════════════ magnetic buttons ═════════════════════ */
  function initMagnets(root) {
    if (!fine || reduced) return;
    $$('.magnet', root).forEach(function (el) {
      if (el.dataset.magnetOn) return;
      el.dataset.magnetOn = '1';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + (dx * 7).toFixed(2) + 'px,' + (dy * 7).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ═══════════════ card spotlight ═══════════════════════
     Feeds --cx/--cy to the card's radial highlight. The 3D
     tilt this used to do was dropped on purpose: rotating a
     case card on hover is the single loudest "template" tell,
     and it fights the flat, hairline language everywhere else.
     The lift is handled in CSS now.                          */
  function initTilt(root) {
    if (!fine || reduced) return;
    $$('.case', root).forEach(function (el) {
      if (el.dataset.tiltOn) return;
      el.dataset.tiltOn = '1';

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--cx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        el.style.setProperty('--cy', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      }, { passive: true });
    });
  }

  /* ═══════════════ clock ════════════════════════════════ */
  var clockTimer = null;
  function initClock() {
    var el = $('#clock');
    if (!el) return;
    function paint() {
      var d = new Date();
      el.textContent = String(d.getHours()).padStart(2, '0') + ':' +
                       String(d.getMinutes()).padStart(2, '0');
    }
    paint();
    // identity() re-runs on every render, so never stack intervals
    if (clockTimer) return;
    clockTimer = setInterval(paint, 15000);
  }

  /* ═══════════════ mobile dock ══════════════════════════ */
  function initDock() {
    var dock = $('#dock');
    var contact = $('#contact');
    var heroCta = $('.hero-cta');
    if (!dock || !('IntersectionObserver' in window)) return;
    if (contact) {
      var io = new IntersectionObserver(function (entries) {
        dock.classList.toggle('away', entries.some(function (e) { return e.isIntersecting; }));
      }, { threshold: 0.22 });
      io.observe(contact);
    }
    if (heroCta) {
      var io2 = new IntersectionObserver(function (entries) {
        dock.classList.toggle('home', entries.some(function (e) { return e.isIntersecting; }));
      }, { threshold: 0.45 });
      io2.observe(heroCta);
    }
  }

  /* ═══════════════ toast ════════════════════════════════ */
  var toastTimer = null;
  function toast(msg, opts) {
    opts = opts || {};
    var el = $('#toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.innerHTML = '';

    var span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);

    if (opts.action && typeof opts.onAction === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opts.action;
      btn.addEventListener('click', function () {
        el.hidden = true;
        opts.onAction();
      });
      el.appendChild(btn);
    }

    el.hidden = false;
    // restart the entry animation
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';

    toastTimer = setTimeout(function () { el.hidden = true; }, opts.ms || 3200);
  }

  /* ═══════════════ smooth anchor scroll ═════════════════ */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-nav]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY -
                (href === '#home' ? 0 : 78);
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
      PF.emit('navigate', href.slice(1));
    });
  }

  /* ═══════════════ small utils ══════════════════════════ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res, rej) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        res();
      } catch (e) { rej(e); }
    });
  }

  return {
    reduced: reduced, fine: fine,
    $: $, $$: $$, esc: esc, clamp: clamp, copy: copy,
    bg: Bg,
    initCursor: initCursor, initGlow: initGlow, initDock: initDock,
    initReveal: initReveal, observeReveals: observeReveals,
    initScroll: initScroll, initAnchors: initAnchors,
    initScramble: initScramble, initRoller: initRoller,
    initMagnets: initMagnets, initTilt: initTilt, initClock: initClock,
    watchCounters: watchCounters, drawSpark: drawSpark,
    scramble: scramble, toast: toast
  };
})();
