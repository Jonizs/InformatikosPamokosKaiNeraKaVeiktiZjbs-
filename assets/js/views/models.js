/* =============================================================================
   views/models.js — tab 4: models and cost
   ========================================================================== */
Views.models = (function () {
  'use strict';

  var el = U.el;

  function render(state) {
    var slice = Data.range(state.range);
    var prev = Data.previous(state.range);
    var now = Data.totals(slice);
    var was = Data.totals(prev);
    var models = Data.byModel(slice);
    var R = Data.rates();
    var frag = document.createDocumentFragment();

    /* What it would cost with no cache: cache reads billed at full input price */
    var noCache = 0;
    slice.forEach(function (d) {
      Data.MODELS.forEach(function (m) {
        var share = d.modelSplit[m.id];
        noCache += ((d.tokensIn + d.cacheRead) * share / 1e6) * R[m.id].in;
        noCache += (d.tokensOut * share / 1e6) * R[m.id].out;
      });
    });
    var saved = Math.max(0, noCache - now.cost);

    /* --- Hero + tiles ----------------------------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(8, [VH.hero({
        label: 'Estimated cost · ' + state.rangeLabel.toLowerCase(),
        value: U.money(now.cost),
        delta: Data.pctChange(now.cost, was.cost),
        upIsGood: false,
        deltaNote: 'vs the preceding period',
        sparkValues: VH.spark(slice, function (d) { return Data.dayCost(d); }),
        sparkColor: U.token('--series-2')
      })]),
      VH.col(4, [VH.tile({
        label: 'Saved by caching', value: U.money(saved),
        foot: U.dec((saved / (noCache || 1)) * 100, 0) + '% off the uncached price',
        color: U.token('--series-3')
      })])
    ]));

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Cost per day', value: U.money(now.cost / Math.max(1, now.days)),
        foot: 'averaged over every day', color: U.token('--series-2'),
        spark: VH.spark(slice, function (d) { return Data.dayCost(d); })
      })]),
      VH.col(3, [VH.tile({
        label: 'Price per 1M tokens', value: U.money(now.cost / Math.max(0.000001, now.tokensTotal / 1e6)),
        foot: 'the actual blended rate', color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Cache hit rate', value: U.dec(now.cacheHitRate, 1), unit: '%',
        delta: now.cacheHitRate - was.cacheHitRate, deltaUnit: 'p.p.',
        foot: 'of input served from cache', color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Most-used model', value: models[0] ? models[0].name : '—',
        foot: models[0] ? U.dec((models[0].tokens / (now.tokensTotal || 1)) * 100, 0) + '% of tokens' : '',
        color: U.token('--series-4')
      })])
    ]));

    /* --- Cost over time by model --------------------------------------------------- */

    frag.appendChild(VH.section('Cost over time', 'stacked by model — one axis, never a dual scale'));

    var buckets = VH.bucketize(slice, 30);
    var costSeries = Data.MODELS.map(function (m, i) {
      return {
        name: m.name, color: U.seriesColor(i),
        values: buckets.groups.map(function (g) {
          return U.sum(g.days, function (d) {
            var share = d.modelSplit[m.id], r = R[m.id];
            return (d.tokensIn * share / 1e6) * r.in
                 + (d.tokensOut * share / 1e6) * r.out
                 + (d.cacheRead * share / 1e6) * r.in * R.cacheReadFactor
                 + (d.cacheWrite * share / 1e6) * r.in * R.cacheWriteFactor;
          });
        })
      };
    });

    frag.appendChild(VH.grid([
      VH.col(8, [Chart.card({
        title: 'Cost by model',
        sub: 'grouped by ' + buckets.unit,
        legendBefore: Chart.legend(costSeries),
        render: function (w) {
          return Chart.stackedBars(w, {
            labels: buckets.groups.map(function (g) { return g.label; }),
            series: costSeries, height: 292,
            format: function (v) { return U.money(v); },
            yFormat: function (v) { return '$' + U.compactAxis(v); },
            tipTitle: function (i) {
              var g = buckets.groups[i];
              return g.from === g.to ? U.fullDate(g.from) : U.dayLabel(g.from) + ' – ' + U.dayLabel(g.to);
            }
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Period' }].concat(costSeries.map(function (s) { return { label: s.name, num: true }; }))
              .concat([{ label: 'Total', num: true }]),
            buckets.groups.map(function (g, i) {
              var total = U.sum(costSeries, function (s) { return s.values[i]; });
              return [g.from === g.to ? U.dayLabel(g.from) : U.dayLabel(g.from) + ' – ' + U.dayLabel(g.to)]
                .concat(costSeries.map(function (s) { return U.money(s.values[i]); }))
                .concat([U.money(total)]);
            })
          );
        }
      })]),
      VH.col(4, [cumulativeCard(slice)])
    ]));

    /* --- Comparison table ------------------------------------------------------------ */

    frag.appendChild(VH.section('Model comparison', 'load, price and efficiency per model'));

    frag.appendChild(VH.grid([
      VH.col(7, [modelTable(models, now)]),
      VH.col(5, [ratesCard(R, models)])
    ]));

    /* --- Token types by model ----------------------------------------------------------- */

    frag.appendChild(VH.section('Token types', 'where the volume actually sits'));
    frag.appendChild(VH.grid([VH.col(12, [tokenTypesCard(models)])]));

    return frag;
  }

  /* --- Cumulative cost ---------------------------------------------------------------- */

  function cumulativeCard(slice) {
    var running = 0;
    var values = slice.map(function (d) { running += Data.dayCost(d); return running; });
    return Chart.card({
      title: 'Cumulative cost',
      sub: 'how the total builds across the period',
      render: function (w) {
        return Chart.lineChart(w, {
          labels: slice.map(function (d) { return U.dayLabel(d.date); }),
          height: 292, area: true, peakLabel: false,
          format: function (v) { return U.money(v); },
          yFormat: function (v) { return '$' + U.compactAxis(v); },
          series: [{ name: 'Running total', color: U.token('--series-2'), values: values }],
          tipTitle: function (i) { return U.fullDate(slice[i].date); }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Date' }, { label: 'That day', num: true }, { label: 'Running total', num: true }],
          slice.slice().reverse().map(function (d, i) {
            return [U.fullDate(d.date), U.money(Data.dayCost(d)), U.money(values[values.length - 1 - i])];
          })
        );
      }
    });
  }

  /* --- Model table ---------------------------------------------------------------------- */

  function modelTable(models, now) {
    var maxTokens = Math.max.apply(null, models.map(function (m) { return m.tokens; }).concat([1]));
    var rows = models.map(function (m) {
      return el('tr', {}, [
        el('td', {}, [
          el('span', { class: 'swatch', style: { background: U.seriesColor(m.slot) } }),
          document.createTextNode(m.name)
        ]),
        el('td', { class: 'num', text: U.compact(m.tokens) }),
        el('td', { class: 'num', text: U.compact(m.tokensIn) }),
        el('td', { class: 'num', text: U.compact(m.tokensOut) }),
        el('td', { class: 'num', text: U.money(m.cost) }),
        el('td', { class: 'num', text: m.messages > 0 ? U.money(m.cost / (m.messages / 1000)) : '—' }),
        el('td', {}, [VH.barCell(m.tokens, maxTokens, U.seriesColor(m.slot))])
      ]);
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'By model' }),
          el('p', { class: 'card__sub', text: U.compact(now.tokensTotal) + ' tokens · ' + U.money(now.cost) + ' total' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        el('div', { class: 'table-wrap' }, [
          el('table', { class: 'tbl' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { scope: 'col', text: 'Model' }),
              el('th', { class: 'num', scope: 'col', text: 'Tokens' }),
              el('th', { class: 'num', scope: 'col', text: 'Input' }),
              el('th', { class: 'num', scope: 'col', text: 'Output' }),
              el('th', { class: 'num', scope: 'col', text: 'Cost' }),
              el('th', { class: 'num', scope: 'col', text: '$ / 1k msgs' }),
              el('th', { scope: 'col', text: 'Share' })
            ])]),
            el('tbody', {}, rows)
          ])
        ])
      ])
    ]);
  }

  /* --- Rates card ------------------------------------------------------------------------- */

  function ratesCard(R, models) {
    var dl = el('dl', { class: 'kv' });
    Data.MODELS.forEach(function (m) {
      dl.appendChild(el('dt', {}, [
        el('span', { class: 'swatch', style: { background: U.seriesColor(m.slot) } }),
        document.createTextNode(m.name)
      ]));
      dl.appendChild(el('dd', { text: U.money(R[m.id].in, 2) + ' / ' + U.money(R[m.id].out, 2) }));
    });
    dl.appendChild(el('dt', { text: 'Cache read' }));
    dl.appendChild(el('dd', { text: '×' + U.dec(R.cacheReadFactor, 2) + ' input' }));
    dl.appendChild(el('dt', { text: 'Cache write' }));
    dl.appendChild(el('dd', { text: '×' + U.dec(R.cacheWriteFactor, 2) + ' input' }));

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Rates in use' }),
          el('p', { class: 'card__sub', text: '$ per 1M tokens · input / output' })
        ]),
        el('div', { class: 'card__tools' }, [
          el('a', { class: 'link-btn', href: '#/settings', text: 'Edit' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        dl,
        el('div', { style: { marginTop: '14px' } }, [
          VH.note('These rates are an assumption.',
            'The dashboard has no access to your real pricing, so every cost is computed from ' +
            'the values above. Change them in Settings and all figures recompute.')
        ])
      ])
    ]);
  }

  /* --- Token types ----------------------------------------------------------------------- */

  function tokenTypesCard(models) {
    var types = [
      { key: 'cacheRead', name: 'Cache read' },
      { key: 'tokensIn', name: 'Input' },
      { key: 'cacheWrite', name: 'Cache write' },
      { key: 'tokensOut', name: 'Output' }
    ];
    var series = models.map(function (m, i) {
      return {
        name: m.name, color: U.seriesColor(m.slot),
        values: types.map(function (t) { return Math.round(m[t.key]); })
      };
    });
    return Chart.card({
      title: 'Token types by model',
      sub: 'stacked bars — one column per token type',
      legendBefore: Chart.legend(series),
      render: function (w) {
        return Chart.stackedBars(w, {
          labels: types.map(function (t) { return t.name; }),
          series: series, height: 260, barWidth: 24, format: U.compact
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Type' }].concat(series.map(function (s) { return { label: s.name, num: true }; })),
          types.map(function (t, i) {
            return [t.name].concat(series.map(function (s) { return U.num(s.values[i]); }));
          })
        );
      }
    });
  }

  return {
    title: 'Models & cost',
    sub: 'who does the work and what it costs',
    needsRange: true,
    render: render
  };
})();
