/* ══════════════════════════════════════════════════════════
   STORE — state, path get/set, undo/redo, autosave, events
   Exposes a single global: PF
   ══════════════════════════════════════════════════════════ */

window.PF = (function () {
  'use strict';

  var LS_KEY   = 'iyan.portfolio.v2';
  var LS_PREFS = 'iyan.prefs.v2';
  var HISTORY_MAX = 60;

  /* ─── accents ────────────────────────────────────────────
     Saturated on purpose — these sit on a near-black ground
     in solid blocks (pills, buttons, the ticker band), so a
     muted blue would read as grey rather than as an accent. */
  var ACCENTS = {
    azure:    { name: 'Azure',    accent: '#2563ff', accent2: '#5b93ff', ice: '#a8c8ff' },
    electric: { name: 'Electric', accent: '#00a6ff', accent2: '#4cc9ff', ice: '#a5eaff' },
    cobalt:   { name: 'Cobalt',   accent: '#4f46e5', accent2: '#818cf8', ice: '#c7d2fe' },
    ice:      { name: 'Glacier',  accent: '#0891b2', accent2: '#22d3ee', ice: '#a5f3fc' }
  };

  /* ─── helpers ────────────────────────────────────────── */
  function clone(v) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(v); } catch (e) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(v));
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' +
      Math.random().toString(36).slice(2, 8) +
      Date.now().toString(36).slice(-3);
  }

  function slug(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'case';
  }

  /* Deep-merge seed defaults into loaded data so older saves
     never break when new fields are added. */
  function fill(target, seed) {
    if (!seed || typeof seed !== 'object') return target;
    if (Array.isArray(seed)) return Array.isArray(target) ? target : clone(seed);
    if (target === null || typeof target !== 'object' || Array.isArray(target)) {
      return clone(seed);
    }
    Object.keys(seed).forEach(function (k) {
      if (!(k in target)) target[k] = clone(seed[k]);
      else target[k] = fill(target[k], seed[k]);
    });
    return target;
  }

  /* ─── state ──────────────────────────────────────────── */
  var state = clone(window.SEED);
  var past = [], future = [];
  var groupKey = null, groupAt = 0;
  var listeners = {};
  var saveTimer = null;
  var prefs = { accent: null, quick: false };

  /* ─── events ─────────────────────────────────────────── */
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () { off(evt, fn); };
  }
  function off(evt, fn) {
    var a = listeners[evt]; if (!a) return;
    var i = a.indexOf(fn); if (i > -1) a.splice(i, 1);
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[PF]', evt, e); }
    });
  }

  /* ─── path access ────────────────────────────────────── */
  function parts(path) {
    return String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  }

  function get(path, fallback) {
    var p = parts(path), node = state;
    for (var i = 0; i < p.length; i++) {
      if (node === null || node === undefined) return fallback;
      node = node[p[i]];
    }
    return node === undefined ? fallback : node;
  }

  /* group: pass a stable string so rapid edits to the same
     field collapse into one undo step */
  function pushHistory(group) {
    var now = Date.now();
    if (group && group === groupKey && now - groupAt < 900) {
      groupAt = now;
      return;
    }
    past.push(clone(state));
    if (past.length > HISTORY_MAX) past.shift();
    future.length = 0;
    groupKey = group || null;
    groupAt = now;
    emit('history');
  }

  function set(path, value, opts) {
    opts = opts || {};
    if (!opts.silentHistory) pushHistory(opts.group === undefined ? path : opts.group);

    var p = parts(path), node = state;
    for (var i = 0; i < p.length - 1; i++) {
      var k = p[i];
      if (node[k] === null || typeof node[k] !== 'object') {
        node[k] = /^\d+$/.test(p[i + 1]) ? [] : {};
      }
      node = node[k];
    }
    node[p[p.length - 1]] = value;

    scheduleSave();
    if (!opts.quiet) emit('change', { path: path });
    return value;
  }

  /* replace the whole document (import / reset / undo) */
  function replace(next, opts) {
    opts = opts || {};
    if (!opts.silentHistory) pushHistory(null);
    state = fill(clone(next), window.SEED);
    scheduleSave();
    if (!opts.quiet) emit('change', { path: '*' });
    return state;
  }

  /* ─── undo / redo ────────────────────────────────────── */
  function undo() {
    if (!past.length) return false;
    future.push(clone(state));
    state = past.pop();
    groupKey = null;
    scheduleSave();
    emit('change', { path: '*' });
    emit('history');
    return true;
  }
  function redo() {
    if (!future.length) return false;
    past.push(clone(state));
    state = future.pop();
    groupKey = null;
    scheduleSave();
    emit('change', { path: '*' });
    emit('history');
    return true;
  }
  function canUndo() { return past.length > 0; }
  function canRedo() { return future.length > 0; }

  /* ─── persistence ────────────────────────────────────── */
  function scheduleSave() {
    emit('dirty');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 450);
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      emit('saved', Date.now());
      return true;
    } catch (e) {
      // Most likely quota: a very large base64 cover.
      emit('saveError', e);
      console.warn('[PF] save failed', e);
      return false;
    }
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (e) { return null; }
  }

  function clearLocal() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  function reset() {
    clearLocal();
    replace(clone(window.SEED));
  }

  /* boot: localStorage draft → portfolio.json → seed */
  function boot() {
    loadPrefs();
    var local = loadLocal();
    if (local) {
      state = fill(local, window.SEED);
      applyAccent(prefs.accent || get('profile.accent'));
      return Promise.resolve('local');
    }
    return fetch('portfolio.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (json && typeof json === 'object') {
          state = fill(json, window.SEED);
          applyAccent(prefs.accent || get('profile.accent'));
          return 'json';
        }
        applyAccent(prefs.accent || get('profile.accent'));
        return 'seed';
      })
      .catch(function () {
        applyAccent(prefs.accent || get('profile.accent'));
        return 'seed';
      });
  }

  /* ─── prefs (accent, quick-edit) ─────────────────────── */
  function loadPrefs() {
    try {
      var raw = localStorage.getItem(LS_PREFS);
      if (raw) prefs = Object.assign(prefs, JSON.parse(raw) || {});
    } catch (e) {}
  }
  function savePrefs() {
    try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); } catch (e) {}
  }
  function getPref(k) { return prefs[k]; }
  function setPref(k, v) { prefs[k] = v; savePrefs(); }

  function applyAccent(key) {
    var a = ACCENTS[key] || ACCENTS.azure;
    var root = document.documentElement;
    root.style.setProperty('--accent', a.accent);
    root.style.setProperty('--accent-2', a.accent2);
    root.style.setProperty('--ice', a.ice);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#050506');
    prefs.accent = ACCENTS[key] ? key : 'azure';
    savePrefs();
    emit('accent', prefs.accent);
    return prefs.accent;
  }

  /* ─── export ─────────────────────────────────────────── */
  function toJSON(pretty) {
    return JSON.stringify(state, null, pretty === false ? 0 : 2);
  }

  function download(filename) {
    var blob = new Blob([toJSON(true)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'portfolio.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text); // throws → caller shows the error
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Top level must be a JSON object.');
    }
    replace(parsed);
    if (parsed.profile && parsed.profile.accent) applyAccent(parsed.profile.accent);
    return true;
  }

  /* ─── work helpers ───────────────────────────────────── */
  function blankWork() {
    return {
      id: uid('case'),
      featured: false,
      sample: false,
      title: 'Untitled room',
      client: '',
      year: String(new Date().getFullYear()),
      role: 'Community lead',
      category: 'Community',
      chain: 'Ethereum',
      status: 'Live',
      summary: '',
      description: '',
      highlights: [''],
      metrics: [{ value: '', label: '' }],
      tags: [],
      links: { x: '', web: '', discord: '' },
      cover: '',
      tint: getComputedStyle(document.documentElement)
              .getPropertyValue('--accent').trim() || '#2f80ff'
    };
  }

  /* rough "is this case ready to show" score, 0–100 */
  function completeness(w) {
    if (!w) return 0;
    var checks = [
      !!w.title && w.title !== 'Untitled room',
      !!w.client,
      !!w.year,
      !!w.role,
      !!w.chain,
      !!w.status,
      !!w.summary && w.summary.length > 24,
      !!w.description && w.description.length > 40,
      (w.highlights || []).filter(Boolean).length >= 2,
      (w.metrics || []).filter(function (m) { return m && m.value; }).length >= 2,
      (w.tags || []).length >= 1,
      !!w.cover,
      !w.sample
    ];
    var hit = checks.filter(Boolean).length;
    return Math.round((hit / checks.length) * 100);
  }

  return {
    // state
    get state() { return state; },
    get, set, replace, reset,
    // history
    undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo,
    snapshot: function (g) { pushHistory(g); },
    // persistence
    save: save, boot: boot, clearLocal: clearLocal,
    toJSON: toJSON, download: download, importJSON: importJSON,
    // prefs
    accents: ACCENTS, applyAccent: applyAccent,
    getPref: getPref, setPref: setPref,
    // events
    on: on, off: off, emit: emit,
    // utils
    clone: clone, uid: uid, slug: slug,
    blankWork: blankWork, completeness: completeness
  };
})();
