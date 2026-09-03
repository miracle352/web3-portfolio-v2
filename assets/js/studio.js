/* ══════════════════════════════════════════════════════════
   STUDIO — the editor. Add every past room, edit everything,
   drag to reorder, undo/redo, export portfolio.json.
   ══════════════════════════════════════════════════════════ */

window.STUDIO = (function () {
  'use strict';

  var $ = FX.$, $$ = FX.$$, esc = FX.esc;

  var tab = 'identity';
  var pickedId = null;
  var wkQuery = '';
  var jsonDraft = null;
  var isOpen = false;

  /* ═══════════════ field builders ═══════════════════════ */
  function label(text, hint) {
    return '<span>' + esc(text) + (hint ? '<em>' + esc(hint) + '</em>' : '') + '</span>';
  }

  function input(text, path, opts) {
    opts = opts || {};
    var v = PF.get(path, '');
    return '<label class="fld">' + label(text, opts.hint) +
      '<input data-path="' + esc(path) + '" type="' + (opts.type || 'text') + '" ' +
      'value="' + esc(v) + '" placeholder="' + esc(opts.ph || '') + '" ' +
      (opts.mono ? 'style="font-family:var(--mono)" ' : '') + '/></label>';
  }

  function area(text, path, opts) {
    opts = opts || {};
    var v = PF.get(path, '');
    return '<label class="fld' + (opts.tall ? ' tall' : '') + '">' + label(text, opts.hint) +
      '<textarea data-path="' + esc(path) + '" placeholder="' + esc(opts.ph || '') + '">' +
      esc(v) + '</textarea></label>';
  }

  function select(text, path, options, opts) {
    opts = opts || {};
    var v = String(PF.get(path, ''));
    var opened = options.indexOf(v) === -1 && v ? [v].concat(options) : options;
    return '<label class="fld">' + label(text, opts.hint) +
      '<select data-path="' + esc(path) + '">' +
      opened.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') +
      '</select></label>';
  }

  function check(text, path, note) {
    var v = !!PF.get(path, false);
    return '<label class="check"><input type="checkbox" data-bool="' + esc(path) + '"' +
      (v ? ' checked' : '') + ' /><span>' + esc(text) + '</span>' +
      (note ? '<small>' + esc(note) + '</small>' : '') + '</label>';
  }

  /* repeating list of plain strings */
  function repStrings(path, addLabel, ph) {
    var arr = PF.get(path, []) || [];
    var rows = arr.map(function (v, i) {
      return '<div class="rep-row">' +
        '<span class="grab" data-move-src="' + esc(path) + '.' + i + '" title="Drag to reorder">⋮⋮</span>' +
        '<input data-path="' + esc(path) + '.' + i + '" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '" />' +
        '<button class="kill" type="button" data-del="' + esc(path) + '.' + i + '" aria-label="Remove">✕</button>' +
      '</div>';
    }).join('');
    return '<div class="rep">' + rows +
      '<button class="rep-add" type="button" data-add-str="' + esc(path) + '">+ ' + esc(addLabel || 'Add') + '</button>' +
      '</div>';
  }

  /* repeating list of {value,label} */
  function repPairs(path, addLabel) {
    var arr = PF.get(path, []) || [];
    var rows = arr.map(function (m, i) {
      return '<div class="rep-row">' +
        '<div class="rep-pair">' +
          '<input data-path="' + esc(path) + '.' + i + '.value" value="' + esc(m && m.value || '') + '" placeholder="3,333" />' +
          '<input data-path="' + esc(path) + '.' + i + '.label" value="' + esc(m && m.label || '') + '" placeholder="Supply" />' +
        '</div>' +
        '<button class="kill" type="button" data-del="' + esc(path) + '.' + i + '" aria-label="Remove">✕</button>' +
      '</div>';
    }).join('');
    return '<div class="rep">' + rows +
      '<button class="rep-add" type="button" data-add-pair="' + esc(path) + '">+ ' + esc(addLabel || 'Add metric') + '</button>' +
      '</div>';
  }

  function cardHead(title, sub) {
    return '<h4>' + esc(title) + '</h4>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '');
  }

  function objBar(path, i, len, kind) {
    return '<div class="wk-bar" style="padding-bottom:10px;margin-bottom:12px">' +
      '<h4>' + esc(kind) + ' ' + (i + 1) + '</h4>' +
      '<button class="mini" type="button" data-move="' + esc(path) + '.' + i + ':-1"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="mini" type="button" data-move="' + esc(path) + '.' + i + ':1"' + (i === len - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button class="mini bad" type="button" data-del="' + esc(path) + '.' + i + '">Delete</button>' +
    '</div>';
  }

  /* ═══════════════ tabs ═════════════════════════════════ */
  var TABS = {};

  /* ── identity ──────────────────────────────────────── */
  TABS.identity = function () {
    return '' +
    '<div class="st-head"><h3>Identity</h3></div>' +
    '<p class="st-hint">Who you are and how people reach you. The <b>brand</b> is the wordmark in the nav and footer; <b>name</b> is the giant headline.</p>' +

    '<div class="st-card">' + cardHead('The basics') +
      '<div class="grid2">' +
        input('Brand / wordmark', 'profile.brand', { ph: 'IYAN' }) +
        input('Display name', 'profile.name', { ph: 'Iyanuoluwa' }) +
        input('Handle', 'profile.handle', { ph: '@iyan' }) +
        input('Kicker line', 'profile.kicker', { ph: 'Lagos · Web3 ops' }) +
        input('Availability', 'profile.availability', { ph: 'Open — 2 seats left' }) +
        input('Operating since', 'profile.since', { ph: '2024' }) +
        input('Location', 'profile.location', { ph: 'Lagos, Nigeria' }) +
        input('Timezone', 'profile.timezone', { ph: 'WAT · UTC+1' }) +
      '</div>' +
      '<div style="margin-top:13px">' +
        area('Bio', 'profile.bio', { tall: true, hint: 'Two or three sentences. This is the paragraph under your name.' }) +
      '</div>' +
    '</div>' +

    '<div class="st-card">' + cardHead('Seats you take', 'These drive the rotating headline, the pills, and the contact form dropdown.') +
      repStrings('profile.seats', 'Add a seat', 'Community Lead') +
    '</div>' +

    '<div class="st-card">' + cardHead('Contact channels', 'Leave a field empty and it disappears from the site.') +
      '<div class="grid2">' +
        input('Email', 'profile.email', { type: 'email', ph: 'hello@you.fun' }) +
        input('Discord username', 'profile.discord', { ph: 'yourname' }) +
        input('X / Twitter URL', 'profile.twitter', { ph: 'https://x.com/you' }) +
        input('Telegram', 'profile.telegram', { ph: '@you or full URL' }) +
        input('Website', 'profile.website', { ph: 'https://you.fun' }) +
        input('Booking link', 'profile.calendly', { ph: 'https://cal.com/you' }) +
      '</div>' +
    '</div>' +

    '<div class="st-card">' + cardHead('Accent', 'Blue family only — pick the one that feels right.') +
      '<div class="swatches">' +
        Object.keys(PF.accents).map(function (k) {
          var a = PF.accents[k];
          var on = (PF.getPref('accent') || PF.get('profile.accent')) === k;
          return '<button class="swatch" type="button" data-accent="' + k + '" aria-pressed="' + on + '">' +
            '<i style="background:' + a.accent + '"></i>' + esc(a.name) + '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  };

  /* ── works ─────────────────────────────────────────── */
  function workListHTML() {
    var works = PF.state.works || [];
    var q = wkQuery.trim().toLowerCase();

    var rows = works.map(function (w, i) {
      var hit = !q || [w.title, w.client, w.role, w.chain, w.category]
        .join(' ').toLowerCase().indexOf(q) > -1;
      if (!hit) return '';

      var thumb = w.cover
        ? '<img src="' + esc(w.cover) + '" alt="" />'
        : '<span class="gen"></span>';

      return '<div class="wk-item" role="button" tabindex="0" draggable="true" ' +
          'data-pick="' + esc(w.id) + '" data-idx="' + i + '" ' +
          'aria-current="' + (w.id === pickedId) + '" style="--tint:' + esc(w.tint || 'var(--accent)') + '">' +
        '<span class="wk-drag" aria-hidden="true">⋮⋮</span>' +
        '<span class="wk-thumb">' + thumb + '</span>' +
        '<span class="wk-info"><b>' + esc(w.title || 'Untitled') + '</b>' +
          '<small>' + esc([w.client, w.year, w.chain].filter(Boolean).join(' · ') || 'no meta yet') + '</small></span>' +
        '<span class="wk-flags">' +
          (w.featured ? '<span class="wk-flag star">big</span>' : '') +
          (w.sample ? '<span class="wk-flag sample">sample</span>' : '') +
        '</span>' +
      '</div>';
    }).join('');

    return rows || '<div class="empty" style="padding:26px"><b>No match</b><span>Nothing in your works list matches that.</span></div>';
  }

  function workEditorHTML() {
    var works = PF.state.works || [];
    if (!works.length) {
      return '<div class="empty"><b>No cases yet</b>' +
        '<span>Add your first room — a community you ran, a partnership you closed, a mod desk you held.</span>' +
        '<button class="btn btn-primary" type="button" data-act="add-work">Add the first case</button></div>';
    }

    var i = works.findIndex(function (w) { return w.id === pickedId; });
    if (i < 0) { i = 0; pickedId = works[0].id; }
    var w = works[i];
    var base = 'works.' + i;
    var pct = PF.completeness(w);

    var cover = w.cover
      ? '<img src="' + esc(w.cover) + '" alt="" />'
      : '<span class="gen"></span>';

    return '' +
    '<div class="wk-edit">' +

      '<div class="wk-bar">' +
        '<h4>' + esc(w.title || 'Untitled') + '</h4>' +
        '<div class="meter" title="How complete this case looks">' +
          '<div class="meter-bar"><i style="width:' + pct + '%"></i></div>' +
          '<span>' + pct + '%</span>' +
        '</div>' +
        '<button class="mini" type="button" data-act="dup-work">Duplicate</button>' +
        '<button class="mini" type="button" data-act="preview-work">Preview</button>' +
        '<button class="mini bad" type="button" data-act="del-work">Delete</button>' +
      '</div>' +

      '<div class="st-card">' + cardHead('Cover image', 'Drop a file, pick one, or paste a URL. Big images are shrunk to 1400px automatically. Leave it empty for the generated blue cover.') +
        '<div class="cover-drop" id="cover-drop" style="--tint:' + esc(w.tint || 'var(--accent)') + '">' +
          cover +
          (w.cover ? '' : '<span class="cover-hint"><b>Drop an image here</b>or use the buttons below</span>') +
        '</div>' +
        '<div class="cover-acts" style="margin-top:12px">' +
          '<button class="mini" type="button" data-act="pick-cover">Choose file…</button>' +
          '<button class="mini" type="button" data-act="url-cover">Paste a URL</button>' +
          (w.cover ? '<button class="mini bad" type="button" data-act="clear-cover">Remove cover</button>' : '') +
          '<input type="file" accept="image/*" id="cover-file" hidden />' +
        '</div>' +
        '<div style="margin-top:13px" class="grid2">' +
          input('Cover tint', base + '.tint', { type: 'color', hint: 'used by the generated cover' }) +
          check('Feature this case', base + '.featured', 'takes a double-width tile') +
        '</div>' +
      '</div>' +

      '<div class="st-card">' + cardHead('The facts') +
        '<div class="grid2">' +
          input('Title', base + '.title', { ph: 'Ashen Guild' }) +
          input('Client / project', base + '.client', { ph: 'Ashen Guild' }) +
        '</div>' +
        '<div class="grid3" style="margin-top:13px">' +
          input('Year', base + '.year', { ph: '2026' }) +
          select('Seat you held', base + '.role',
            (PF.state.profile.seats || []).concat(['Partnerships + BD', 'Advisor'])) +
          select('Category', base + '.category',
            ['Community', 'Partnerships', 'Biz Dev', 'Moderation', 'Launch', 'Advisory'],
            { hint: 'drives the filter buttons' }) +
        '</div>' +
        '<div class="grid2" style="margin-top:13px">' +
          select('Chain', base + '.chain',
            (PF.state.chains || []).concat(['Multi-chain'])) +
          select('Status', base + '.status',
            ['Live', 'Completed', 'Sold out', 'Ongoing', 'Paused']) +
        '</div>' +
      '</div>' +

      '<div class="st-card">' + cardHead('The read') +
        area('One-line summary', base + '.summary',
          { hint: 'shown on the card', ph: 'Took a 3,333 ETH mint from a quiet Discord to a room that filled GTD.' }) +
        '<div style="margin-top:13px">' +
          area('Full description', base + '.description',
            { tall: true, hint: 'shown when the case is opened', ph: 'What you walked into, what you built, what you left behind.' }) +
        '</div>' +
      '</div>' +

      '<div class="st-card">' + cardHead('What held', 'Three punchy lines beat a paragraph.') +
        repStrings(base + '.highlights', 'Add a highlight', 'Mod team still in seat 90 days later') +
      '</div>' +

      '<div class="st-card">' + cardHead('Numbers', 'Value first, then what it means. The first two show on the card.') +
        repPairs(base + '.metrics') +
      '</div>' +

      '<div class="st-card">' + cardHead('Tags') +
        repStrings(base + '.tags', 'Add a tag', 'GTD') +
      '</div>' +

      '<div class="st-card">' + cardHead('Links', 'Optional. Empty links are hidden.') +
        '<div class="grid3">' +
          input('X / thread', base + '.links.x', { ph: 'https://x.com/…' }) +
          input('Website', base + '.links.web', { ph: 'https://…' }) +
          input('Discord invite', base + '.links.discord', { ph: 'https://discord.gg/…' }) +
        '</div>' +
        '<div style="margin-top:13px">' +
          check('Mark as sample content', base + '.sample', 'sample cases can be wiped in one click') +
        '</div>' +
      '</div>' +

    '</div>';
  }

  TABS.works = function () {
    var works = PF.state.works || [];
    var n = works.length;
    var samples = works.filter(function (w) { return w.sample; }).length;

    // make sure a case is selected before either panel is built,
    // so the list highlight and the editor agree
    if (n && !works.some(function (w) { return w.id === pickedId; })) {
      pickedId = works[0].id;
    }

    return '' +
    '<div class="st-head">' +
      '<h3>Works <span style="color:var(--faint);font-size:.6em">' + n + '</span></h3>' +
      '<div class="st-acts">' +
        '<button class="mini go" type="button" data-act="add-work">+ Add a case</button>' +
        (samples ? '<button class="mini bad" type="button" data-act="clear-samples">Clear ' + samples + ' samples</button>' : '') +
      '</div>' +
    '</div>' +
    '<p class="st-hint">Every past room goes here. <b>Drag the rows</b> to set the order the site shows them in. Featured cases get a double-width tile. Nothing is lost while you edit — <code>Ctrl</code>+<code>Z</code> undoes.</p>' +

    '<div class="wk">' +
      '<div class="wk-side">' +
        '<div class="wk-search">' +
          '<input id="wk-q" placeholder="Filter your cases…" value="' + esc(wkQuery) + '" />' +
          '<span>' + n + '</span>' +
        '</div>' +
        '<div class="wk-list" id="wk-list">' + workListHTML() + '</div>' +
      '</div>' +
      '<div id="wk-main">' + workEditorHTML() + '</div>' +
    '</div>';
  };

  /* ── seats / services ──────────────────────────────── */
  TABS.seats = function () {
    var list = PF.state.services || [];
    return '' +
    '<div class="st-head"><h3>Seats</h3>' +
      '<div class="st-acts"><button class="mini go" type="button" data-add-obj="service">+ Add a seat</button></div>' +
    '</div>' +
    '<p class="st-hint">The offer blocks. One per seat you take — what it is, and exactly what it covers.</p>' +
    (list.length ? list.map(function (s, i) {
      return '<div class="st-card">' +
        objBar('services', i, list.length, 'Seat') +
        input('Title', 'services.' + i + '.title', { ph: 'Community lead' }) +
        '<div style="margin-top:13px">' + area('Summary', 'services.' + i + '.summary', { ph: 'One line on what this seat actually means.' }) + '</div>' +
        '<div style="margin-top:16px"><span class="op-label" style="margin-bottom:10px">What it covers</span>' +
          repStrings('services.' + i + '.items', 'Add a line', 'Stand up Discord, roles and rituals') + '</div>' +
      '</div>';
    }).join('') : '<div class="empty"><b>No seats yet</b><span>Add the seats you take.</span></div>');
  };

  /* ── ops ───────────────────────────────────────────── */
  TABS.ops = function () {
    var dirs = PF.state.directives || [];
    return '' +
    '<div class="st-head"><h3>Ops</h3></div>' +
    '<p class="st-hint">Chains, tools, and the rules you do not bend.</p>' +

    '<div class="st-card">' + cardHead('Chains you work', 'Also fills the chain filter and the contact dropdown.') +
      repStrings('chains', 'Add a chain', 'Ethereum') +
    '</div>' +

    '<div class="st-card">' + cardHead('Arsenal', 'Tools, systems and plays you run.') +
      repStrings('arsenal', 'Add to the arsenal', 'Discord architecture') +
    '</div>' +

    '<div class="st-head" style="margin-top:26px"><h3 style="font-size:1.2rem">Operating rules</h3>' +
      '<div class="st-acts"><button class="mini go" type="button" data-add-obj="directive">+ Add a rule</button></div>' +
    '</div>' +
    (dirs.length ? '<div class="grid2">' + dirs.map(function (d, i) {
      return '<div class="st-card" style="margin-bottom:0">' +
        objBar('directives', i, dirs.length, 'Rule') +
        input('Title', 'directives.' + i + '.title', { ph: 'Culture is the product' }) +
        '<div style="margin-top:13px">' + area('Note', 'directives.' + i + '.note', { ph: 'One sentence.' }) + '</div>' +
      '</div>';
    }).join('') + '</div>' : '<div class="empty"><b>No rules yet</b><span>Add the lines you hold to.</span></div>');
  };

  /* ── track ─────────────────────────────────────────── */
  TABS.track = function () {
    var list = PF.state.timeline || [];
    return '' +
    '<div class="st-head"><h3>Track record</h3>' +
      '<div class="st-acts"><button class="mini go" type="button" data-add-obj="timeline">+ Add an entry</button></div>' +
    '</div>' +
    '<p class="st-hint">Where you have sat, newest first.</p>' +
    (list.length ? list.map(function (t, i) {
      return '<div class="st-card">' +
        objBar('timeline', i, list.length, 'Entry') +
        '<div class="grid3">' +
          input('Year', 'timeline.' + i + '.year', { ph: '2026' }) +
          input('Title', 'timeline.' + i + '.title', { ph: 'Community lead' }) +
          input('Org', 'timeline.' + i + '.org', { ph: 'Ashen Guild' }) +
        '</div>' +
        '<div style="margin-top:13px">' + area('Note', 'timeline.' + i + '.note') + '</div>' +
      '</div>';
    }).join('') : '<div class="empty"><b>Nothing here yet</b><span>Add your first seat.</span></div>');
  };

  /* ── voices ────────────────────────────────────────── */
  TABS.voices = function () {
    var list = PF.state.voices || [];
    return '' +
    '<div class="st-head"><h3>Voices</h3>' +
      '<div class="st-acts"><button class="mini go" type="button" data-add-obj="voice">+ Add a quote</button></div>' +
    '</div>' +
    '<p class="st-hint">Real quotes from founders and core teams. Ask for one line after every seat you finish — it is the easiest credibility you will ever collect.</p>' +
    (list.length ? list.map(function (v, i) {
      return '<div class="st-card">' +
        objBar('voices', i, list.length, 'Quote') +
        area('Quote', 'voices.' + i + '.quote', { tall: true, ph: 'What they actually said.' }) +
        '<div class="grid3" style="margin-top:13px">' +
          input('Name', 'voices.' + i + '.name', { ph: 'Amina K.' }) +
          input('Role', 'voices.' + i + '.role', { ph: 'Founder' }) +
          input('Handle', 'voices.' + i + '.handle', { ph: '@handle' }) +
        '</div>' +
      '</div>';
    }).join('') : '<div class="empty"><b>No quotes yet</b><span>Add one when you get it.</span></div>');
  };

  /* ── numbers ───────────────────────────────────────── */
  TABS.numbers = function () {
    var stats = PF.state.stats || [];
    return '' +
    '<div class="st-head"><h3>Stats &amp; ticker</h3>' +
      '<div class="st-acts">' +
        (stats.length < 6 ? '<button class="mini go" type="button" data-add-obj="stat">+ Add a stat</button>' : '') +
      '</div>' +
    '</div>' +
    '<p class="st-hint">The four numbers under your hero. They count up when the page loads — put a plain number in <b>value</b> and any unit in <b>suffix</b> so the animation works.</p>' +

    '<div class="st-stat-row">' +
      stats.map(function (s) {
        return '<div class="st-stat"><b>' + esc(String(s.value || '') + (s.suffix || '')) + '</b>' +
               '<span>' + esc(s.label || '') + '</span></div>';
      }).join('') +
    '</div>' +

    (stats.length ? stats.map(function (s, i) {
      return '<div class="st-card">' +
        objBar('stats', i, stats.length, 'Stat') +
        '<div class="grid3">' +
          input('Value', 'stats.' + i + '.value', { ph: '18' }) +
          input('Suffix', 'stats.' + i + '.suffix', { ph: 'h  /  +  /  ×', hint: 'optional' }) +
          input('Label', 'stats.' + i + '.label', { ph: 'Partners closed' }) +
        '</div>' +
      '</div>';
    }).join('') : '') +

    '<div class="st-card">' + cardHead('Ticker', 'The scrolling marquee under the hero.') +
      repStrings('ticker', 'Add a ticker word', 'Post-mint retention') +
    '</div>';
  };

  /* ── section copy ──────────────────────────────────── */
  TABS.copy = function () {
    return '' +
    '<div class="st-head"><h3>Section copy</h3></div>' +
    '<p class="st-hint">The small paragraph beside each section heading. You can also edit these straight on the page — press <code>I</code> for inline edit.</p>' +
    '<div class="st-card">' +
      '<div class="grid1">' +
        area('Work section', 'copy.workLead') +
        area('Seats section', 'copy.seatsLead') +
        area('Ops section', 'copy.opsLead') +
        area('Track section', 'copy.trackLead') +
        area('Voices section', 'copy.voicesLead') +
      '</div>' +
    '</div>';
  };

  /* ── contact ───────────────────────────────────────── */
  TABS.contact = function () {
    return '' +
    '<div class="st-head"><h3>Contact</h3></div>' +
    '<p class="st-hint">The closing section. The form has no server — it opens the visitor\'s mail client with the brief already filled in, addressed to the email on your Identity tab.</p>' +
    '<div class="st-card">' +
      input('Headline', 'contact.headline', { ph: 'Open a seat.' }) +
      '<div style="margin-top:13px">' + area('Sub-line', 'contact.sub') + '</div>' +
      '<div style="margin-top:13px">' + area('Small note', 'contact.note') + '</div>' +
    '</div>';
  };

  /* ── data ──────────────────────────────────────────── */
  TABS.data = function () {
    var json = jsonDraft === null ? PF.toJSON(true) : jsonDraft;
    var bytes = new Blob([PF.toJSON(true)]).size;
    var kb = (bytes / 1024).toFixed(1);

    return '' +
    '<div class="st-head"><h3>Data</h3>' +
      '<div class="st-acts">' +
        '<button class="mini go" type="button" data-act="download">Download portfolio.json</button>' +
        '<button class="mini" type="button" data-act="copy-json">Copy JSON</button>' +
        '<button class="mini" type="button" data-act="upload-json">Import a file…</button>' +
        '<input type="file" accept="application/json,.json" id="json-file" hidden />' +
      '</div>' +
    '</div>' +
    '<p class="st-hint">Your edits live in this browser\'s storage as you type — <b>' + kb + ' KB</b> right now. To make them permanent for everyone, download the file and replace <code>portfolio.json</code> in the project.</p>' +

    '<div class="st-card">' + cardHead('Publish your changes') +
      '<ol class="steps">' +
        '<li><b>Download portfolio.json</b> using the button above.</li>' +
        '<li>Drop it into the <code>web3-portfolio-v2</code> folder, replacing the file that is already there.</li>' +
        '<li>Commit and deploy. Anyone loading the site now sees your content, not the samples.</li>' +
      '</ol>' +
    '</div>' +

    '<div class="st-card">' + cardHead('Raw JSON', 'Edit here and hit Apply, or paste a whole file in. Malformed JSON is rejected rather than saved.') +
      '<textarea class="json-box" id="json-box" spellcheck="false">' + esc(json) + '</textarea>' +
      '<div class="st-acts" style="margin-top:12px">' +
        '<button class="mini go" type="button" data-act="apply-json">Apply JSON</button>' +
        '<button class="mini" type="button" data-act="revert-json">Revert</button>' +
      '</div>' +
      '<p class="st-hint" id="json-msg" style="margin:12px 0 0"></p>' +
    '</div>' +

    '<div class="st-card">' + cardHead('Danger zone') +
      '<div class="st-acts">' +
        '<button class="mini bad" type="button" data-act="wipe-works">Delete every case</button>' +
        '<button class="mini bad" type="button" data-act="reset-all">Reset everything to samples</button>' +
      '</div>' +
      '<p class="st-hint" style="margin:12px 0 0">Both are undoable with <code>Ctrl</code>+<code>Z</code> while this tab stays open.</p>' +
    '</div>';
  };

  /* ═══════════════ paint ════════════════════════════════ */
  function paint() {
    var fn = TABS[tab] || TABS.identity;
    $('#st-main').innerHTML = fn();

    $$('#st-tabs button').forEach(function (b) {
      b.setAttribute('aria-current', String(b.getAttribute('data-tab') === tab));
    });
    $('#st-works-n').textContent = (PF.state.works || []).length;
    syncHistoryButtons();
  }

  function repaintWorksSide() {
    var side = $('#wk-list');
    if (side) side.innerHTML = workListHTML();
  }

  function syncHistoryButtons() {
    var u = $('#st-undo'), r = $('#st-redo');
    if (u) u.disabled = !PF.canUndo();
    if (r) r.disabled = !PF.canRedo();
  }

  /* ═══════════════ array ops ════════════════════════════ */
  function splitPath(p) {
    var bits = p.split('.');
    var idx = parseInt(bits.pop(), 10);
    return { parent: bits.join('.'), idx: idx };
  }

  function removeAt(path) {
    var s = splitPath(path);
    var arr = PF.get(s.parent);
    if (!Array.isArray(arr) || isNaN(s.idx)) return;
    PF.snapshot(null);
    arr.splice(s.idx, 1);
    PF.set(s.parent, arr, { silentHistory: true });
  }

  function moveAt(path, dir) {
    var s = splitPath(path);
    var arr = PF.get(s.parent);
    if (!Array.isArray(arr)) return;
    var to = s.idx + dir;
    if (to < 0 || to >= arr.length) return;
    PF.snapshot(null);
    var it = arr.splice(s.idx, 1)[0];
    arr.splice(to, 0, it);
    PF.set(s.parent, arr, { silentHistory: true });
  }

  function pushTo(path, value) {
    var arr = PF.get(path);
    if (!Array.isArray(arr)) arr = [];
    PF.snapshot(null);
    arr.push(value);
    PF.set(path, arr, { silentHistory: true });
  }

  var TEMPLATES = {
    service:   function () { return { title: 'New seat', summary: '', items: [''] }; },
    directive: function () { return { title: 'New rule', note: '' }; },
    timeline:  function () { return { year: String(new Date().getFullYear()), title: '', org: '', note: '' }; },
    voice:     function () { return { quote: '', name: '', role: '', handle: '' }; },
    stat:      function () { return { value: '0', suffix: '', label: 'New stat' }; }
  };
  var TEMPLATE_PATHS = {
    service: 'services', directive: 'directives',
    timeline: 'timeline', voice: 'voices', stat: 'stats'
  };

  /* ═══════════════ cover images ═════════════════════════ */
  function shrinkImage(file, maxW, quality) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Not an image file.'));
      var reader = new FileReader();
      reader.onerror = function () { rej(new Error('Could not read that file.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { rej(new Error('Could not decode that image.')); };
        img.onload = function () {
          var scale = Math.min(1, maxW / img.width);
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var cx = c.getContext('2d');
          cx.fillStyle = '#0a1020';
          cx.fillRect(0, 0, w, h);
          cx.drawImage(img, 0, 0, w, h);
          try { res(c.toDataURL('image/jpeg', quality || 0.82)); }
          catch (e) { rej(new Error('Could not convert that image.')); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function currentWorkPath() {
    var works = PF.state.works || [];
    var i = works.findIndex(function (w) { return w.id === pickedId; });
    return i < 0 ? null : 'works.' + i;
  }

  function setCover(file) {
    var p = currentWorkPath();
    if (!p) return;
    shrinkImage(file, 1400, 0.82).then(function (dataUrl) {
      PF.set(p + '.cover', dataUrl, { group: null });
      var kb = Math.round(dataUrl.length * 0.75 / 1024);
      FX.toast('Cover added (' + kb + ' KB)');
      paint();
    }).catch(function (e) {
      FX.toast(e.message || 'That image did not work.', { ms: 4000 });
    });
  }

  /* ═══════════════ wiring ═══════════════════════════════ */
  function wire() {
    var main = $('#st-main');

    /* tab switching */
    $('#st-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]');
      if (!b) return;
      tab = b.getAttribute('data-tab');
      jsonDraft = null;
      paint();
      main.scrollTop = 0;
    });

    /* text / select inputs → state */
    main.addEventListener('input', function (e) {
      var t = e.target;

      if (t.id === 'wk-q') {
        wkQuery = t.value;
        repaintWorksSide();
        return;
      }
      if (t.id === 'json-box') { jsonDraft = t.value; return; }

      var path = t.getAttribute('data-path');
      if (!path) return;
      PF.set(path, t.value, { group: 'field:' + path });

      // keep the works sidebar and meter honest while typing
      if (path.indexOf('works.') === 0) {
        repaintWorksSide();
        var m = $('.meter-bar i');
        var pctEl = $('.meter span');
        var works = PF.state.works || [];
        var w = works.filter(function (x) { return x.id === pickedId; })[0];
        if (m && w) {
          var pct = PF.completeness(w);
          m.style.width = pct + '%';
          if (pctEl) pctEl.textContent = pct + '%';
        }
        if (/\.title$/.test(path)) {
          var h = $('.wk-edit .wk-bar h4');
          if (h) h.textContent = t.value || 'Untitled';
        }
        if (/\.tint$/.test(path)) {
          var drop = $('#cover-drop');
          if (drop) drop.style.setProperty('--tint', t.value);
        }
      }
    });

    main.addEventListener('change', function (e) {
      var t = e.target;

      var bool = t.getAttribute('data-bool');
      if (bool) {
        PF.set(bool, !!t.checked, { group: null });
        repaintWorksSide();
        return;
      }
      if (t.id === 'cover-file' && t.files && t.files[0]) {
        setCover(t.files[0]);
        t.value = '';
        return;
      }
      if (t.id === 'json-file' && t.files && t.files[0]) {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            PF.importJSON(String(fr.result));
            jsonDraft = null;
            pickedId = null;
            paint();
            FX.toast('Imported');
          } catch (err) {
            FX.toast('That file is not valid JSON.', { ms: 4000 });
          }
        };
        fr.readAsText(t.files[0]);
        t.value = '';
      }
    });

    /* clicks */
    main.addEventListener('click', function (e) {
      var t = e.target;

      var del = t.closest('[data-del]');
      if (del) {
        var dp = del.getAttribute('data-del');
        removeAt(dp);
        if (dp.indexOf('works.') === 0 && /^works\.\d+$/.test(dp)) pickedId = null;
        paint();
        FX.toast('Removed', { action: 'Undo', onAction: function () { PF.undo(); paint(); } });
        return;
      }

      var mv = t.closest('[data-move]');
      if (mv) {
        var bits = mv.getAttribute('data-move').split(':');
        moveAt(bits[0], parseInt(bits[1], 10));
        paint();
        return;
      }

      var addStr = t.closest('[data-add-str]');
      if (addStr) { pushTo(addStr.getAttribute('data-add-str'), ''); paint(); return; }

      var addPair = t.closest('[data-add-pair]');
      if (addPair) { pushTo(addPair.getAttribute('data-add-pair'), { value: '', label: '' }); paint(); return; }

      var addObj = t.closest('[data-add-obj]');
      if (addObj) {
        var kind = addObj.getAttribute('data-add-obj');
        pushTo(TEMPLATE_PATHS[kind], TEMPLATES[kind]());
        paint();
        return;
      }

      var acc = t.closest('[data-accent]');
      if (acc) {
        var key = acc.getAttribute('data-accent');
        PF.applyAccent(key);
        PF.set('profile.accent', key, { group: 'accent' });
        FX.bg.refresh();
        paint();
        return;
      }

      var pick = t.closest('[data-pick]');
      if (pick) {
        pickedId = pick.getAttribute('data-pick');
        $('#wk-main').innerHTML = workEditorHTML();
        repaintWorksSide();
        return;
      }

      var act = t.closest('[data-act]');
      if (act) { action(act.getAttribute('data-act')); return; }
    });

    /* keyboard select in works list */
    main.addEventListener('keydown', function (e) {
      var pick = e.target.closest && e.target.closest('[data-pick]');
      if (pick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        pickedId = pick.getAttribute('data-pick');
        $('#wk-main').innerHTML = workEditorHTML();
        repaintWorksSide();
      }
    });

    /* drag to reorder cases */
    var dragIdx = null;
    main.addEventListener('dragstart', function (e) {
      var row = e.target.closest && e.target.closest('[data-idx]');
      if (!row) return;
      dragIdx = parseInt(row.getAttribute('data-idx'), 10);
      row.classList.add('dragging');
      try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (err) {}
      e.dataTransfer.effectAllowed = 'move';
    });
    main.addEventListener('dragover', function (e) {
      var row = e.target.closest && e.target.closest('[data-idx]');
      if (!row || dragIdx === null) return;
      e.preventDefault();
      $$('.wk-item.over').forEach(function (x) { x.classList.remove('over'); });
      row.classList.add('over');
    });
    main.addEventListener('dragleave', function (e) {
      var row = e.target.closest && e.target.closest('[data-idx]');
      if (row) row.classList.remove('over');
    });
    main.addEventListener('drop', function (e) {
      var row = e.target.closest && e.target.closest('[data-idx]');
      if (!row || dragIdx === null) return;
      e.preventDefault();
      var to = parseInt(row.getAttribute('data-idx'), 10);
      if (to !== dragIdx) {
        var arr = PF.state.works;
        PF.snapshot(null);
        var it = arr.splice(dragIdx, 1)[0];
        arr.splice(to, 0, it);
        PF.set('works', arr, { silentHistory: true });
      }
      dragIdx = null;
      paint();
    });
    main.addEventListener('dragend', function () {
      dragIdx = null;
      $$('.wk-item.dragging, .wk-item.over').forEach(function (x) {
        x.classList.remove('dragging', 'over');
      });
    });

    /* cover drop zone */
    main.addEventListener('dragenter', function (e) {
      var z = e.target.closest && e.target.closest('#cover-drop');
      if (z) { e.preventDefault(); z.classList.add('hot'); }
    });
    main.addEventListener('dragover', function (e) {
      var z = e.target.closest && e.target.closest('#cover-drop');
      if (z) { e.preventDefault(); z.classList.add('hot'); }
    });
    main.addEventListener('dragleave', function (e) {
      var z = e.target.closest && e.target.closest('#cover-drop');
      if (z) z.classList.remove('hot');
    });
    main.addEventListener('drop', function (e) {
      var z = e.target.closest && e.target.closest('#cover-drop');
      if (!z) return;
      e.preventDefault();
      z.classList.remove('hot');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) setCover(f);
    });

    /* rail buttons */
    $('#st-close').addEventListener('click', close);
    $('#st-undo').addEventListener('click', function () {
      if (PF.undo()) { paint(); FX.toast('Undone'); }
    });
    $('#st-redo').addEventListener('click', function () {
      if (PF.redo()) { paint(); FX.toast('Redone'); }
    });

    /* saved indicator */
    PF.on('dirty', function () {
      var el = $('#st-saved');
      if (el) { el.textContent = 'saving…'; el.classList.add('saving'); }
    });
    PF.on('saved', function () {
      var el = $('#st-saved');
      if (el) { el.textContent = 'autosaved'; el.classList.remove('saving'); }
      syncHistoryButtons();
    });
    PF.on('saveError', function () {
      var el = $('#st-saved');
      if (el) { el.textContent = 'storage full'; el.classList.add('saving'); }
      FX.toast('Browser storage is full — download your JSON and remove a large cover image.', { ms: 6000 });
    });
    PF.on('history', syncHistoryButtons);
  }

  /* ═══════════════ actions ══════════════════════════════ */
  function action(name) {
    var works = PF.state.works || [];

    if (name === 'add-work') {
      var w = PF.blankWork();
      PF.snapshot(null);
      works.unshift(w);
      PF.set('works', works, { silentHistory: true });
      pickedId = w.id;
      tab = 'works';
      paint();
      $('#st-main').scrollTop = 0;
      FX.toast('New case added — fill it in');
      return;
    }

    if (name === 'dup-work') {
      var i = works.findIndex(function (x) { return x.id === pickedId; });
      if (i < 0) return;
      var copy = PF.clone(works[i]);
      copy.id = PF.uid('case');
      copy.title = works[i].title + ' (copy)';
      copy.sample = false;
      PF.snapshot(null);
      works.splice(i + 1, 0, copy);
      PF.set('works', works, { silentHistory: true });
      pickedId = copy.id;
      paint();
      FX.toast('Duplicated');
      return;
    }

    if (name === 'del-work') {
      var di = works.findIndex(function (x) { return x.id === pickedId; });
      if (di < 0) return;
      var title = works[di].title;
      PF.snapshot(null);
      works.splice(di, 1);
      PF.set('works', works, { silentHistory: true });
      pickedId = null;
      paint();
      FX.toast('Deleted “' + title + '”', {
        action: 'Undo', ms: 6000,
        onAction: function () { PF.undo(); paint(); }
      });
      return;
    }

    if (name === 'preview-work') {
      close();
      requestAnimationFrame(function () { RENDER.openCase(pickedId); });
      return;
    }

    if (name === 'clear-samples') {
      var keep = works.filter(function (w) { return !w.sample; });
      var n = works.length - keep.length;
      PF.snapshot(null);
      PF.set('works', keep, { silentHistory: true });
      pickedId = null;
      paint();
      FX.toast(n + ' sample case' + (n === 1 ? '' : 's') + ' cleared', {
        action: 'Undo', ms: 6000,
        onAction: function () { PF.undo(); paint(); }
      });
      return;
    }

    if (name === 'wipe-works') {
      PF.snapshot(null);
      PF.set('works', [], { silentHistory: true });
      pickedId = null;
      paint();
      FX.toast('Every case removed', {
        action: 'Undo', ms: 7000,
        onAction: function () { PF.undo(); paint(); }
      });
      return;
    }

    if (name === 'reset-all') {
      PF.snapshot(null);
      PF.replace(PF.clone(window.SEED), { silentHistory: true });
      PF.applyAccent(PF.get('profile.accent'));
      pickedId = null;
      jsonDraft = null;
      paint();
      FX.toast('Reset to samples', {
        action: 'Undo', ms: 7000,
        onAction: function () { PF.undo(); paint(); }
      });
      return;
    }

    if (name === 'pick-cover') { $('#cover-file').click(); return; }

    if (name === 'url-cover') {
      var url = window.prompt('Paste an image URL (https://…)');
      if (url === null) return;
      url = url.trim();
      var p = currentWorkPath();
      if (!p) return;
      if (url && !/^(https?:)?\/\//i.test(url) && url.indexOf('data:image/') !== 0 && url.indexOf('assets/') !== 0) {
        FX.toast('That does not look like an image URL.');
        return;
      }
      PF.set(p + '.cover', url, { group: null });
      paint();
      return;
    }

    if (name === 'clear-cover') {
      var cp = currentWorkPath();
      if (!cp) return;
      PF.set(cp + '.cover', '', { group: null });
      paint();
      return;
    }

    if (name === 'download') {
      PF.download('portfolio.json');
      FX.toast('Downloaded — now replace portfolio.json in the project folder', { ms: 5000 });
      return;
    }

    if (name === 'copy-json') {
      FX.copy(PF.toJSON(true)).then(function () { FX.toast('JSON copied'); });
      return;
    }

    if (name === 'upload-json') { $('#json-file').click(); return; }

    if (name === 'apply-json') {
      var box = $('#json-box');
      var msg = $('#json-msg');
      try {
        PF.importJSON(box.value);
        jsonDraft = null;
        pickedId = null;
        box.classList.remove('bad');
        paint();
        FX.toast('JSON applied');
      } catch (err) {
        box.classList.add('bad');
        if (msg) {
          msg.innerHTML = '<span style="color:var(--bad)">' + esc(err.message || 'Invalid JSON') + '</span>';
        }
      }
      return;
    }

    if (name === 'revert-json') {
      jsonDraft = null;
      paint();
      return;
    }
  }

  /* ═══════════════ open / close ═════════════════════════ */
  function open(which) {
    if (which) tab = which;
    isOpen = true;
    $('#studio').hidden = false;
    document.body.classList.add('locked');
    if (!pickedId && (PF.state.works || []).length) pickedId = PF.state.works[0].id;
    paint();
    FX.bg.stop();
  }

  function close() {
    isOpen = false;
    $('#studio').hidden = true;
    document.body.classList.remove('locked');
    FX.bg.start();
    RENDER.all();
  }

  function toggle() { isOpen ? close() : open(); }

  function init() {
    wire();
  }

  return {
    init: init, open: open, close: close, toggle: toggle,
    paint: paint, get isOpen() { return isOpen; },
    goTab: function (t) { tab = t; if (isOpen) paint(); }
  };
})();
