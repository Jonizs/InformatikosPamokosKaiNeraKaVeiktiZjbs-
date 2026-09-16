/* =============================================================================
   charts.js — savos SVG grafikų komponentės.
   Taisyklės, kurių laikomasi visur:
     · viena y ašis (niekada dviguba);
     · plonos žymos: 2px linijos, <=24px stulpeliai, 4px apvalintas duomenų galas;
     · 2px tarpas paviršiaus spalva tarp besiliečiančių žymų (ne apvadas);
     · plaukų linijos tinklelis, vientisas, niekada punktyrinis;
     · legenda visada, kai serijų >= 2; tiesioginės etiketės — atrankiai;
     · kiekvienas grafikas turi lentelės dvynį (reikšmė pasiekiama be pelės).
   ========================================================================== */
window.Chart = (function () {
  'use strict';

  var el = U.el;
  var NS = 'http://www.w3.org/2000/svg';

  /* --- Patarimų burbulas (tooltip) ----------------------------------------- */

  var tipNode = null;
  function tip() { return tipNode || (tipNode = document.getElementById('tooltip')); }

  /**
   * @param rows [{name, value, color}] — value jau suformatuota eilutė
   */
  function showTip(evt, title, rows, foot) {
    var t = tip();
    U.clear(t);
    if (title) t.appendChild(el('div', { class: 'tooltip__title', text: title }));
    rows.forEach(function (r) {
      t.appendChild(el('div', { class: 'tooltip__row' }, [
        r.color ? el('span', { class: 'tooltip__key', style: { background: r.color } }) : null,
        el('span', { class: 'tooltip__name', text: r.name }),
        el('span', { class: 'tooltip__val', text: r.value })
      ]));
    });
    if (foot) t.appendChild(el('div', { class: 'tooltip__foot', text: foot }));
    t.hidden = false;
    positionTip(evt);
  }

  function positionTip(evt) {
    var t = tip();
    if (t.hidden) return;
    var pad = 14;
    var r = t.getBoundingClientRect();
    var x = evt.clientX + pad;
    var y = evt.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    t.style.left = Math.max(8, x) + 'px';
    t.style.top = Math.max(8, y) + 'px';
  }

  function hideTip() { var t = tip(); t.hidden = true; }

  /* --- SVG pagalbinės ------------------------------------------------------ */

  function svg(w, h, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'chart' + (cls ? ' ' + cls : ''));
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', w);
    s.setAttribute('height', h);
    s.setAttribute('role', 'img');
    return s;
  }

  /** Stačiakampis su apvalintu vienu galu (duomenų galas), kitas — status. */
  function roundedEnd(x, y, w, h, r, side) {
    if (w <= 0 || h <= 0) return '';
    var rr = Math.min(r, w / 2, h / 2);
    if (side === 'top') {
      return 'M' + x + ' ' + (y + h) + 'V' + (y + rr) +
             'a' + rr + ' ' + rr + ' 0 0 1 ' + rr + ' ' + (-rr) +
             'h' + (w - 2 * rr) +
             'a' + rr + ' ' + rr + ' 0 0 1 ' + rr + ' ' + rr +
             'V' + (y + h) + 'Z';
    }
    /* side === 'right' */
    return 'M' + x + ' ' + y +
           'h' + (w - rr) +
           'a' + rr + ' ' + rr + ' 0 0 1 ' + rr + ' ' + rr +
           'v' + (h - 2 * rr) +
           'a' + rr + ' ' + rr + ' 0 0 1 ' + (-rr) + ' ' + rr +
           'H' + x + 'Z';
  }

  function linePath(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
  }

  /* --- Legenda ------------------------------------------------------------- */

  /**
   * Legenda privaloma, kai serijų >= 2. Viena serija legendos neturi —
   * antraštė jau pasako, kas nubraižyta.
   */
  function legend(series, kind) {
    var box = el('div', { class: 'legend' });
    series.forEach(function (s) {
      box.appendChild(el('span', { class: 'legend__item' }, [
        el('span', {
          class: 'legend__key' + (kind === 'line' ? ' legend__key--line' : ''),
          style: { background: s.color }
        }),
        el('span', { text: s.name }),
        s.note ? el('span', { class: 'legend__val', text: s.note }) : null
      ]));
    });
    return box;
  }

  /* --- Kortelė su grafiko / lentelės perjungimu ---------------------------- */

  /**
   * @param cfg.render(width) -> DOM mazgas (grafikas)
   * @param cfg.table()       -> DOM mazgas (lentelės dvynys)
   */
  function card(cfg) {
    var body = el('div', { class: 'card__body' + (cfg.flush ? ' card__body--flush' : '') });
    var root = el('div', { class: 'card' + (cfg.class ? ' ' + cfg.class : '') }, [
      (cfg.title || cfg.tools) ? el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          cfg.title ? el('h3', { class: 'card__title', text: cfg.title }) : null,
          cfg.sub ? el('p', { class: 'card__sub', text: cfg.sub }) : null
        ]),
        el('div', { class: 'card__tools' }, (cfg.tools || []).concat(cfg.table ? [tableToggle()] : []))
      ]) : null,
      body
    ]);

    function tableToggle() {
      var btn = el('button', {
        class: 'link-btn', type: 'button', 'aria-pressed': 'false',
        title: 'Rodyti reikšmes lentele',
        text: 'Lentelė',
        onclick: function () {
          var on = root.classList.toggle('show-table');
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          btn.textContent = on ? 'Grafikas' : 'Lentelė';
          if (!on) redraw();
        }
      });
      return btn;
    }

    var chartView = el('div', { class: 'chart-view' });
    body.appendChild(chartView);
    if (cfg.legendBefore) chartView.appendChild(cfg.legendBefore);
    var plot = el('div');
    chartView.appendChild(plot);
    if (cfg.legendAfter) chartView.appendChild(cfg.legendAfter);

    if (cfg.table) {
      body.appendChild(el('div', { class: 'table-view' }, [
        el('div', { class: 'table-wrap' }, [cfg.table()])
      ]));
    }

    var lastWidth = 0;
    function redraw() {
      var w = Math.max(240, Math.floor(plot.clientWidth || chartView.clientWidth || body.clientWidth || 600));
      if (w === lastWidth && plot.firstChild) return;
      lastWidth = w;
      U.clear(plot).appendChild(cfg.render(w));
    }

    root._redraw = redraw;
    registerResponsive(root, redraw);
    return root;
  }

  /* Perbraižymas keičiant lango plotį — su „rAF" ribojimu. */
  var responsive = [];
  var pending = false;
  function registerResponsive(node, fn) {
    responsive.push({ node: node, fn: fn });
    requestAnimationFrame(fn);
  }
  function resizeAll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      responsive = responsive.filter(function (r) { return r.node.isConnected; });
      responsive.forEach(function (r) { if (!r.node.classList.contains('show-table')) r.fn(); });
    });
  }
  window.addEventListener('resize', resizeAll);
  document.addEventListener('theme-change', function () {
    responsive = responsive.filter(function (r) { return r.node.isConnected; });
    responsive.forEach(function (r) { r.node._forceRedraw = true; r.fn.call(null, true); });
  });

  /* =========================================================================
     1. Sparklainas — 12 taškų, dabartinis laikotarpis akcentu.
     ====================================================================== */
  function sparkline(values, opts) {
    var o = opts || {};
    var w = o.width || 76, h = o.height || 26, p = 3;
    var s = svg(w, h);
    s.setAttribute('aria-hidden', 'true');
    if (!values.length) return s;

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min || 1;
    var stepX = (w - p * 2) / Math.max(1, values.length - 1);
    var pts = values.map(function (v, i) {
      return [p + i * stepX, h - p - ((v - min) / span) * (h - p * 2)];
    });

    var color = o.color || U.token('--series-1');
    if (o.area) {
      s.appendChild(el('path', {
        d: linePath(pts) + 'L' + pts[pts.length - 1][0] + ' ' + h + 'L' + pts[0][0] + ' ' + h + 'Z',
        fill: color, opacity: '0.10'
      }));
    }
    s.appendChild(el('path', {
      d: linePath(pts), fill: 'none', stroke: color,
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    var last = pts[pts.length - 1];
    s.appendChild(el('circle', {
      cx: last[0], cy: last[1], r: 2.6, fill: color,
      stroke: U.token('--surface-1'), 'stroke-width': '2'
    }));
    return s;
  }

  /* =========================================================================
     2. Linijų / ploto grafikas su kryžiuku ir vienu bendru patarimu.
     cfg: {labels[], series:[{name,color,values[]}], height, format, yFormat,
           area, dashedFuture}
     ====================================================================== */
  function lineChart(width, cfg) {
    var h = cfg.height || 260;
    var m = { t: 12, r: cfg.marginRight || 14, b: 26, l: 46 };
    var pw = width - m.l - m.r;
    var ph = h - m.t - m.b;
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || cfg.title || 'Linijinis grafikas');

    var n = cfg.labels.length;
    var allMax = 0;
    cfg.series.forEach(function (ser) {
      ser.values.forEach(function (v) { if (v > allMax) allMax = v; });
    });
    /* Numatytoji bazė — nulis. `zoomY` leidžia priartinti tik TENDENCIJOS
       grafikams (pvz., winrate apie 50 %), kur nulinė ašis nieko nepasako;
       stulpeliams tai draudžiama — jų ilgis matuojamas nuo nulio. */
    var allMin = Infinity;
    cfg.series.forEach(function (ser) {
      ser.values.forEach(function (v) { if (v < allMin) allMin = v; });
    });
    if (allMin === Infinity) allMin = 0;

    var yTicks, yMin;
    if (cfg.zoomY && allMax > allMin) {
      var pad = (allMax - allMin) * 0.2;
      var scale = niceScale(allMin - pad, allMax + pad, 4);
      yTicks = scale.ticks;
      yMin = scale.min;
      allMax = scale.max;
    } else {
      yTicks = U.ticks(allMax, 4);
      yMin = 0;
    }
    var yMax = cfg.zoomY ? allMax : (yTicks[yTicks.length - 1] || 1);
    if (yMax === yMin) yMax = yMin + 1;
    var fmtY = cfg.yFormat || U.compactAxis;
    var fmtV = cfg.format || U.num;

    var x = function (i) { return m.l + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw); };
    var y = function (v) { return m.t + ph - ((v - yMin) / (yMax - yMin)) * ph; };

    /* Tinklelis ir y ašies žymos */
    yTicks.forEach(function (t) {
      s.appendChild(el('line', { class: 'grid-line', x1: m.l, x2: m.l + pw, y1: y(t), y2: y(t) }));
      s.appendChild(el('text', { class: 'tick', x: m.l - 8, y: y(t) + 3.5, 'text-anchor': 'end', text: fmtY(t) }));
    });
    s.appendChild(el('line', { class: 'axis-line', x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph }));

    /* X ašies žymos — retinamos, kad nesusiliestų */
    var everyX = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(pw / 78))));
    cfg.labels.forEach(function (lab, i) {
      if (i % everyX !== 0 && i !== n - 1) return;
      if (i !== n - 1 && (n - 1 - i) < everyX * 0.6) return;
      s.appendChild(el('text', {
        class: 'tick', x: x(i), y: h - 8,
        'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle',
        text: lab
      }));
    });

    /* Plotas — tik kai serija viena (kitaip persidengia ir meluoja) */
    if (cfg.area && cfg.series.length === 1 && !cfg.zoomY) {
      var ser0 = cfg.series[0];
      var pts0 = ser0.values.map(function (v, i) { return [x(i), y(v)]; });
      s.appendChild(el('path', {
        d: linePath(pts0) + 'L' + x(n - 1) + ' ' + (m.t + ph) + 'L' + x(0) + ' ' + (m.t + ph) + 'Z',
        fill: ser0.color, opacity: '0.10'
      }));
    }

    /* Linijos */
    cfg.series.forEach(function (ser) {
      var pts = ser.values.map(function (v, i) { return [x(i), y(v)]; });
      s.appendChild(el('path', {
        d: linePath(pts), fill: 'none', stroke: ser.color,
        'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }));
      /* Galinis taškas su 2px paviršiaus žiedu */
      var last = pts[pts.length - 1];
      s.appendChild(el('circle', {
        cx: last[0], cy: last[1], r: 4, fill: ser.color,
        stroke: U.token('--surface-1'), 'stroke-width': '2'
      }));
    });

    /* Atrankinė tiesioginė etiketė: tik viršūnė, ir tik kai serija viena */
    if (cfg.series.length === 1 && cfg.peakLabel !== false && n > 2) {
      var vals = cfg.series[0].values;
      var pi = vals.indexOf(Math.max.apply(null, vals));
      if (pi >= 0 && vals[pi] > 0) {
        var anchor = pi < n * 0.12 ? 'start' : pi > n * 0.88 ? 'end' : 'middle';
        s.appendChild(el('text', {
          class: 'dlabel', x: x(pi), y: Math.max(m.t + 9, y(vals[pi]) - 10),
          'text-anchor': anchor, text: fmtV(vals[pi])
        }));
      }
    }

    /* Kryžiukas: skaitytojas taiko į datą, ne į 2px liniją */
    var cross = el('line', { class: 'crosshair', y1: m.t, y2: m.t + ph, x1: -99, x2: -99, opacity: '0' });
    s.appendChild(cross);
    var dots = el('g', { opacity: '0', 'pointer-events': 'none' });
    cfg.series.forEach(function (ser) {
      dots.appendChild(el('circle', {
        r: 4.5, fill: ser.color, stroke: U.token('--surface-1'), 'stroke-width': '2',
        cx: -99, cy: -99
      }));
    });
    s.appendChild(dots);

    var hit = el('rect', { class: 'hit', x: m.l, y: m.t, width: Math.max(1, pw), height: ph });
    s.appendChild(hit);

    function nearest(evt) {
      var box = s.getBoundingClientRect();
      var scale = width / box.width;
      var px = (evt.clientX - box.left) * scale;
      var i = n <= 1 ? 0 : Math.round(((px - m.l) / pw) * (n - 1));
      return U.clamp(i, 0, n - 1);
    }
    function move(evt) {
      var i = nearest(evt);
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', '1');
      dots.setAttribute('opacity', '1');
      Array.prototype.forEach.call(dots.childNodes, function (c, k) {
        c.setAttribute('cx', x(i));
        c.setAttribute('cy', y(cfg.series[k].values[i]));
      });
      showTip(evt, cfg.tipTitle ? cfg.tipTitle(i) : cfg.labels[i],
        cfg.series.map(function (ser) {
          return { name: ser.name, value: fmtV(ser.values[i]), color: ser.color };
        }), cfg.tipFoot ? cfg.tipFoot(i) : null);
    }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', function () {
      cross.setAttribute('opacity', '0'); dots.setAttribute('opacity', '0'); hideTip();
    });
    return s;
  }

  /* =========================================================================
     3. Sukrauti stulpeliai. 2px paviršiaus tarpas tarp segmentų ir kaimynų.
     cfg: {labels[], series:[{name,color,values[]}], height, format}
     ====================================================================== */
  function stackedBars(width, cfg) {
    var h = cfg.height || 260;
    var m = { t: 12, r: 14, b: 26, l: 46 };
    var pw = width - m.l - m.r, ph = h - m.t - m.b;
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Sukrautų stulpelių grafikas');

    var n = cfg.labels.length;
    var totals = cfg.labels.map(function (_, i) {
      return U.sum(cfg.series, function (ser) { return ser.values[i] || 0; });
    });
    var yTicks = U.ticks(Math.max.apply(null, totals.concat([0])), 4);
    var yMax = yTicks[yTicks.length - 1] || 1;
    var fmtY = cfg.yFormat || U.compactAxis;
    var fmtV = cfg.format || U.num;

    var band = pw / Math.max(1, n);
    var bw = Math.min(cfg.barWidth || 24, Math.max(3, band - Math.max(3, band * 0.32)));
    var GAP = 2;                                  /* paviršiaus tarpas */
    var surface = U.token('--surface-1');

    yTicks.forEach(function (t) {
      var yy = m.t + ph - (t / yMax) * ph;
      s.appendChild(el('line', { class: 'grid-line', x1: m.l, x2: m.l + pw, y1: yy, y2: yy }));
      s.appendChild(el('text', { class: 'tick', x: m.l - 8, y: yy + 3.5, 'text-anchor': 'end', text: fmtY(t) }));
    });
    s.appendChild(el('line', { class: 'axis-line', x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph }));

    var everyX = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(pw / 74))));
    var marks = el('g');
    s.appendChild(marks);

    cfg.labels.forEach(function (lab, i) {
      var cx = m.l + band * i + band / 2;
      var showTick = i % everyX === 0 || i === n - 1;
      /* Paskutinė žyma praleidžiama, jei ji lipa ant prieš tai nupieštos */
      if (i === n - 1 && (n - 1) % everyX !== 0 && (n - 1 - Math.floor((n - 1) / everyX) * everyX) < everyX * 0.6) {
        showTick = false;
      }
      if (showTick) {
        s.appendChild(el('text', { class: 'tick', x: cx, y: h - 8, 'text-anchor': 'middle', text: lab }));
      }
      var acc = 0;
      var top = m.t + ph;
      var g = el('g', { class: 'mark' });
      /* Braižoma iš apačios; viršutinis segmentas gauna 4px apvalinimą */
      var stack = [];
      cfg.series.forEach(function (ser, k) {
        var v = ser.values[i] || 0;
        if (v <= 0) return;
        var hh = (v / yMax) * ph;
        var y0 = m.t + ph - ((acc + v) / yMax) * ph;
        stack.push({ k: k, y: y0, h: hh, color: ser.color });
        acc += v;
      });
      stack.forEach(function (seg, idx) {
        var isTop = idx === stack.length - 1;
        var segH = Math.max(0.5, seg.h - (idx === 0 ? 0 : GAP));
        var segY = seg.y + (idx === 0 ? 0 : 0);
        var d = isTop && segH > 5
          ? roundedEnd(cx - bw / 2, segY, bw, segH, 4, 'top')
          : null;
        g.appendChild(d
          ? el('path', { d: d, fill: seg.color })
          : el('rect', { x: cx - bw / 2, y: segY, width: bw, height: segH, fill: seg.color }));
      });
      if (stack.length) {
        top = stack[stack.length - 1].y;
        g.appendChild(el('rect', {
          class: 'hit', x: m.l + band * i, y: m.t, width: band, height: ph,
          onpointermove: function (e) { hot(g, e, i, top); },
          onpointerdown: function (e) { hot(g, e, i, top); },
          onpointerleave: cool
        }));
      }
      marks.appendChild(g);
    });

    function hot(g, evt, i, _top) {
      s.classList.add('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      g.classList.add('is-hot');
      var rows = cfg.series.map(function (ser) {
        return { name: ser.name, value: fmtV(ser.values[i] || 0), color: ser.color };
      }).filter(function (r, k) { return (cfg.series[k].values[i] || 0) > 0; });
      showTip(evt, cfg.tipTitle ? cfg.tipTitle(i) : cfg.labels[i], rows,
        'Iš viso ' + fmtV(totals[i]));
    }
    function cool() {
      s.classList.remove('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      hideTip();
    }
    s.addEventListener('pointerleave', cool);

    /* Kaimyninių stulpelių atskyrimas — tarpas paviršiaus spalva, ne apvadas */
    if (bw >= band - 2) {
      marks.setAttribute('shape-rendering', 'crispEdges');
      s.appendChild(el('rect', { x: 0, y: 0, width: 0, height: 0, fill: surface }));
    }
    return s;
  }

  /* =========================================================================
     4. Horizontalūs stulpeliai — reikšmė ties galu, viena spalva vienai serijai.
     cfg: {rows:[{label, value, color?, note?}], height?, format, max?}
     ====================================================================== */
  function barsH(width, cfg) {
    var rows = cfg.rows;
    var rowH = cfg.rowHeight || 34;
    var h = rows.length * rowH + 10;
    var labelW = cfg.labelWidth || Math.min(150, Math.max(90, Math.round(width * 0.28)));
    var valueW = cfg.valueWidth || 62;
    var m = { t: 5, r: valueW, l: labelW };
    var pw = Math.max(20, width - m.l - m.r - 8);
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Horizontalių stulpelių grafikas');

    var max = cfg.max || Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var fmt = cfg.format || U.num;
    var barH = Math.min(cfg.barHeight || 14, rowH - 12);
    var accent = cfg.color || U.token('--series-1');

    rows.forEach(function (r, i) {
      var cy = m.t + i * rowH + rowH / 2;
      var w = Math.max(2, (r.value / max) * pw);
      var color = r.color || accent;
      var g = el('g', { class: 'mark' });

      g.appendChild(el('text', {
        class: 'tick', x: m.l - 10, y: cy + 4, 'text-anchor': 'end',
        style: { fill: 'var(--text-secondary)', fontSize: '12px' },
        text: r.label
      }));
      /* Vėžė — kad trumpi stulpeliai turėtų kontekstą */
      g.appendChild(el('rect', {
        x: m.l, y: cy - barH / 2, width: pw, height: barH, rx: 4,
        fill: U.token('--surface-2')
      }));
      g.appendChild(el('path', {
        d: roundedEnd(m.l, cy - barH / 2, w, barH, 4, 'right'), fill: color
      }));
      /* Reikšmė ties galu — už stulpelio, niekada jo viduje (nenukirpta) */
      g.appendChild(el('text', {
        class: 'dlabel', x: m.l + pw + 8, y: cy + 4, 'text-anchor': 'start', text: fmt(r.value)
      }));
      g.appendChild(el('rect', {
        class: 'hit', x: 0, y: m.t + i * rowH, width: width, height: rowH,
        onpointermove: function (e) { barHot(g, e, r, color); },
        onpointerdown: function (e) { barHot(g, e, r, color); },
        onpointerleave: barCool
      }));
      s.appendChild(g);
    });

    function barHot(g, evt, r, color) {
      s.classList.add('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      g.classList.add('is-hot');
      showTip(evt, r.label,
        [{ name: cfg.valueName || 'Reikšmė', value: fmt(r.value), color: color }], r.note);
    }
    function barCool() {
      s.classList.remove('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      hideTip();
    }
    s.addEventListener('pointerleave', barCool);
    return s;
  }

  /* =========================================================================
     4b. Diverguojantys stulpeliai — nuokrypis nuo bazinės linijos.
     Du priešingi poliai (mėlyna / raudona) + pilkas neutralus vidurys.
     cfg: {rows:[{label, value}], baseline, format, height?}
     ====================================================================== */
  function divergingBarsH(width, cfg) {
    var rows = cfg.rows;
    var rowH = cfg.rowHeight || 34;
    var h = rows.length * rowH + 22;
    var labelW = cfg.labelWidth || Math.min(150, Math.max(92, Math.round(width * 0.26)));
    var valueW = cfg.valueWidth || 62;
    var m = { t: 5, l: labelW, r: valueW };
    var pw = Math.max(20, width - m.l - m.r - 8);
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Diverguojančių stulpelių grafikas');

    var span = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value); }).concat([0.1]));
    span = U.niceCeil(span);
    var zero = m.l + pw * (cfg.zeroAt === undefined ? 0.5 : cfg.zeroAt);
    /* Kiekviena pusė naudoja savo laisvą plotį — bendra skalė lieka viena,
       nes span abiem pusėms tas pats; tik brėžimo ilgis skiriasi. */
    var posHalf = m.l + pw - zero;
    var negHalf = zero - m.l;
    var pos = U.token('--series-1');       /* šiltas/šaltas polius: virš bazės */
    var neg = U.token('--series-8');       /* po baze */
    var fmt = cfg.format || U.num;
    var barH = Math.min(cfg.barHeight || 14, rowH - 12);

    /* Neutralus vidurys — pilka plaukų linija, ne spalvota */
    s.appendChild(el('line', {
      class: 'axis-line', x1: zero, x2: zero, y1: m.t - 2, y2: m.t + rows.length * rowH,
      stroke: U.token('--axis')
    }));
    s.appendChild(el('text', {
      class: 'tick', x: zero, y: h - 6, 'text-anchor': 'middle',
      text: cfg.baselineLabel || fmt(cfg.baseline)
    }));

    rows.forEach(function (r, i) {
      var cy = m.t + i * rowH + rowH / 2;
      var up = r.value >= 0;
      var w = (Math.abs(r.value) / span) * (up ? posHalf : negHalf);
      var color = up ? pos : neg;
      var g = el('g', { class: 'mark' });

      g.appendChild(el('text', {
        class: 'tick', x: m.l - 10, y: cy + 4, 'text-anchor': 'end',
        style: { fill: 'var(--text-secondary)', fontSize: '12px' }, text: r.label
      }));
      g.appendChild(el('path', {
        d: up
          ? roundedEnd(zero, cy - barH / 2, Math.max(2, w), barH, 4, 'right')
          : mirrorRight(zero - Math.max(2, w), cy - barH / 2, Math.max(2, w), barH, 4),
        fill: color
      }));
      g.appendChild(el('text', {
        class: 'dlabel', x: m.l + pw + 8, y: cy + 4, 'text-anchor': 'start',
        text: cfg.absoluteFormat ? cfg.absoluteFormat(r) : fmt(r.value)
      }));
      g.appendChild(el('rect', {
        class: 'hit', x: 0, y: m.t + i * rowH, width: width, height: rowH,
        onpointermove: function (e) { dHot(g, e, r, color); },
        onpointerdown: function (e) { dHot(g, e, r, color); }
      }));
      s.appendChild(g);
    });

    function dHot(g, evt, r, color) {
      s.classList.add('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      g.classList.add('is-hot');
      showTip(evt, r.label, (cfg.tipRows ? cfg.tipRows(r) : [
        { name: cfg.valueName || 'Nuokrypis', value: fmt(r.value), color: color }
      ]), r.note);
    }
    s.addEventListener('pointerleave', function () {
      s.classList.remove('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      hideTip();
    });
    return s;
  }

  /** Apvalintas kairysis galas (veidrodinis roundedEnd „right"). */
  function mirrorRight(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    return 'M' + (x + w) + ' ' + y +
           'H' + (x + rr) +
           'a' + rr + ' ' + rr + ' 0 0 0 ' + (-rr) + ' ' + rr +
           'v' + (h - 2 * rr) +
           'a' + rr + ' ' + rr + ' 0 0 0 ' + rr + ' ' + rr +
           'H' + (x + w) + 'Z';
  }

  /* =========================================================================
     5. Žiedas — dalis visumos „iš pirmo žvilgsnio", <= 6 segmentai.
     ====================================================================== */
  function donut(width, cfg) {
    var size = Math.min(width, cfg.size || 200);
    var s = svg(width, size);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Žiedinė diagrama');
    var cx = width / 2, cy = size / 2;
    var R = size / 2 - 4, r = R * (cfg.thickness || 0.62);
    var total = U.sum(cfg.slices, function (d) { return d.value; }) || 1;
    var fmt = cfg.format || U.num;
    var GAP_DEG = 2.4;                            /* tarpas, ne apvadas */

    var a0 = -90;
    cfg.slices.forEach(function (d) {
      var sweep = (d.value / total) * 360;
      var a1 = a0 + sweep;
      var pad = Math.min(GAP_DEG, sweep / 3);
      var g = el('g', { class: 'mark' }, [
        el('path', { d: arc(cx, cy, R, r, a0 + pad / 2, a1 - pad / 2), fill: d.color })
      ]);
      g.appendChild(el('path', {
        class: 'hit', d: arc(cx, cy, R + 6, r - 6, a0, a1),
        onpointermove: function (e) { sliceHot(g, e, d, sweep); },
        onpointerdown: function (e) { sliceHot(g, e, d, sweep); }
      }));
      s.appendChild(g);
      a0 = a1;
    });

    /* Centre — bendra suma (skaičius yra grafiko esmė) */
    s.appendChild(el('text', {
      x: cx, y: cy - 2, 'text-anchor': 'middle',
      style: { fill: 'var(--text-primary)', fontSize: '21px', fontWeight: '640' },
      text: cfg.centerValue || fmt(total)
    }));
    if (cfg.centerLabel) {
      s.appendChild(el('text', {
        x: cx, y: cy + 15, 'text-anchor': 'middle',
        style: { fill: 'var(--text-muted)', fontSize: '11px' },
        text: cfg.centerLabel
      }));
    }

    function sliceHot(g, evt, d, sweep) {
      s.classList.add('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      g.classList.add('is-hot');
      showTip(evt, d.name, [{ name: cfg.valueName || 'Kiekis', value: fmt(d.value), color: d.color }],
        U.dec((sweep / 360) * 100, 1) + ' % visumos');
    }
    s.addEventListener('pointerleave', function () {
      s.classList.remove('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      hideTip();
    });
    return s;
  }

  /**
   * Švari skalė intervalui [lo, hi]: parenkamas standartinis žingsnis
   * (1 / 2 / 2,5 / 5 × 10^n), o rėžiai PLEČIAMI iki jo kartotinių — taip
   * ašis visada prasideda ir baigiasi apvaliu skaičiumi ir niekada
   * nenukerpa duomenų.
   */
  function niceScale(lo, hi, count, integerOnly) {
    var span = hi - lo;
    if (!(span > 0)) return { min: lo, max: lo + 1, ticks: [lo] };
    var mag = Math.pow(10, Math.floor(Math.log10(span)) - 1);
    var step = null;
    for (var m = mag; m <= mag * 1000 && step === null; m *= 10) {
      [1, 2, 2.5, 5].forEach(function (f) {
        var cand = f * m;
        if (integerOnly && Math.abs(cand - Math.round(cand)) > 1e-9) return;
        if (step === null && span / cand <= count + 1) step = cand;
      });
    }
    if (!step) step = span / count;
    if (integerOnly) step = Math.max(1, Math.round(step));

    var min = Math.floor(lo / step) * step;
    var max = Math.ceil(hi / step) * step;
    var ticks = [];
    for (var v = min; v <= max + step * 0.001; v += step) {
      ticks.push(Math.round(v * 1e6) / 1e6);
    }
    return { min: min, max: max, ticks: ticks };
  }

  function arc(cx, cy, R, r, a0, a1) {
    var p = Math.PI / 180;
    var large = (a1 - a0) > 180 ? 1 : 0;
    var x0 = cx + R * Math.cos(a0 * p), y0 = cy + R * Math.sin(a0 * p);
    var x1 = cx + R * Math.cos(a1 * p), y1 = cy + R * Math.sin(a1 * p);
    var x2 = cx + r * Math.cos(a1 * p), y2 = cy + r * Math.sin(a1 * p);
    var x3 = cx + r * Math.cos(a0 * p), y3 = cy + r * Math.sin(a0 * p);
    return 'M' + x0 + ' ' + y0 + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 +
           'L' + x2 + ' ' + y2 + 'A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + x3 + ' ' + y3 + 'Z';
  }

  /* =========================================================================
     6. Kalendoriaus šilumos žemėlapis — nuosekli VIENOS spalvos rampa.
     cfg: {days:[{date, value}], height?, format, weeks?}
     ====================================================================== */
  function calendarHeatmap(width, cfg) {
    var days = cfg.days;
    if (!days.length) return svg(width, 40);
    var cell = 23, gap = 3;
    var leftPad = 26, topPad = 16;

    var first = U.parseISO(days[0].date);
    var offset = U.mondayIndex(first);
    var weeks = Math.ceil((days.length + offset) / 7);
    var avail = width - leftPad - 4;
    var step = U.clamp(Math.floor(avail / weeks), 8, cell + gap);
    var cs = Math.max(6, step - gap);
    /* Trumpuose intervaluose tinklelis nesiekia krašto — jį centruojame,
       kad kortelėje neliktų vienos tuščios pusės. */
    leftPad += Math.max(0, Math.floor((avail - weeks * step) / 2));
    var h = topPad + 7 * step + 8;
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Aktyvumo kalendorius');

    var max = Math.max.apply(null, days.map(function (d) { return d.value; }).concat([1]));
    var ramp = ['--seq-0', '--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5'].map(U.token);
    var fmt = cfg.format || U.num;

    function shade(v) {
      if (v <= 0) return ramp[0];
      var q = v / max;
      var i = q > 0.75 ? 5 : q > 0.5 ? 4 : q > 0.28 ? 3 : q > 0.12 ? 2 : 1;
      return ramp[i];
    }

    /* Savaitės dienų etiketės — tik kas antra, kad neperkrautų */
    [0, 2, 4, 6].forEach(function (d) {
      s.appendChild(el('text', {
        class: 'tick', x: leftPad - 7, y: topPad + d * step + cs / 2 + 3.5, 'text-anchor': 'end',
        text: U.WEEKDAYS[d]
      }));
    });

    /* Mėnesių etiketės viršuje */
    var lastMonth = -1;
    days.forEach(function (d, i) {
      var date = U.parseISO(d.date);
      var col = Math.floor((i + offset) / 7);
      if (date.getMonth() !== lastMonth && date.getDate() <= 7) {
        lastMonth = date.getMonth();
        s.appendChild(el('text', {
          class: 'tick', x: leftPad + col * step, y: topPad - 5, 'text-anchor': 'start',
          text: U.MONTHS[date.getMonth()]
        }));
      }
    });

    days.forEach(function (d, i) {
      var idx = i + offset;
      var col = Math.floor(idx / 7), row = idx % 7;
      var g = el('rect', {
        class: 'mark', x: leftPad + col * step, y: topPad + row * step,
        width: cs, height: cs, rx: 3, fill: shade(d.value)
      });
      s.appendChild(g);
      s.appendChild(el('rect', {
        class: 'hit', x: leftPad + col * step - 1, y: topPad + row * step - 1,
        width: cs + 2, height: cs + 2,
        onpointermove: function (e) { cellHot(g, e, d); },
        onpointerdown: function (e) { cellHot(g, e, d); }
      }));
    });

    function cellHot(g, evt, d) {
      s.classList.add('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      g.classList.add('is-hot');
      showTip(evt, U.fullDate(d.date),
        [{ name: cfg.valueName || 'Reikšmė', value: fmt(d.value), color: shade(d.value) }],
        d.note || null);
    }
    s.addEventListener('pointerleave', function () {
      s.classList.remove('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      hideTip();
    });
    return s;
  }

  /** Nuoseklios rampos legenda (mažiau → daugiau). */
  function rampLegend(labelLow, labelHigh) {
    var box = el('div', { class: 'legend', style: { justifyContent: 'flex-end', paddingBottom: '0', paddingTop: '10px' } });
    box.appendChild(el('span', { class: 'legend__val', text: labelLow || 'mažiau' }));
    ['--seq-0', '--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5'].forEach(function (t) {
      box.appendChild(el('span', {
        class: 'legend__key', style: { background: U.token(t), marginRight: '0' }
      }));
    });
    box.appendChild(el('span', { class: 'legend__val', text: labelHigh || 'daugiau' }));
    box.style.gap = '3px';
    return box;
  }

  /* =========================================================================
     7. Matrica (savaitės diena × valanda) — ta pati viena spalvos rampa.
     ====================================================================== */
  function matrixHeatmap(width, cfg) {
    var rows = cfg.rowLabels, cols = cfg.colLabels;
    var leftPad = 30, topPad = 18;
    var avail = width - leftPad - 6;
    var cw = Math.max(6, Math.floor(avail / cols.length) - 2);
    var step = cw + 2;
    var ch = cfg.cellHeight || 18;
    var h = topPad + rows.length * (ch + 2) + 6;
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Šilumos matrica');

    var max = 0;
    cfg.values.forEach(function (r) { r.forEach(function (v) { if (v > max) max = v; }); });
    var ramp = ['--seq-0', '--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5'].map(U.token);
    var fmt = cfg.format || U.num;
    function shade(v) {
      if (v <= 0) return ramp[0];
      var q = v / (max || 1);
      return ramp[q > 0.75 ? 5 : q > 0.5 ? 4 : q > 0.28 ? 3 : q > 0.12 ? 2 : 1];
    }

    cols.forEach(function (c, j) {
      if (j % Math.max(1, Math.round(4 / (step / 12))) !== 0) return;
      s.appendChild(el('text', {
        class: 'tick', x: leftPad + j * step + cw / 2, y: topPad - 6, 'text-anchor': 'middle', text: c
      }));
    });
    rows.forEach(function (r, i) {
      s.appendChild(el('text', {
        class: 'tick', x: leftPad - 7, y: topPad + i * (ch + 2) + ch / 2 + 3.5, 'text-anchor': 'end', text: r
      }));
      cols.forEach(function (c, j) {
        var v = cfg.values[i][j];
        var g = el('rect', {
          class: 'mark', x: leftPad + j * step, y: topPad + i * (ch + 2),
          width: cw, height: ch, rx: 3, fill: shade(v)
        });
        s.appendChild(g);
        s.appendChild(el('rect', {
          class: 'hit', x: leftPad + j * step - 1, y: topPad + i * (ch + 2) - 1, width: cw + 2, height: ch + 2,
          onpointermove: function (e) { mHot(g, e, r, c, v); },
          onpointerdown: function (e) { mHot(g, e, r, c, v); }
        }));
      });
    });

    function mHot(g, evt, r, c, v) {
      s.classList.add('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      g.classList.add('is-hot');
      showTip(evt, (cfg.rowName ? r : r) + ' · ' + c,
        [{ name: cfg.valueName || 'Reikšmė', value: fmt(v), color: shade(v) }]);
    }
    s.addEventListener('pointerleave', function () {
      s.classList.remove('is-hovering');
      U.qsa('.mark', s).forEach(function (o) { o.classList.remove('is-hot'); });
      hideTip();
    });
    return s;
  }

  /* =========================================================================
     8. Sklaidos diagrama — artimiausio taško sluoksnis (taikinys >= 24px).
     cfg: {points:[{x,y,r?,label,meta}], xLabel, yLabel, xFormat, yFormat,
           refX, refY, color}
     ====================================================================== */
  function scatter(width, cfg) {
    var h = cfg.height || 300;
    var m = { t: 14, r: 16, b: 38, l: 48 };
    var pw = width - m.l - m.r, ph = h - m.t - m.b;
    var s = svg(width, h);
    s.setAttribute('aria-label', cfg.ariaLabel || 'Sklaidos diagrama');

    var xs = cfg.points.map(function (p) { return p.x; });
    var ys = cfg.points.map(function (p) { return p.y; });
    var xMin = cfg.xMin !== undefined ? cfg.xMin : Math.min.apply(null, xs);
    var xMax = cfg.xMax !== undefined ? cfg.xMax : Math.max.apply(null, xs);
    var yMin = cfg.yMin !== undefined ? cfg.yMin : Math.min.apply(null, ys);
    var yMax = cfg.yMax !== undefined ? cfg.yMax : Math.max.apply(null, ys);
    var padX = (xMax - xMin) * 0.08 || 1, padY = (yMax - yMin) * 0.12 || 1;
    var yInt = ys.every(function (v) { return Math.abs(v - Math.round(v)) < 1e-9; });
    var xInt = xs.every(function (v) { return Math.abs(v - Math.round(v)) < 1e-9; });
    var yScale = niceScale(yMin - padY, yMax + padY, 4, yInt);
    var xScale = niceScale(xMin - padX, xMax + padX, 4, xInt);
    xMin = xScale.min; xMax = xScale.max;
    yMin = yScale.min; yMax = yScale.max;

    var X = function (v) { return m.l + ((v - xMin) / (xMax - xMin)) * pw; };
    var Y = function (v) { return m.t + ph - ((v - yMin) / (yMax - yMin)) * ph; };
    var fmtX = cfg.xFormat || U.num, fmtY = cfg.yFormat || U.num;

    /* Tinklelis su apvalintomis žymomis — skaitytojui reikia švarių skaičių */
    yScale.ticks.forEach(function (yv) {
      s.appendChild(el('line', { class: 'grid-line', x1: m.l, x2: m.l + pw, y1: Y(yv), y2: Y(yv) }));
      s.appendChild(el('text', { class: 'tick', x: m.l - 8, y: Y(yv) + 3.5, 'text-anchor': 'end', text: fmtY(yv) }));
    });
    var xTicks = xScale.ticks;
    xTicks.forEach(function (xv, i) {
      s.appendChild(el('text', {
        class: 'tick', x: X(xv), y: h - 20,
        'text-anchor': i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle', text: fmtX(xv)
      }));
    });
    s.appendChild(el('line', { class: 'axis-line', x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph }));

    /* Atskaitos linija (pvz., 50 % laimėjimų) — plaukų linija, vientisa */
    if (cfg.refY !== undefined && cfg.refY > yMin && cfg.refY < yMax) {
      s.appendChild(el('line', {
        class: 'axis-line', x1: m.l, x2: m.l + pw, y1: Y(cfg.refY), y2: Y(cfg.refY),
        stroke: U.token('--border-strong')
      }));
      s.appendChild(el('text', {
        class: 'dlabel', x: m.l + pw, y: Y(cfg.refY) - 7, 'text-anchor': 'end',
        style: { fill: 'var(--text-muted)', fontWeight: '500' }, text: cfg.refLabel || ''
      }));
    }

    if (cfg.xLabel) {
      s.appendChild(el('text', {
        class: 'tick', x: m.l + pw / 2, y: h - 4, 'text-anchor': 'middle', text: cfg.xLabel
      }));
    }

    var color = cfg.color || U.token('--series-1');
    var surface = U.token('--surface-1');
    var pts = cfg.points.map(function (p) {
      var cx = X(p.x), cy = Y(p.y);
      var dot = el('circle', {
        class: 'mark', cx: cx, cy: cy, r: p.r || 5, fill: color,
        stroke: surface, 'stroke-width': '2'                /* 2px paviršiaus žiedas */
      });
      s.appendChild(dot);
      return { p: p, cx: cx, cy: cy, dot: dot };
    });

    /* Ryškiausi taškai gauna tiesiogines etiketes — atrankiai, ne visi.
       Susiliečiančios etiketės praleidžiamos: geriau mažiau, nei sulipę. */
    var placed = [];
    (cfg.labelTop || []).forEach(function (name) {
      var hit0 = pts.filter(function (q) { return q.p.label === name; })[0];
      if (!hit0) return;
      var collides = placed.some(function (o) {
        return Math.abs(o.x - hit0.cx) < 78 && Math.abs(o.y - hit0.cy) < 20;
      }) || pts.some(function (o) {
        return o !== hit0 && Math.abs(o.cx - hit0.cx) < 34 && (hit0.cy - o.cy) > 2 && (hit0.cy - o.cy) < 20;
      });
      if (collides) return;
      placed.push({ x: hit0.cx, y: hit0.cy });
      s.appendChild(el('text', {
        class: 'dlabel', x: hit0.cx, y: hit0.cy - 11, 'text-anchor': 'middle', text: hit0.p.label
      }));
    });

    var hit = el('rect', { class: 'hit', x: m.l, y: m.t, width: Math.max(1, pw), height: ph });
    s.appendChild(hit);

    function findNearest(evt) {
      var box = s.getBoundingClientRect();
      var scale = width / box.width;
      var px = (evt.clientX - box.left) * scale, py = (evt.clientY - box.top) * scale;
      var best = null, bd = Infinity;
      pts.forEach(function (q) {
        var d = (q.cx - px) * (q.cx - px) + (q.cy - py) * (q.cy - py);
        if (d < bd) { bd = d; best = q; }
      });
      return bd < 60 * 60 ? best : null;
    }
    function move(evt) {
      var q = findNearest(evt);
      s.classList.toggle('is-hovering', !!q);
      pts.forEach(function (o) { o.dot.classList.remove('is-hot'); });
      if (!q) { hideTip(); return; }
      q.dot.classList.add('is-hot');
      showTip(evt, q.p.label, (cfg.tipRows ? cfg.tipRows(q.p) : [
        { name: cfg.yLabel || 'Y', value: fmtY(q.p.y), color: color },
        { name: cfg.xLabel || 'X', value: fmtX(q.p.x) }
      ]), q.p.meta);
    }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', function () {
      s.classList.remove('is-hovering');
      pts.forEach(function (o) { o.dot.classList.remove('is-hot'); });
      hideTip();
    });
    return s;
  }

  /* =========================================================================
     Lentelės pagalbinė — grafiko dvynys
     ====================================================================== */
  function table(head, rows) {
    var thead = el('thead', {}, [
      el('tr', {}, head.map(function (hh) {
        return el('th', { class: hh.num ? 'num' : '', scope: 'col', text: hh.label });
      }))
    ]);
    var tbody = el('tbody', {}, rows.map(function (r) {
      return el('tr', {}, r.map(function (c, i) {
        if (c && c.node) return el('td', { class: head[i].num ? 'num' : '' }, [c.node]);
        return el('td', { class: head[i].num ? 'num' : '', text: c === null || c === undefined ? '—' : String(c) });
      }));
    }));
    return el('table', { class: 'tbl' }, [thead, tbody]);
  }

  return {
    card: card, legend: legend, rampLegend: rampLegend, table: table,
    sparkline: sparkline, lineChart: lineChart, stackedBars: stackedBars,
    barsH: barsH, divergingBarsH: divergingBarsH, donut: donut, calendarHeatmap: calendarHeatmap,
    matrixHeatmap: matrixHeatmap, scatter: scatter,
    showTip: showTip, hideTip: hideTip, positionTip: positionTip,
    resizeAll: resizeAll
  };
})();
