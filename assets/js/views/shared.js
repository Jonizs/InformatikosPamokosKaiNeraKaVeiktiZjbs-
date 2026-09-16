/* =============================================================================
   views/shared.js — building blocks for the views (tiles, headings, bucketing)
   ========================================================================== */
window.Views = window.Views || {};
window.VH = (function () {
  'use strict';

  var el = U.el;

  /* --- Time bucketing -------------------------------------------------------- */

  /**
   * Splits a slice of days into <= maxBars groups (day / week / month) so a
   * bar chart stays readable even across a wide range.
   */
  function bucketize(slice, maxBars) {
    var max = maxBars || 32;
    if (slice.length <= max) {
      return {
        unit: 'day',
        groups: slice.map(function (d) { return { label: U.dayLabel(d.date), days: [d], from: d.date, to: d.date }; })
      };
    }
    var size = Math.ceil(slice.length / max);
    var unit = size >= 26 ? 'month' : size >= 6 ? 'week' : 'day group';
    var groups = [];
    for (var i = 0; i < slice.length; i += size) {
      var chunk = slice.slice(i, i + size);
      groups.push({
        label: U.dayLabel(chunk[0].date),
        days: chunk,
        from: chunk[0].date,
        to: chunk[chunk.length - 1].date
      });
    }
    return { unit: unit, groups: groups };
  }

  /** For sparklines — always 12 equal buckets. */
  function spark(slice, pick) {
    var n = 12;
    var size = Math.max(1, Math.ceil(slice.length / n));
    var out = [];
    for (var i = 0; i < slice.length; i += size) {
      out.push(U.sum(slice.slice(i, i + size), pick));
    }
    return out.length > 1 ? out : [0, out[0] || 0];
  }

  /* --- Hero figure (exactly one per view) ------------------------------------ */

  function hero(cfg) {
    return el('div', { class: 'card' }, [
      el('div', { class: 'hero' }, [
        el('div', { class: 'hero__main' }, [
          el('p', { class: 'hero__label', text: cfg.label }),
          el('p', { class: 'hero__value' }, [
            document.createTextNode(cfg.value),
            cfg.unit ? el('span', { class: 'hero__unit', text: cfg.unit }) : null
          ]),
          el('div', { class: 'hero__meta' }, [
            cfg.delta !== undefined ? U.deltaEl(cfg.delta, cfg.upIsGood, cfg.deltaUnit) : null,
            el('span', { text: cfg.deltaNote || '' })
          ])
        ]),
        cfg.sparkValues ? el('div', { class: 'hero__spark' }, [
          sparkWide(cfg.sparkValues, cfg.sparkColor)
        ]) : null
      ])
    ]);
  }

  function sparkWide(values, color) {
    var box = el('div');
    var draw = function () {
      var w = Math.max(160, box.clientWidth || 260);
      U.clear(box).appendChild(Chart.sparkline(values, { width: w, height: 54, area: true, color: color }));
    };
    requestAnimationFrame(draw);
    window.addEventListener('resize', function () { if (box.isConnected) draw(); });
    return box;
  }

  /* --- Stat tile -------------------------------------------------------------- */

  function tile(cfg) {
    return el('div', { class: 'card tile' }, [
      el('p', { class: 'tile__label', text: cfg.label }),
      el('div', { class: 'tile__row' }, [
        el('p', { class: 'tile__value' }, [
          document.createTextNode(cfg.value),
          cfg.unit ? el('small', { text: cfg.unit }) : null
        ]),
        cfg.spark ? el('div', { class: 'tile__spark' }, [
          Chart.sparkline(cfg.spark, { width: 76, height: 26, color: cfg.color })
        ]) : null
      ]),
      el('div', { class: 'tile__foot' }, [
        cfg.delta !== undefined ? U.deltaEl(cfg.delta, cfg.upIsGood, cfg.deltaUnit) : null,
        el('span', { text: cfg.foot || '' })
      ])
    ]);
  }

  /* --- Section heading -------------------------------------------------------- */

  function section(title, sub) {
    return el('div', { class: 'section-head' }, [
      el('h2', { text: title }),
      sub ? el('p', { text: sub }) : null
    ]);
  }

  /* --- Data-source note -------------------------------------------------------- */

  var INFO_PATH = 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5.5a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM11 12h2v5h-2z';

  function note(strongText, text) {
    return el('div', { class: 'note' }, [
      el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
        el('path', { d: INFO_PATH, fill: 'currentColor' })
      ]),
      el('p', {}, [
        el('strong', { text: strongText + ' ' }),
        document.createTextNode(text)
      ])
    ]);
  }

  /* --- Demo-data banner ------------------------------------------------------
     This dashboard ships with fabricated numbers. That has to be impossible
     to miss on every view, not a footnote on one card.
     -------------------------------------------------------------------- */

  function demoBanner(what) {
    return el('div', { class: 'demo-banner', role: 'note' }, [
      el('span', { class: 'demo-banner__tag', text: 'Demo data' }),
      el('p', { class: 'demo-banner__text' }, [
        el('strong', { text: 'These are not real numbers. ' }),
        document.createTextNode(what)
      ]),
      el('a', { class: 'demo-banner__link', href: '#/settings', text: 'How to connect real data →' })
    ]);
  }

  /* --- Segmented control -------------------------------------------------------- */

  function segmented(options, value, onChange, label) {
    var box = el('div', { class: 'segmented', role: 'group', 'aria-label': label || 'Filter' });
    options.forEach(function (o) {
      box.appendChild(el('button', {
        type: 'button',
        'aria-pressed': String(o.value === value),
        text: o.label,
        title: o.title || o.label,
        onclick: function () { if (o.value !== value) onChange(o.value); }
      }));
    });
    return box;
  }

  /* --- Inline bar for a table cell ----------------------------------------------- */

  function barCell(value, max, color) {
    return el('div', { class: 'bar-cell' }, [
      el('div', { class: 'bar-cell__track' }, [
        el('div', {
          class: 'bar-cell__fill',
          style: { width: U.clamp((value / (max || 1)) * 100, 2, 100) + '%', background: color }
        })
      ])
    ]);
  }

  /* --- Champion badge with an offline fallback ----------------------------------- */

  /**
   * @param sub  a second line under the name; `false` omits it entirely
   *             (e.g. when the table already has its own role column)
   */
  function champCell(champ, sub) {
       /* Start from the initials tile; the Data Dragon portrait is swapped in
          only once it actually loads, so an empty square is never shown. */
    var fallback = el('div', {
      class: 'champ__fallback', 'aria-hidden': 'true',
      title: champ.name,
      text: champ.name.replace(/[^A-Za-z ]/g, '').slice(0, 2).toUpperCase()
    });
    var img = el('img', {
      class: 'champ__img', src: champ.icon, alt: '', width: 32, height: 32
    });
    img.addEventListener('load', function () {
      if (fallback.parentNode) fallback.parentNode.replaceChild(img, fallback);
    });
    var line2 = sub === false ? null
      : el('div', { class: 'champ__role', text: sub || LoL.roleName(champ.role) });
    return el('div', { class: 'champ' }, [
      fallback,
      el('div', { style: { minWidth: '0' } }, [
        el('div', { class: 'champ__name', text: champ.name }),
        line2
      ])
    ]);
  }

  /* --- Grid helpers ----------------------------------------------------------- */

  function grid(children) {
    return el('div', { class: 'grid' }, children.filter(Boolean));
  }
  function col(span, children) {
    return el('div', { class: 'col-' + span }, children.filter(Boolean));
  }

  return {
    bucketize: bucketize, spark: spark, hero: hero, tile: tile, section: section,
    note: note, demoBanner: demoBanner, segmented: segmented, barCell: barCell, champCell: champCell,
    grid: grid, col: col
  };
})();
