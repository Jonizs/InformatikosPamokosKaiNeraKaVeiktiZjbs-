/* =============================================================================
   util.js — shared helpers (DOM, formatting, dates, storage)
   ========================================================================== */
window.U = (function () {
  'use strict';

  /* --- DOM ---------------------------------------------------------------- */

  var SVG_TAGS = {
    g: 1, path: 1, rect: 1, circle: 1, line: 1, text: 1, tspan: 1, polyline: 1,
    polygon: 1, defs: 1, clipPath: 1, linearGradient: 1, stop: 1, title: 1, ellipse: 1
  };

  /**
   * Builds an element. Text always goes through textContent — data such as
   * project or champion names is treated as untrusted.
   */
  function el(tag, attrs, children) {
    var node = document.createElementNS(
      tag === 'svg' || SVG_TAGS[tag] ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml',
      tag
    );
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.setAttribute('class', v);
        else if (k === 'text') node.textContent = String(v);
        else if (k === 'html') node.innerHTML = v;              // internal SVG templates only
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else node.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* --- Number formatting --------------------------------------------------- */

  var LOCALE = 'en-US';

  /** 1,284 · 12.9K · 4.2M — compact form for large numbers. */
  function compact(n, digits) {
    var abs = Math.abs(n);
    var d = digits === undefined ? 1 : digits;
    if (abs >= 1e9) return trimZero((n / 1e9).toFixed(d)) + 'B';
    if (abs >= 1e6) return trimZero((n / 1e6).toFixed(d)) + 'M';
    if (abs >= 1e4) return trimZero((n / 1e3).toFixed(0)) + 'K';
    if (abs >= 1e3) return trimZero((n / 1e3).toFixed(d)) + 'K';
    return num(Math.round(n));
  }

  /** Compact form for axis ticks. */
  function compactAxis(n) {
    var abs = Math.abs(n);
    if (abs >= 1e9) return trimZero((n / 1e9).toFixed(1)) + 'B';
    if (abs >= 1e6) return trimZero((n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)) + 'M';
    if (abs >= 1e3) return trimZero((n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)) + 'K';
    return num(n);
  }

  function trimZero(s) { return String(s).replace(/\.0$/, ''); }
  function num(n) { return Number(n).toLocaleString(LOCALE); }
  function dec(n, d) {
    return Number(n).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pct(n, d) { return dec(n, d === undefined ? 1 : d) + '%'; }
  function money(n, d) {
    return '$' + Number(n).toLocaleString(LOCALE, {
      minimumFractionDigits: d === undefined ? 2 : d,
      maximumFractionDigits: d === undefined ? 2 : d
    });
  }
  function signed(n, fmt) { return (n > 0 ? '+' : n < 0 ? '−' : '') + (fmt || num)(Math.abs(n)); }

  /* --- Dates -------------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  /** "Sep 16" */
  function dayLabel(s) {
    var d = parseISO(s);
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  }
  /** "Wed, Sep 16, 2026" */
  function fullDate(s) {
    var d = parseISO(s);
    return WEEKDAYS[mondayIndex(d)] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  /** Monday = 0 — the week starts on Monday throughout the dashboard. */
  function mondayIndex(d) { return (d.getDay() + 6) % 7; }
  function addDays(d, n) { var c = new Date(d.getTime()); c.setDate(c.getDate() + n); return c; }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

  function relativeDays(s, today) {
    var n = daysBetween(parseISO(s), today || TODAY);
    if (n === 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n < 7) return n + 'd ago';
    if (n < 30) return Math.round(n / 7) + 'w ago';
    return Math.round(n / 30) + 'mo ago';
  }

  /* A fixed "today" keeps the demo dataset internally consistent. */
  var TODAY = new Date(2026, 8, 16);

  /* --- Deterministic randomness (mulberry32) ------------------------------- */

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --- Math ---------------------------------------------------------------- */

  function sum(arr, f) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += f ? f(arr[i], i) : arr[i];
    return t;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function niceCeil(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var r = v / mag;
    var step = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10;
    return step * mag;
  }
  /** Clean axis ticks: [0, step, … , top] */
  function ticks(maxValue, count) {
    var c = count || 4;
    var top = niceCeil(maxValue / c) * c;
    var out = [];
    for (var i = 0; i <= c; i++) out.push((top / c) * i);
    return out;
  }

  /* --- Local storage (safe in private mode) -------------------------------- */

  var PREFIX = 'dashboard.';
  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    }
  };

  /* --- Delta badge ---------------------------------------------------------- */

  var ARROW_UP = 'M6 2.5l4 5H2z';
  var ARROW_DOWN = 'M6 9.5l-4-5h8z';

  /**
   * @param value    the change
   * @param upIsGood whether growth reads as good (default: true)
   * @param unit     unit label; defaults to "%"
   */
  function deltaEl(value, upIsGood, unit) {
    var good = upIsGood === undefined ? true : upIsGood;
    var dir = value > 0.05 ? 'up' : value < -0.05 ? 'down' : 'flat';
    var cls = dir === 'flat' ? 'flat' : (dir === 'up') === good ? 'up' : 'down';
    var kids = [];
    if (dir !== 'flat') {
      kids.push(el('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true' }, [
        el('path', { d: dir === 'up' ? ARROW_UP : ARROW_DOWN, fill: 'currentColor' })
      ]));
    }
    kids.push(document.createTextNode(
      (dir === 'flat' ? '±' : '') + dec(Math.abs(value), 1) + (unit ? ' ' + unit : '%')
    ));
    return el('span', { class: 'delta delta--' + cls }, kids);
  }

  /* --- Series colours ------------------------------------------------------- */

  /** Resolves to a real CSS value — SVG and tooltips need hex, not var(). */
  function seriesColor(i) {
    return token('--series-' + ((i % 8) + 1));
  }
  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  return {
    el: el, clear: clear, qs: qs, qsa: qsa,
    num: num, dec: dec, pct: pct, money: money, compact: compact, compactAxis: compactAxis, signed: signed,
    iso: iso, parseISO: parseISO, dayLabel: dayLabel, fullDate: fullDate, mondayIndex: mondayIndex,
    addDays: addDays, daysBetween: daysBetween, relativeDays: relativeDays, pad: pad,
    MONTHS: MONTHS, WEEKDAYS: WEEKDAYS, WEEKDAYS_LONG: WEEKDAYS_LONG, TODAY: TODAY,
    rng: rng, sum: sum, clamp: clamp, niceCeil: niceCeil, ticks: ticks,
    store: store, deltaEl: deltaEl, seriesColor: seriesColor, token: token
  };
})();
