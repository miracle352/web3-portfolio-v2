/* ══════════════════════════════════════════════════════════
   APP — boot, global keys, drawer, studio triggers
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var $ = FX.$, $$ = FX.$$;

  /* ═══════════════ preloader ════════════════════════════ */
  var BOOT_LINES = [
    'reading portfolio',
    'mapping seats',
    'loading rooms',
    'wiring studio',
    'ready'
  ];

  function boot() {
    var fill = $('#boot-fill');
    var log = $('#boot-log');
    var i = 0;
    var done = false;

    var timer = setInterval(function () {
      if (done) return;
      i = Math.min(i + 1, BOOT_LINES.length - 1);
      log.textContent = BOOT_LINES[i];
      fill.style.width = (18 + i * 18) + '%';
    }, FX.reduced ? 40 : 130);

    return function finish() {
      done = true;
      clearInterval(timer);
      log.textContent = BOOT_LINES[BOOT_LINES.length - 1];
      fill.style.width = '100%';
      setTimeout(function () {
        $('#boot').classList.add('gone');
        document.body.removeAttribute('data-loading');
        setTimeout(function () {
          var b = $('#boot');
          if (b) b.remove();
        }, 700);
      }, FX.reduced ? 0 : 260);
    };
  }

  /* ═══════════════ mobile drawer ════════════════════════ */
  function initDrawer() {
    var burger = $('#burger');
    var drawer = $('#drawer');
    var openState = false;

    function set(next) {
      openState = next;
      drawer.hidden = !next;
      burger.setAttribute('aria-expanded', String(next));
      burger.setAttribute('aria-label', next ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('locked', next);
    }

    burger.addEventListener('click', function () { set(!openState); });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) set(false);
    });

    $('#edit-btn-m').addEventListener('click', function () {
      set(false);
      STUDIO.open();
    });

    window.addEventListener('resize', function () {
      if (openState && window.innerWidth > 960) set(false);
    }, { passive: true });

    return { close: function () { if (openState) set(false); }, get open() { return openState; } };
  }

  /* ═══════════════ global keys ══════════════════════════ */
  function typing(e) {
    var t = e.target;
    if (!t) return false;
    var tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' ||
           t.isContentEditable === true;
  }

  function initKeys(drawer) {
    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;

      /* palette — works everywhere */
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        PALETTE.toggle();
        return;
      }

      /* undo / redo. While a field is focused the browser's own field-level
         undo is the useful one, so leave that alone. */
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (typing(e)) return;
        e.preventDefault();
        var ok = e.shiftKey ? PF.redo() : PF.undo();
        if (ok) {
          if (STUDIO.isOpen) STUDIO.paint();
          FX.toast(e.shiftKey ? 'Redone' : 'Undone');
        }
        return;
      }

      if (e.key === 'Escape') {
        if (PALETTE.open) { PALETTE.hide(); return; }
        if (drawer.open) { drawer.close(); return; }
        if (!$('#dossier').hidden) return;      // handled in render.js
        if (document.body.classList.contains('quick')) { RENDER.setQuick(false); return; }
        if (STUDIO.isOpen) { STUDIO.close(); return; }
      }

      if (typing(e)) return;

      /* single-key shortcuts */
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); STUDIO.toggle(); return; }
      if (e.key === 'i' || e.key === 'I') {
        if (STUDIO.isOpen) return;
        e.preventDefault();
        RENDER.setQuick(!document.body.classList.contains('quick'));
        return;
      }
      if (e.key === '/') {
        if (STUDIO.isOpen) return;
        e.preventDefault();
        var s = $('#work-search');
        if (s) {
          s.scrollIntoView({ block: 'center', behavior: FX.reduced ? 'auto' : 'smooth' });
          s.focus();
        }
        return;
      }
      if (e.key === '?') { e.preventDefault(); PALETTE.show(); return; }
    });
  }

  /* ═══════════════ studio triggers ══════════════════════ */
  function initStudioButtons() {
    ['#edit-btn', '#edit-btn-2'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('click', function () { STUDIO.open(); });
    });
  }

  /* ═══════════════ re-render on state change ════════════ */
  function initReactivity() {
    var pending = false;
    PF.on('change', function () {
      if (STUDIO.isOpen) return;       // studio repaints itself; site repaints on close
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        RENDER.all();
      });
    });

    PF.on('accent', function () { FX.bg.refresh(); });
  }

  /* ═══════════════ deep links ═══════════════════════════ */
  function handleDeepLink() {
    var q = window.location.search || '';
    var hash = window.location.hash || '';

    if (/[?&]studio\b/.test(q) || hash === '#studio') {
      STUDIO.open();
      return;
    }
    if (/[?&]edit\b/.test(q)) {
      RENDER.setQuick(true);
      return;
    }
    if (hash && hash.length > 1 && hash !== '#studio') {
      var el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(function () {
          window.scrollTo({
            top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 78),
            behavior: 'auto'
          });
        }, 60);
      }
    }
  }

  /* ═══════════════ go ═══════════════════════════════════ */
  function start() {
    var finish = boot();

    FX.bg.init();
    FX.initCursor();
    FX.initGlow();
    FX.initDock();
    FX.initReveal();
    FX.initScroll();
    FX.initAnchors();

    var drawer = initDrawer();
    initKeys(drawer);
    initStudioButtons();
    initReactivity();

    RENDER.wire();
    PALETTE.init();
    STUDIO.init();

    PF.boot().then(function (source) {
      RENDER.all();
      FX.initScramble();
      handleDeepLink();
      finish();

      if (source === 'seed' || source === 'json') {
        var samples = (PF.state.works || []).filter(function (w) { return w.sample; }).length;
        if (samples) {
          setTimeout(function () {
            FX.toast('Sample content loaded — press E to add your real work', {
              action: 'Open Studio', ms: 7000,
              onAction: function () { STUDIO.open('works'); }
            });
          }, 1200);
        }
      }
    }).catch(function (err) {
      console.error('[boot]', err);
      RENDER.all();
      finish();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
