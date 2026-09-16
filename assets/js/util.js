/* =============================================================================
   util.js — bendros pagalbinės funkcijos (DOM, formatavimas, datos, saugykla)
   ========================================================================== */
window.U = (function () {
  'use strict';

  /* --- DOM ---------------------------------------------------------------- */

  /**
   * Sukuria elementą. Tekstas visada dedamas per textContent — duomenys
   * (projektų, čempionų pavadinimai) laikomi nepatikimais.
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
        else if (k === 'html') node.innerHTML = v;              // tik vidiniams SVG šablonams
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

  var SVG_TAGS = {
    g: 1, path: 1, rect: 1, circle: 1, line: 1, text: 1, tspan: 1, polyline: 1,
    polygon: 1, defs: 1, clipPath: 1, linearGradient: 1, stop: 1, title: 1, ellipse: 1
  };

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* --- Skaičių formatavimas ----------------------------------------------- */

  var LT = 'lt-LT';

  /** 1 284 · 12,9 tūkst. · 4,2 mln. — kompaktiška didelių skaičių forma. */
  function compact(n, digits) {
    var abs = Math.abs(n);
    var d = digits === undefined ? 1 : digits;
    if (abs >= 1e9) return trimZero((n / 1e9).toFixed(d)) + ' mlrd.';
    if (abs >= 1e6) return trimZero((n / 1e6).toFixed(d)) + ' mln.';
    if (abs >= 1e4) return trimZero((n / 1e3).toFixed(0)) + ' tūkst.';
    if (abs >= 1e3) return trimZero((n / 1e3).toFixed(d)) + ' tūkst.';
    return num(Math.round(n));
  }

  /** Kompaktiška forma be vienetų žodžio — ašims. */
  function compactAxis(n) {
    var abs = Math.abs(n);
    if (abs >= 1e9) return trimZero((n / 1e9).toFixed(1)) + 'B';
    if (abs >= 1e6) return trimZero((n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)) + 'M';
    if (abs >= 1e3) return trimZero((n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)) + 'k';
    return num(n);
  }

  function trimZero(s) { return String(s).replace(/[.,]0$/, '').replace('.', ','); }
  function num(n) { return Number(n).toLocaleString(LT); }
  function dec(n, d) { return Number(n).toLocaleString(LT, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pct(n, d) { return dec(n, d === undefined ? 1 : d) + ' %'; }
  function money(n, d) {
    return '$' + Number(n).toLocaleString(LT, {
      minimumFractionDigits: d === undefined ? 2 : d,
      maximumFractionDigits: d === undefined ? 2 : d
    });
  }
  function signed(n, fmt) { return (n > 0 ? '+' : n < 0 ? '−' : '') + (fmt || num)(Math.abs(n)); }

  /* --- Datos -------------------------------------------------------------- */

  var MONTHS = ['sau.', 'vas.', 'kov.', 'bal.', 'geg.', 'birž.', 'liep.', 'rugp.', 'rugs.', 'spal.', 'lapkr.', 'gruod.'];
  var WEEKDAYS = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];
  var WEEKDAYS_LONG = ['Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis', 'Penktadienis', 'Šeštadienis', 'Sekmadienis'];
  var WEEKDAYS_SHORT = ['Pirmad.', 'Antrad.', 'Trečiad.', 'Ketvirtad.', 'Penktad.', 'Šeštad.', 'Sekmad.'];

  function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function parseISO(s) {
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  /** „16 rugs." */
  function dayLabel(s) {
    var d = parseISO(s);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  /** „2026 rugs. 16, Tr" */
  function fullDate(s) {
    var d = parseISO(s);
    return d.getFullYear() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + WEEKDAYS[mondayIndex(d)];
  }
  /** Pirmadienis = 0 (Lietuvos savaitė). */
  function mondayIndex(d) { return (d.getDay() + 6) % 7; }
  function addDays(d, n) { var c = new Date(d.getTime()); c.setDate(c.getDate() + n); return c; }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

  function relativeDays(s, today) {
    var n = daysBetween(parseISO(s), today || TODAY);
    if (n === 0) return 'šiandien';
    if (n === 1) return 'vakar';
    if (n < 7) return 'prieš ' + n + ' d.';
    if (n < 30) return 'prieš ' + Math.round(n / 7) + ' sav.';
    return 'prieš ' + Math.round(n / 30) + ' mėn.';
  }

  /* Fiksuota „šiandien“ – kad demo duomenys būtų nuoseklūs. */
  var TODAY = new Date(2026, 8, 16);

  /* --- Determinuotas atsitiktinumas (mulberry32) --------------------------- */

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

  /* --- Matematika --------------------------------------------------------- */

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
  /** Švarūs ašies tikslai: [0, žingsnis, ... , viršus] */
  function ticks(maxValue, count) {
    var c = count || 4;
    var top = niceCeil(maxValue / c) * c;
    var out = [];
    for (var i = 0; i <= c; i++) out.push((top / c) * i);
    return out;
  }

  /* --- Vietinė saugykla (atspari privačiam režimui) ------------------------ */

  var PREFIX = 'skydas.';
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
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* tyliai */ }
    }
  };

  /* --- Delta ženkliukas ---------------------------------------------------- */

  var ARROW_UP = 'M6 2.5l4 5H2z';
  var ARROW_DOWN = 'M6 9.5l-4-5h8z';

  /**
   * @param value    pokytis
   * @param upIsGood ar augimas yra „gerai“ (numatyta – taip)
   * @param unit     matavimo vienetas; nenurodžius naudojama „%"
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
      (dir === 'flat' ? '±' : '') + dec(Math.abs(value), 1) + ' ' + (unit || '%')
    ));
    return el('span', { class: 'delta delta--' + cls }, kids);
  }

  /* --- Serijų spalvos ------------------------------------------------------ */

  /** Grąžina realią CSS reikšmę — SVG ir tooltip'ams reikia hex, ne var(). */
  function seriesColor(i) {
    var name = '--series-' + ((i % 8) + 1);
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  return {
    el: el, clear: clear, qs: qs, qsa: qsa,
    num: num, dec: dec, pct: pct, money: money, compact: compact, compactAxis: compactAxis, signed: signed,
    iso: iso, parseISO: parseISO, dayLabel: dayLabel, fullDate: fullDate, mondayIndex: mondayIndex,
    addDays: addDays, daysBetween: daysBetween, relativeDays: relativeDays,
    MONTHS: MONTHS, WEEKDAYS: WEEKDAYS, WEEKDAYS_LONG: WEEKDAYS_LONG, WEEKDAYS_SHORT: WEEKDAYS_SHORT, TODAY: TODAY,
    rng: rng, sum: sum, clamp: clamp, niceCeil: niceCeil, ticks: ticks,
    store: store, deltaEl: deltaEl, seriesColor: seriesColor, token: token
  };
})();
