/* ══════════════════════════════════════════════════════════
   RENDER — paints every section from PF.state
   ══════════════════════════════════════════════════════════ */

window.RENDER = (function () {
  'use strict';

  var $ = FX.$, $$ = FX.$$, esc = FX.esc;

  var ICONS = {
    x:        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.2 22H3l7.3-8.3L2 2h6.3l4.6 6.1L18.9 2Zm-1.1 18h1.7L7.4 3.8H5.6L17.8 20Z"/></svg>',
    discord:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.9A16.4 16.4 0 0 0 16.2 3.7l-.3.6a12.4 12.4 0 0 1 3.6 1.8 17.6 17.6 0 0 0-15 0A12.4 12.4 0 0 1 8.1 4.3l-.3-.6A16.4 16.4 0 0 0 3.7 4.9C1.1 8.7.4 12.5.7 16.2A16.6 16.6 0 0 0 5.8 18.8l.6-.9a10.9 10.9 0 0 1-1.8-.9l.4-.3a11.9 11.9 0 0 0 10 0l.4.3a10.9 10.9 0 0 1-1.8.9l.6.9a16.6 16.6 0 0 0 5.1-2.6c.4-4.3-.6-8.1-3-11.3ZM8.3 14.1c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 19 19.2c-.2 1-.8 1.2-1.6.7l-4.4-3.2-2.1 2c-.2.3-.5.4-.9.4l.3-4.4 8.1-7.3c.4-.3-.1-.5-.6-.2L7.8 12.5 3.5 11.2c-.9-.3-.9-.9.2-1.3L20.4 3.3c.8-.3 1.6.2 1.5 1Z"/></svg>',
    globe:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>',
    mail:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
    cal:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    arrow:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h13M12 5l7 7-7 7"/></svg>'
  };

  /* filter + view state */
  var view = { cat: 'all', chain: 'all', q: '', sort: 'curated', seat: '' };
  var shown = [];          // ids currently in the grid, in display order
  var openId = null;

  var CHAIN_TINT = {
    ethereum: '#627eea', eth: '#627eea',
    solana: '#14f195', sol: '#14f195',
    base: '#0052ff',
    bitcoin: '#f7931a', btc: '#f7931a',
    near: '#00ec97',
    abstract: '#7c5cff',
    polygon: '#8247e5', matic: '#8247e5',
    arbitrum: '#12aaff',
    optimism: '#ff0420',
    avalanche: '#e84142',
    bnb: '#f3ba2f', bsc: '#f3ba2f',
    sui: '#4da2ff',
    aptos: '#2dd8a7'
  };

  function chainTint(name) {
    var k = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return CHAIN_TINT[k] || '';
  }

  function normKey(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function matchesSeat(w, seat) {
    var n = normKey(seat);
    if (!n) return true;
    var role = normKey(w.role);
    var cat = normKey(w.category);
    if (role === n || cat === n) return true;
    if (role.length >= 4 && (role.indexOf(n) > -1 || n.indexOf(role) > -1)) return true;
    if (cat.length >= 4 && (cat.indexOf(n) > -1 || n.indexOf(cat) > -1)) return true;
    var tags = w.tags || [];
    for (var i = 0; i < tags.length; i++) {
      var t = normKey(tags[i]);
      if (!t) continue;
      if (t === n) return true;
      if (t.length >= 4 && (n.indexOf(t) > -1 || t.indexOf(n) > -1)) return true;
    }
    return false;
  }

  /* ─── quick (inline) edit binding ─────────────────────── */
  function paintBindings() {
    $$('[data-edit]').forEach(function (el) {
      var path = el.getAttribute('data-edit');
      var val = PF.get(path, '');
      if (el.id === 'hero-name' && el.querySelector('i') && el.textContent === val) return;
      if (el.textContent !== val) el.textContent = val;
    });
  }

  function bindQuickEdit() {
    $$('[data-edit]').forEach(function (el) {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';

      el.addEventListener('focus', function () {
        el.dataset.before = el.textContent;
      });

      el.addEventListener('blur', function () {
        if (!document.body.classList.contains('quick')) return;
        var next = el.textContent.replace(/\s+/g, ' ').trim();
        var path = el.getAttribute('data-edit');
        if (next === (el.dataset.before || '').trim()) return;
        PF.set(path, next, { group: 'quick:' + path });
        FX.toast('Saved');
      });

      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
        if (e.key === 'Escape') { el.textContent = el.dataset.before || ''; el.blur(); }
      });

      // force plain text on paste (matters where plaintext-only isn't supported)
      el.addEventListener('paste', function (e) {
        if (!document.body.classList.contains('quick')) return;
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text') || '';
        document.execCommand('insertText', false, text.replace(/\s+/g, ' '));
      });
    });
  }

  function setQuick(on) {
    document.body.classList.toggle('quick', !!on);
    var bar = $('#quickbar');
    if (bar) bar.hidden = !on;
    if (on) flattenName();
    $$('[data-edit]').forEach(function (el) {
      if (on) {
        // plaintext-only is nicer but Firefox ignores it — fall back to true
        el.setAttribute('contenteditable', 'plaintext-only');
        if (!el.isContentEditable) el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('tabindex', '0');
      } else {
        el.removeAttribute('contenteditable');
        el.removeAttribute('tabindex');
      }
    });
    if (!on) paintName(PF.get('profile.name', ''));
    PF.setPref('quick', !!on);
  }

  /* ─── identity / hero ─────────────────────────────────── */
  function flattenName() {
    var el = $('#hero-name');
    if (!el) return;
    var name = PF.get('profile.name', el.textContent);
    el.textContent = name;
    el.removeAttribute('data-painted');
  }

  function paintName(name) {
    var el = $('#hero-name');
    if (!el) return;
    name = String(name || '');
    if (document.body.classList.contains('quick')) {
      if (el.textContent !== name) el.textContent = name;
      el.removeAttribute('data-painted');
      return;
    }
    if (el.getAttribute('data-painted') === name && el.querySelector('i')) return;
    el.setAttribute('data-painted', name);
    var frag = document.createDocumentFragment();
    Array.from(name).forEach(function (ch, i) {
      var s = document.createElement('i');
      s.style.setProperty('--i', String(i));
      if (ch === ' ') s.className = 'sp';
      else s.textContent = ch;
      frag.appendChild(s);
    });
    el.textContent = '';
    el.appendChild(frag);
  }

  function paintSeats() {
    var el = $('#seat-stack');
    if (!el) return;
    var seats = (PF.state.profile || {}).seats || [];
    el.innerHTML = seats.map(function (s, i) {
      var on = view.seat === s;
      return '<button class="seat-row" type="button" data-seat="' + esc(s) + '" ' +
        'aria-pressed="' + on + '">' +
        '<span class="seat-row-n">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="seat-row-t">' + esc(s) + '</span>' +
        '<span class="seat-row-go">' + (on ? 'Showing' : 'See work') + ' ' + ICONS.arrow + '</span>' +
      '</button>';
    }).join('');
  }

  function paintHeroChains() {
    var wrap = $('#hero-proof');
    var el = $('#hero-chains');
    if (!el) return;
    var chains = PF.state.chains || [];
    if (wrap) wrap.hidden = !chains.length;
    el.innerHTML = chains.map(function (c) {
      var tint = chainTint(c);
      var on = view.chain === c;
      return '<button type="button" class="hero-chain" data-chain="' + esc(c) + '" ' +
        'aria-pressed="' + on + '"' +
        (tint ? ' style="--chip:' + tint + '"' : '') + '>' +
        '<i></i>' + esc(c) + '</button>';
    }).join('');
  }

  function paintHint() {
    var hint = $('#work-hint');
    var text = $('#work-hint-text');
    if (!hint || !text) return;
    if (!view.seat) { hint.hidden = true; return; }
    var bits = [view.seat];
    if (view.chain && view.chain !== 'all') bits.push(view.chain);
    hint.hidden = false;
    text.textContent = 'Showing ' + bits.join(' · ') + ' work';
  }

  function identity() {
    var p = PF.state.profile || {};
    var brand = p.brand || 'IYAN';
    var initial = (brand.trim().charAt(0) || 'I').toUpperCase();

    document.title = brand + ' — ' + (p.seats || []).join(' · ');
    var d = $('meta[name="description"]');
    if (d && p.bio) d.setAttribute('content', p.bio.slice(0, 180));

    var setText = function (sel, val) {
      var n = $(sel);
      if (n) n.textContent = val;
    };

    setText('#brand-name', brand);
    setText('#brand-mark', initial);
    setText('#foot-brand', brand);
    setText('#foot-word', brand);
    setText('#year', String(new Date().getFullYear()));
    setText('#op-badge', (p.seats || []).length + ' seats');

    paintName(p.name || brand);
    paintSeats();
    paintHeroChains();

    var tz = $('#clock-tz');
    if (tz) {
      var raw = String(p.timezone || '');
      var code = raw.split(/[·•/,|-]/)[0].trim();
      tz.textContent = code || '';
      tz.hidden = !code;
    }

    var rows = [
      ['Based', p.location],
      ['Timezone', p.timezone],
      ['Operating since', p.since],
      ['Handle', p.handle],
      ['Chains', (PF.state.chains || []).slice(0, 3).join(' · ')]
    ].filter(function (r) { return r[1]; });

    var opRows = $('#op-rows');
    if (opRows) {
      opRows.innerHTML = rows.map(function (r) {
        return '<div class="op-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('');
    }

    var links = socialLinks(p);
    var html = links.map(function (l) {
      return '<a class="chip" href="' + esc(l.href) + '"' +
             (l.ext ? ' target="_blank" rel="noopener noreferrer"' : '') +
             '>' + l.icon + '<span>' + esc(l.label) + '</span></a>';
    }).join('');
    ['#socials', '#contact-socials', '#drawer-socials'].forEach(function (sel) {
      var node = $(sel); if (node) node.innerHTML = html;
    });

    FX.initClock();

    var ld = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: p.name || brand,
      alternateName: p.handle || undefined,
      jobTitle: (p.seats || []).join(', '),
      description: p.bio || undefined,
      email: p.email ? 'mailto:' + p.email : undefined,
      address: p.location ? { '@type': 'PostalAddress', addressLocality: p.location } : undefined,
      sameAs: [p.twitter, p.website].filter(Boolean)
    };
    var ldEl = $('#ld-json');
    if (ldEl) ldEl.textContent = JSON.stringify(ld);
  }

  function socialLinks(p) {
    var out = [];
    if (p.twitter)  out.push({ label: p.handle || 'X', href: p.twitter, icon: ICONS.x, ext: true });
    if (p.discord)  out.push({ label: p.discord, href: 'https://discord.com/users/' + encodeURIComponent(p.discord), icon: ICONS.discord, ext: true });
    if (p.telegram) out.push({ label: 'Telegram', href: p.telegram.indexOf('http') === 0 ? p.telegram : 'https://t.me/' + p.telegram.replace(/^@/, ''), icon: ICONS.telegram, ext: true });
    if (p.email)    out.push({ label: p.email, href: 'mailto:' + p.email, icon: ICONS.mail });
    if (p.website)  out.push({ label: 'Website', href: p.website, icon: ICONS.globe, ext: true });
    if (p.calendly) out.push({ label: 'Book a call', href: p.calendly, icon: ICONS.cal, ext: true });
    return out;
  }

  /* ─── stats + ticker ──────────────────────────────────── */
  function stats() {
    var list = PF.state.stats || [];
    $('#statbar').innerHTML = list.map(function (s) {
      var v = String(s.value == null ? '' : s.value) + (s.suffix || '');
      return '<div class="stat"><b data-count="' + esc(v) + '">' + esc(v) + '</b>' +
             '<span>' + esc(s.label || '') + '</span></div>';
    }).join('');
    FX.watchCounters($('#statbar'));
  }

  function ticker() {
    var items = (PF.state.ticker || []).filter(Boolean);
    if (!items.length) items = (PF.state.profile.seats || []);
    var run = items.map(function (t) { return esc(t); }).join(' <i>◆</i> ');
    // duplicated so the -50% marquee loops seamlessly
    var html = '<span>' + run + ' <i>◆</i> </span><span>' + run + ' <i>◆</i> </span>';
    $('#tick-a').innerHTML = html;
    $('#tick-b').innerHTML = html;
  }

  /* ─── work grid ───────────────────────────────────────── */
  function categories() {
    var seen = {}, out = [];
    (PF.state.works || []).forEach(function (w) {
      var c = (w.category || '').trim();
      if (!c || seen[c]) return;
      seen[c] = true;
      out.push(c);
    });
    return out;
  }

  function chainList() {
    var seen = {}, out = [];
    (PF.state.works || []).forEach(function (w) {
      var c = (w.chain || '').trim();
      if (!c || seen[c]) return;
      seen[c] = true;
      out.push(c);
    });
    return out;
  }

  function countIn(cat) {
    return (PF.state.works || []).filter(function (w) {
      return cat === 'all' || (w.category || '') === cat;
    }).length;
  }

  function filters() {
    var cats = categories();
    if (view.cat !== 'all' && cats.indexOf(view.cat) === -1) view.cat = 'all';

    $('#filters').innerHTML =
      ['all'].concat(cats).map(function (c) {
        var label = c === 'all' ? 'All rooms' : c;
        return '<button class="filter" type="button" data-cat="' + esc(c) + '" ' +
               'aria-pressed="' + (view.cat === c) + '">' + esc(label) +
               '<em>' + countIn(c) + '</em></button>';
      }).join('');

    var chains = chainList();
    if (view.chain !== 'all' && chains.indexOf(view.chain) === -1) view.chain = 'all';

    $('#chainbar').innerHTML = chains.length > 1
      ? ['all'].concat(chains).map(function (c) {
          var tint = c === 'all' ? '' : chainTint(c);
          return '<button class="chain-btn" type="button" data-chain="' + esc(c) + '" ' +
                 'aria-pressed="' + (view.chain === c) + '"' +
                 (tint ? ' style="--chip:' + tint + '"' : '') + '>' +
                 (c === 'all' ? 'Every chain' : esc(c)) + '</button>';
        }).join('')
      : '';

    paintHeroChains();
    paintHint();
  }

  function match(w) {
    if (view.cat !== 'all' && (w.category || '') !== view.cat) return false;
    if (view.chain !== 'all' && (w.chain || '') !== view.chain) return false;
    if (view.seat && !matchesSeat(w, view.seat)) return false;
    var q = view.q.trim().toLowerCase();
    if (!q) return true;
    var hay = [w.title, w.client, w.role, w.chain, w.category, w.status,
               w.summary, w.description, (w.tags || []).join(' ')]
              .join(' ').toLowerCase();
    return hay.indexOf(q) > -1;
  }

  function sortWorks(list) {
    var a = list.slice();
    if (view.sort === 'new') {
      a.sort(function (x, y) { return String(y.year).localeCompare(String(x.year)); });
    } else if (view.sort === 'old') {
      a.sort(function (x, y) { return String(x.year).localeCompare(String(y.year)); });
    } else if (view.sort === 'az') {
      a.sort(function (x, y) { return String(x.title).localeCompare(String(y.title)); });
    } else {
      // curated: featured first, otherwise author order
      a.sort(function (x, y) { return (y.featured ? 1 : 0) - (x.featured ? 1 : 0); });
    }
    return a;
  }

  /* The word set into a generated cover. "Internal" is a
     bookkeeping label, not a client — fall back to the title. */
  function coverWord(w) {
    var c = (w.client || '').trim();
    if (c && c.toLowerCase() !== 'internal') return c;
    return (w.title || '').trim();
  }

  /* Built once, used by both the grid and the dossier, so the
     two can never drift apart.

     `idx` is the case's position in the authored list, so the
     cover pattern is stable across filters, sorts and reloads.
     Cycling the six patterns by index rather than hashing the
     id is deliberate: it guarantees neighbouring cards differ,
     where any hash small enough to mod down to 6 buckets will
     happily collide (`signal` and `harbor` have the same
     character sum) and leave repeated tiles side by side. */
  function genCoverEl(w, idx) {
    var el = document.createElement('div');
    el.className = 'case-gen';
    el.setAttribute('data-pat', idx % 6);
    el.style.setProperty('--tint', w.tint || 'var(--accent)');
    el.innerHTML = '<b>' + String(idx + 1).padStart(2, '0') + '</b>' +
                   '<span class="case-gen-word">' + esc(coverWord(w)) + '</span>';
    return el;
  }

  function coverHTML(w, idx) {
    if (w.cover) {
      return '<img src="' + esc(w.cover) + '" alt="' + esc(w.title || 'Case cover') +
             '" loading="lazy" decoding="async" />';
    }
    return genCoverEl(w, idx).outerHTML;
  }

  function cardHTML(w, idx) {
    var mini = (w.metrics || []).filter(function (m) { return m && m.value; }).slice(0, 2);
    var tint = w.tint || 'var(--accent)';

    return '' +
    '<button class="case' + (w.featured ? ' wide' : '') + '" type="button" ' +
      'data-case="' + esc(w.id) + '" data-chain="' + esc(w.chain || '') + '" ' +
      'style="--tint:' + esc(tint) + '">' +
      '<div class="case-cover">' +
        coverHTML(w, idx) +
        '<div class="case-badges">' +
          '<span class="pill">' + esc(w.role || w.category || 'Case') + '</span>' +
          '<span class="right">' +
            (w.chain ? '<span class="pill">' + esc(w.chain) + '</span>' : '') +
            (w.status ? '<span class="pill hot dot">' + esc(w.status) + '</span>' : '') +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="case-body">' +
        '<div class="case-meta">' +
          '<span>' + esc(w.client || '—') + '</span><s>/</s><span>' + esc(w.year || '') + '</span>' +
          (w.sample ? '<s>/</s><span style="color:var(--warn)">sample</span>' : '') +
        '</div>' +
        '<h3>' + esc(w.title || 'Untitled') + '</h3>' +
        '<p>' + esc(w.summary || '') + '</p>' +
        '<div class="case-mini">' +
          mini.map(function (m) {
            return '<div><b>' + esc(m.value) + '</b><span>' + esc(m.label || '') + '</span></div>';
          }).join('') +
          '<span class="case-open">Open case ' + ICONS.arrow + '</span>' +
        '</div>' +
      '</div>' +
    '</button>';
  }

  function works() {
    var all = PF.state.works || [];
    var list = sortWorks(all.filter(match));
    shown = list.map(function (w) { return w.id; });

    $('#work-count').textContent = all.length;
    var grid = $('#work-grid');
    var empty = $('#work-empty');

    if (!list.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    // index for generated covers follows the authored order, so the
    // big numeral on a card stays stable across filters
    grid.innerHTML = list.map(function (w) {
      return cardHTML(w, all.indexOf(w));
    }).join('');

    FX.initTilt(grid);
    paintSeats();
    paintHint();
  }

  /* ─── seats / ops / track / voices ────────────────────── */
  function services() {
    $('#services').innerHTML = (PF.state.services || []).map(function (s, i) {
      return '<article class="svc reveal">' +
        '<div class="svc-n">' + String(i + 1).padStart(2, '0') + '</div>' +
        '<h3>' + esc(s.title || '') + '</h3>' +
        '<p>' + esc(s.summary || '') + '</p>' +
        '<ul>' + (s.items || []).filter(Boolean).map(function (it) {
          return '<li>' + esc(it) + '</li>';
        }).join('') + '</ul>' +
      '</article>';
    }).join('');
    FX.observeReveals($('#services'));
  }

  function ops() {
    $('#chains').innerHTML = (PF.state.chains || []).map(function (c) {
      return '<span class="tag hot">' + esc(c) + '</span>';
    }).join('');

    $('#arsenal').innerHTML = (PF.state.arsenal || []).map(function (c) {
      return '<span class="tag">' + esc(c) + '</span>';
    }).join('');

    $('#directives').innerHTML = (PF.state.directives || []).map(function (d) {
      return '<div class="dir reveal"><h4>' + esc(d.title || '') + '</h4>' +
             '<p>' + esc(d.note || '') + '</p></div>';
    }).join('');
    FX.observeReveals($('#directives'));
  }

  function track() {
    $('#track').innerHTML = (PF.state.timeline || []).map(function (t) {
      return '<div class="tr reveal">' +
        '<div class="tr-year">' + esc(t.year || '') + '</div>' +
        '<div class="tr-rail"></div>' +
        '<div class="tr-main">' +
          '<h3>' + esc(t.title || '') + '</h3>' +
          (t.org ? '<span class="tr-org">' + esc(t.org) + '</span>' : '') +
          (t.note ? '<p>' + esc(t.note) + '</p>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    FX.observeReveals($('#track'));
  }

  var voiceIdx = 0;
  function voices() {
    var list = PF.state.voices || [];
    $('#voice-track').innerHTML = list.map(function (v) {
      var initial = (v.name || '?').trim().charAt(0).toUpperCase();
      return '<figure class="voice">' +
        '<span class="voice-q" aria-hidden="true">“</span>' +
        '<p>' + esc(v.quote || '') + '</p>' +
        '<footer>' +
          '<span class="voice-av">' + esc(initial) + '</span>' +
          '<span class="voice-who"><strong>' + esc(v.name || '') + '</strong>' +
          '<small>' + esc([v.role, v.handle].filter(Boolean).join(' · ')) + '</small></span>' +
        '</footer>' +
      '</figure>';
    }).join('');

    $('#voice-dots').innerHTML = list.map(function (_, i) {
      return '<button type="button" data-dot="' + i + '" aria-label="Quote ' + (i + 1) + '" ' +
             'aria-current="' + (i === 0) + '"></button>';
    }).join('');
    voiceIdx = 0;
  }

  function voiceGo(i) {
    var trackEl = $('#voice-track');
    var cards = $$('.voice', trackEl);
    if (!cards.length) return;
    voiceIdx = (i + cards.length) % cards.length;
    var card = cards[voiceIdx];
    trackEl.scrollTo({ left: card.offsetLeft - trackEl.offsetLeft, behavior: FX.reduced ? 'auto' : 'smooth' });
    $$('#voice-dots button').forEach(function (b, bi) {
      b.setAttribute('aria-current', String(bi === voiceIdx));
    });
  }

  /* ─── contact ─────────────────────────────────────────── */
  function contact() {
    var p = PF.state.profile || {};

    var direct = [];
    if (p.email) direct.push({ ico: ICONS.mail, label: 'Email', value: p.email, act: 'Copy', copy: p.email });
    if (p.discord) direct.push({ ico: ICONS.discord, label: 'Discord', value: p.discord, act: 'Copy', copy: p.discord });
    if (p.twitter) direct.push({ ico: ICONS.x, label: 'X / Twitter', value: p.handle || p.twitter, act: 'Open', href: p.twitter });
    if (p.calendly) direct.push({ ico: ICONS.cal, label: 'Book a call', value: 'Pick a slot', act: 'Open', href: p.calendly });

    $('#contact-direct').innerHTML = direct.map(function (d) {
      var inner =
        '<span class="cd-ico">' + d.ico + '</span>' +
        '<span class="cd-main"><span>' + esc(d.label) + '</span><b>' + esc(d.value) + '</b></span>' +
        '<span class="cd-act">' + esc(d.act) + '</span>';
      return d.href
        ? '<a class="cd" href="' + esc(d.href) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>'
        : '<button class="cd" type="button" data-copy="' + esc(d.copy) + '">' + inner + '</button>';
    }).join('');

    var seats = (p.seats || []).slice();
    if (!seats.length) seats = ['Community Lead'];
    $('#seat-select').innerHTML = seats.concat(['Something else'])
      .map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');

    var chains = (PF.state.chains || []).slice();
    $('#chain-select').innerHTML = chains.concat(['Multi-chain', 'Not decided'])
      .map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
  }

  function submitForm(e) {
    e.preventDefault();
    var f = e.currentTarget;
    var err = $('#form-err');
    var d = {};
    ['name', 'project', 'email', 'seat', 'chain', 'when', 'message'].forEach(function (k) {
      d[k] = (f.elements[k] && f.elements[k].value || '').trim();
    });

    if (!d.name || !d.email || !d.message) {
      err.textContent = 'Name, email and a short brief are required.';
      err.hidden = false;
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) {
      err.textContent = 'That email does not look right — check it and resend.';
      err.hidden = false;
      return;
    }
    err.hidden = true;

    var to = (PF.state.profile || {}).email || '';
    var subject = '[' + (d.seat || 'Seat') + '] ' + d.name + (d.project ? ' — ' + d.project : '');
    var body = [
      'Name: ' + d.name,
      'Project: ' + (d.project || '—'),
      'Email: ' + d.email,
      'Seat: ' + (d.seat || '—'),
      'Chain: ' + (d.chain || '—'),
      'Timeline: ' + (d.when || '—'),
      '',
      'What broke last time:',
      d.message,
      '',
      '— sent from ' + ((PF.state.profile || {}).brand || 'the') + ' portfolio'
    ].join('\n');

    if (!to) {
      FX.copy(body).then(function () {
        FX.toast('No email set yet — brief copied to your clipboard instead.', { ms: 4200 });
      });
      return;
    }

    window.location.href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    FX.toast('Opening your mail client…');
  }

  /* ─── dossier ─────────────────────────────────────────── */
  function findWork(id) {
    return (PF.state.works || []).filter(function (w) { return w.id === id; })[0] || null;
  }

  function openCase(id) {
    var w = findWork(id);
    if (!w) return;
    openId = id;
    var all = PF.state.works || [];
    var idx = all.indexOf(w);

    var cover = $('#d-cover');
    var oldImg = cover.querySelector('img, .case-gen');
    if (oldImg) oldImg.remove();
    if (w.cover) {
      var img = document.createElement('img');
      img.src = w.cover;
      img.alt = w.title || 'Case cover';
      cover.insertBefore(img, cover.firstChild);
    } else {
      cover.insertBefore(genCoverEl(w, idx), cover.firstChild);
    }
    cover.style.setProperty('--tint', w.tint || 'var(--accent)');

    $('#d-kicker').textContent = [w.category, w.role].filter(Boolean).join(' — ');
    $('#d-title').textContent = w.title || 'Untitled';

    var meta = [
      ['Client', w.client], ['Year', w.year], ['Seat', w.role],
      ['Chain', w.chain], ['Status', w.status]
    ].filter(function (m) { return m[1]; });

    $('#d-meta').innerHTML = meta.map(function (m) {
      return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>';
    }).join('');

    $('#d-summary').textContent = w.summary || '';
    $('#d-desc').textContent = w.description || '';

    var hl = (w.highlights || []).filter(Boolean);
    $('#d-highlights').innerHTML = hl.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('');
    $('#d-highlights').parentNode.style.display = hl.length ? '' : 'none';

    var mt = (w.metrics || []).filter(function (m) { return m && m.value; });
    $('#d-metrics').innerHTML = mt.map(function (m) {
      return '<div class="metric"><b>' + esc(m.value) + '</b><span>' + esc(m.label || '') + '</span></div>';
    }).join('');
    $('#d-metrics').parentNode.style.display = mt.length ? '' : 'none';

    $('#d-tags').innerHTML = (w.tags || []).map(function (t) {
      return '<span class="tag hot">' + esc(t) + '</span>';
    }).join('');

    var L = w.links || {};
    var lk = [];
    if (L.x) lk.push({ href: L.x, label: 'Thread', icon: ICONS.x });
    if (L.web) lk.push({ href: L.web, label: 'Site', icon: ICONS.globe });
    if (L.discord) lk.push({ href: L.discord, label: 'Discord', icon: ICONS.discord });
    $('#d-links').innerHTML = lk.map(function (l) {
      return '<a class="chip" href="' + esc(l.href) + '" target="_blank" rel="noopener noreferrer">' +
             l.icon + '<span>' + esc(l.label) + '</span></a>';
    }).join('');

    // prev / next walk the currently-shown (filtered) order
    var pos = shown.indexOf(id);
    var list = pos > -1 ? shown : all.map(function (x) { return x.id; });
    if (pos < 0) pos = list.indexOf(id);
    $('#d-pos').textContent = (pos + 1) + ' / ' + list.length;
    $('#d-prev').disabled = list.length < 2;
    $('#d-next').disabled = list.length < 2;

    var dossier = $('#dossier');
    dossier.hidden = false;
    document.body.classList.add('locked');
    $('#d-close').focus();
  }

  function stepCase(dir) {
    var list = shown.length ? shown : (PF.state.works || []).map(function (w) { return w.id; });
    if (list.length < 2) return;
    var i = list.indexOf(openId);
    if (i < 0) i = 0;
    openCase(list[(i + dir + list.length) % list.length]);
  }

  function closeCase() {
    var wasOpen = openId;
    $('#dossier').hidden = true;
    document.body.classList.remove('locked');
    openId = null;
    // send focus back to the card that opened it
    var card = wasOpen ? $('[data-case="' + wasOpen + '"]') : null;
    if (card) card.focus();
  }

  /* ─── wiring ──────────────────────────────────────────── */
  function wire() {
    // work grid
    $('#work-grid').addEventListener('click', function (e) {
      var card = e.target.closest('[data-case]');
      if (card) openCase(card.getAttribute('data-case'));
    });

    $('#filters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      view.cat = b.getAttribute('data-cat');
      view.seat = '';
      filters(); works();
    });

    function applyChain(next) {
      if (!next || next === 'all') view.chain = 'all';
      else view.chain = view.chain === next ? 'all' : next;
      filters(); works();
    }

    $('#chainbar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-chain]');
      if (!b) return;
      applyChain(b.getAttribute('data-chain'));
    });

    var heroChains = $('#hero-chains');
    if (heroChains) {
      heroChains.addEventListener('click', function (e) {
        var b = e.target.closest('[data-chain]');
        if (!b) return;
        applyChain(b.getAttribute('data-chain'));
        var work = $('#work');
        if (work) {
          var top = work.getBoundingClientRect().top + window.scrollY - 78;
          window.scrollTo({ top: Math.max(0, top), behavior: FX.reduced ? 'auto' : 'smooth' });
        }
      });
    }

    var stack = $('#seat-stack');
    if (stack) {
      stack.addEventListener('click', function (e) {
        var row = e.target.closest('[data-seat]');
        if (!row) return;
        var seat = row.getAttribute('data-seat') || '';
        view.seat = view.seat === seat ? '' : seat;
        view.cat = 'all';
        if (view.seat) {
          var n = normKey(view.seat);
          var cats = categories();
          for (var i = 0; i < cats.length; i++) {
            var c = normKey(cats[i]);
            if (c && (c === n || n.indexOf(c) > -1 || c.indexOf(n) > -1)) {
              view.cat = cats[i];
              break;
            }
          }
        }
        filters(); works();
        var work = $('#work');
        if (work) {
          var top = work.getBoundingClientRect().top + window.scrollY - 78;
          window.scrollTo({ top: Math.max(0, top), behavior: FX.reduced ? 'auto' : 'smooth' });
        }
      });
    }

    var searchT;
    $('#work-search').addEventListener('input', function (e) {
      clearTimeout(searchT);
      var v = e.target.value;
      searchT = setTimeout(function () { view.q = v; works(); }, 140);
    });

    $('#work-sort').addEventListener('change', function (e) {
      view.sort = e.target.value; works();
    });

    function resetView() {
      view = { cat: 'all', chain: 'all', q: '', sort: 'curated', seat: '' };
      var s = $('#work-search'); if (s) s.value = '';
      var o = $('#work-sort'); if (o) o.value = 'curated';
      filters(); works();
    }

    $('#work-reset').addEventListener('click', resetView);
    var hintClear = $('#work-hint-clear');
    if (hintClear) hintClear.addEventListener('click', resetView);

    // dossier
    $('#d-close').addEventListener('click', closeCase);
    $('#dossier').addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeCase();
    });
    $('#d-prev').addEventListener('click', function () { stepCase(-1); });
    $('#d-next').addEventListener('click', function () { stepCase(1); });

    // voices
    $('#voice-prev').addEventListener('click', function () { voiceGo(voiceIdx - 1); });
    $('#voice-next').addEventListener('click', function () { voiceGo(voiceIdx + 1); });
    $('#voice-dots').addEventListener('click', function (e) {
      var b = e.target.closest('[data-dot]');
      if (b) voiceGo(parseInt(b.getAttribute('data-dot'), 10));
    });
    $('#voice-track').addEventListener('scroll', function () {
      var t = $('#voice-track');
      var cards = $$('.voice', t);
      if (!cards.length) return;
      var best = 0, bestD = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft - t.offsetLeft - t.scrollLeft);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best !== voiceIdx) {
        voiceIdx = best;
        $$('#voice-dots button').forEach(function (b, bi) {
          b.setAttribute('aria-current', String(bi === voiceIdx));
        });
      }
    }, { passive: true });

    // contact
    $('#contact-form').addEventListener('submit', submitForm);
    $('#contact-direct').addEventListener('click', function (e) {
      var b = e.target.closest('[data-copy]');
      if (!b) return;
      FX.copy(b.getAttribute('data-copy')).then(function () {
        FX.toast('Copied');
      });
    });

    // keys
    document.addEventListener('keydown', function (e) {
      if ($('#dossier').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeCase(); }
      if (e.key === 'ArrowLeft') stepCase(-1);
      if (e.key === 'ArrowRight') stepCase(1);
    });

    $('#quick-off').addEventListener('click', function () { setQuick(false); });
  }

  /* ─── full paint ──────────────────────────────────────── */
  function all() {
    identity();
    stats();
    ticker();
    filters();
    works();
    services();
    ops();
    track();
    voices();
    contact();
    paintBindings();
    bindQuickEdit();
    FX.initMagnets();
    FX.observeReveals();
    if (document.body.classList.contains('quick')) setQuick(true);
  }

  return {
    all: all, works: works, filters: filters, identity: identity,
    stats: stats, ticker: ticker, contact: contact, voices: voices,
    paintBindings: paintBindings, bindQuickEdit: bindQuickEdit,
    setQuick: setQuick,
    openCase: openCase, closeCase: closeCase,
    wire: wire, icons: ICONS,
    get view() { return view; }
  };
})();
