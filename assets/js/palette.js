/* ══════════════════════════════════════════════════════════
   PALETTE — ⌘K / Ctrl+K command bar
   ══════════════════════════════════════════════════════════ */

window.PALETTE = (function () {
  'use strict';

  var $ = FX.$, $$ = FX.$$, esc = FX.esc;
  var el, input, list, items = [], cursor = 0, open = false;

  /* ─── command sources ────────────────────────────────── */
  function build() {
    var out = [];

    // sections
    [
      ['home', 'Top of page', '↑'],
      ['work', 'Work', '▦'],
      ['seats', 'Seats', '▤'],
      ['ops', 'How I operate', '◈'],
      ['timeline', 'Track record', '▸'],
      ['voices', 'What they said', '❝'],
      ['contact', 'Contact', '✉']
    ].forEach(function (s) {
      out.push({
        group: 'Go to', icon: s[2], title: s[1], sub: '#' + s[0], tag: 'section',
        run: function () {
          var t = document.getElementById(s[0]);
          if (!t) return;
          var top = t.getBoundingClientRect().top + window.scrollY - (s[0] === 'home' ? 0 : 78);
          window.scrollTo({ top: Math.max(0, top), behavior: FX.reduced ? 'auto' : 'smooth' });
        }
      });
    });

    // works
    (PF.state.works || []).forEach(function (w) {
      out.push({
        group: 'Open a case', icon: '◆',
        title: w.title || 'Untitled',
        sub: [w.client, w.role, w.chain, w.year].filter(Boolean).join(' · '),
        tag: w.category || 'case',
        run: function () { RENDER.openCase(w.id); }
      });
    });

    // actions
    out.push({
      group: 'Do', icon: '✎', title: 'Open Studio', sub: 'Add and edit everything', tag: 'E',
      run: function () { STUDIO.open(); }
    });
    out.push({
      group: 'Do', icon: '✐',
      title: document.body.classList.contains('quick') ? 'Turn off inline edit' : 'Inline edit on the page',
      sub: 'Click text on the live site to change it', tag: 'I',
      run: function () { RENDER.setQuick(!document.body.classList.contains('quick')); }
    });

    var p = PF.state.profile || {};
    if (p.email) {
      out.push({
        group: 'Do', icon: '@', title: 'Copy email', sub: p.email, tag: 'copy',
        run: function () { FX.copy(p.email).then(function () { FX.toast('Email copied'); }); }
      });
    }
    if (p.discord) {
      out.push({
        group: 'Do', icon: '#', title: 'Copy Discord', sub: p.discord, tag: 'copy',
        run: function () { FX.copy(p.discord).then(function () { FX.toast('Discord copied'); }); }
      });
    }

    out.push({
      group: 'Do', icon: '↓', title: 'Download portfolio.json', sub: 'Your content as a file you can commit', tag: 'export',
      run: function () { PF.download('portfolio.json'); FX.toast('Downloaded portfolio.json'); }
    });
    out.push({
      group: 'Do', icon: '⧉', title: 'Copy this page link', sub: window.location.href, tag: 'copy',
      run: function () { FX.copy(window.location.href).then(function () { FX.toast('Link copied'); }); }
    });

    // accents
    Object.keys(PF.accents).forEach(function (key) {
      var a = PF.accents[key];
      out.push({
        group: 'Accent', swatch: a.accent, icon: '●',
        title: a.name, sub: a.accent, tag: 'theme',
        run: function () {
          PF.applyAccent(key);
          PF.set('profile.accent', key, { group: 'accent' });
          FX.bg.refresh();
          FX.toast(a.name + ' accent');
        }
      });
    });

    return out;
  }

  /* ─── fuzzy scoring (subsequence + word-start bonus) ──── */
  function score(hay, needle) {
    hay = hay.toLowerCase();
    needle = needle.toLowerCase();
    if (!needle) return 1;
    if (hay.indexOf(needle) > -1) return 100 - hay.indexOf(needle);

    var hi = 0, s = 0, streak = 0;
    for (var ni = 0; ni < needle.length; ni++) {
      var c = needle[ni];
      var found = -1;
      while (hi < hay.length) {
        if (hay[hi] === c) { found = hi; hi++; break; }
        hi++;
      }
      if (found < 0) return 0;
      streak = (found > 0 && hay[found - 1] === ' ') ? streak + 3 : streak + 1;
      s += streak;
    }
    return s;
  }

  function render(q) {
    var all = build();
    var ranked;

    if (!q.trim()) {
      ranked = all;
    } else {
      ranked = all.map(function (it) {
        var best = Math.max(
          score(it.title, q) * 2,
          score(it.sub || '', q),
          score(it.tag || '', q)
        );
        return { it: it, s: best };
      })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (r) { return r.it; });
    }

    items = ranked;
    cursor = 0;

    if (!ranked.length) {
      list.innerHTML = '<div class="pal-empty">Nothing matches “' + esc(q) + '”.</div>';
      return;
    }

    var html = '', group = null;
    ranked.forEach(function (it, i) {
      if (it.group !== group) {
        group = it.group;
        html += '<div class="pal-group">' + esc(group) + '</div>';
      }
      var ico = it.swatch
        ? '<span class="pal-ico"><span class="pal-swatch" style="background:' + esc(it.swatch) + '"></span></span>'
        : '<span class="pal-ico">' + esc(it.icon || '›') + '</span>';
      html +=
        '<button class="pal-item" type="button" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
          ico +
          '<span class="pal-main"><b>' + esc(it.title) + '</b>' +
          (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</span>' +
          (it.tag ? '<span class="pal-tag">' + esc(it.tag) + '</span>' : '') +
        '</button>';
    });
    list.innerHTML = html;
  }

  function move(delta) {
    var btns = $$('.pal-item', list);
    if (!btns.length) return;
    cursor = (cursor + delta + btns.length) % btns.length;
    btns.forEach(function (b, i) { b.setAttribute('aria-selected', String(i === cursor)); });
    var active = btns[cursor];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function run(i) {
    var it = items[i];
    if (!it) return;
    hide();
    // let the palette close paint before the action runs
    requestAnimationFrame(function () { it.run(); });
  }

  function show() {
    if (open) return;
    open = true;
    el.hidden = false;
    document.body.classList.add('locked');
    input.value = '';
    render('');
    input.focus();
  }

  function hide() {
    if (!open) return;
    open = false;
    el.hidden = true;
    document.body.classList.remove('locked');
  }

  function toggle() { open ? hide() : show(); }

  /* ─── init ───────────────────────────────────────────── */
  function init() {
    el = $('#palette');
    input = $('#palette-q');
    list = $('#palette-list');

    input.addEventListener('input', function () { render(input.value); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(cursor); }
      else if (e.key === 'Escape') { e.preventDefault(); hide(); }
      else if (e.key === 'Tab') { e.preventDefault(); move(e.shiftKey ? -1 : 1); }
    });

    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (b) run(parseInt(b.getAttribute('data-i'), 10));
    });

    list.addEventListener('pointermove', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      if (i === cursor) return;
      cursor = i;
      $$('.pal-item', list).forEach(function (x, xi) {
        x.setAttribute('aria-selected', String(xi === cursor));
      });
    });

    el.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) hide();
    });

    $('#palette-btn').addEventListener('click', show);
    $('#palette-btn-2').addEventListener('click', show);
  }

  return { init: init, show: show, hide: hide, toggle: toggle, get open() { return open; } };
})();
