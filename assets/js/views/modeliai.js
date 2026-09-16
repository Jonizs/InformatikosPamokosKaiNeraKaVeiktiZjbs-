/* =============================================================================
   views/modeliai.js — 4 skirtukas: modeliai ir kaštai
   ========================================================================== */
Views.modeliai = (function () {
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

    /* Kiek kainuotų be podėlio: podėlio skaitymas apmokestintas pilna įvesties kaina */
    var noCache = 0;
    slice.forEach(function (d) {
      Data.MODELS.forEach(function (m) {
        var share = d.modelSplit[m.id];
        noCache += ((d.tokensIn + d.cacheRead) * share / 1e6) * R[m.id].in;
        noCache += (d.tokensOut * share / 1e6) * R[m.id].out;
      });
    });
    var saved = Math.max(0, noCache - now.cost);

    /* --- Herojus + plytelės ------------------------------------------------ */

    frag.appendChild(VH.grid([
      VH.col(8, [VH.hero({
        label: 'Įvertinti kaštai · ' + state.rangeLabel.toLowerCase(),
        value: U.money(now.cost),
        delta: Data.pctChange(now.cost, was.cost),
        upIsGood: false,
        deltaNote: 'lyginant su ankstesniu laikotarpiu',
        sparkValues: VH.spark(slice, function (d) { return Data.dayCost(d); }),
        sparkColor: U.token('--series-2')
      })]),
      VH.col(4, [VH.tile({
        label: 'Sutaupyta podėliu', value: U.money(saved),
        foot: U.dec((saved / (noCache || 1)) * 100, 0) + ' % nuo kainos be podėlio',
        color: U.token('--series-3')
      })])
    ]));

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Kaštai per dieną', value: U.money(now.cost / Math.max(1, now.days)),
        foot: 'vidurkis per visas dienas', color: U.token('--series-2'),
        spark: VH.spark(slice, function (d) { return Data.dayCost(d); })
      })]),
      VH.col(3, [VH.tile({
        label: 'Kaina 1 mln. žetonų', value: U.money(now.cost / Math.max(0.000001, now.tokensTotal / 1e6)),
        foot: 'faktinis mišinio vidurkis', color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Podėlio pataikymas', value: U.dec(now.cacheHitRate, 1), unit: ' %',
        delta: now.cacheHitRate - was.cacheHitRate, deltaUnit: 'p.p.',
        foot: 'įvesties iš podėlio', color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Dažniausias modelis', value: models[0] ? models[0].name : '—',
        foot: models[0] ? U.dec((models[0].tokens / (now.tokensTotal || 1)) * 100, 0) + ' % žetonų' : '',
        color: U.token('--series-4')
      })])
    ]));

    /* --- Kaštai per laiką pagal modelį -------------------------------------- */

    frag.appendChild(VH.section('Kaštai per laiką', 'sukrauta pagal modelį — viena ašis, jokių dvigubų skalių'));

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
        title: 'Kaštai pagal modelį',
        sub: 'grupuojama pagal ' + buckets.unit,
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
            [{ label: 'Laikotarpis' }].concat(costSeries.map(function (s) { return { label: s.name, num: true }; }))
              .concat([{ label: 'Iš viso', num: true }]),
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

    /* --- Palyginimo lentelė -------------------------------------------------- */

    frag.appendChild(VH.section('Modelių palyginimas', 'kiekvieno modelio krūvis, kaina ir efektyvumas'));

    frag.appendChild(VH.grid([
      VH.col(7, [modelTable(models, now)]),
      VH.col(5, [ratesCard(R, models)])
    ]));

    /* --- Žetonų tipai pagal modelį ------------------------------------------ */

    frag.appendChild(VH.section('Žetonų tipai', 'kur iš tikrųjų sukasi apimtis'));
    frag.appendChild(VH.grid([VH.col(12, [tokenTypesCard(models)])]));

    return frag;
  }

  /* --- Kaupiamieji kaštai --------------------------------------------------- */

  function cumulativeCard(slice) {
    var running = 0;
    var values = slice.map(function (d) { running += Data.dayCost(d); return running; });
    return Chart.card({
      title: 'Kaupiamieji kaštai',
      sub: 'kaip suma auga per laikotarpį',
      render: function (w) {
        return Chart.lineChart(w, {
          labels: slice.map(function (d) { return U.dayLabel(d.date); }),
          height: 292, area: true, peakLabel: false,
          format: function (v) { return U.money(v); },
          yFormat: function (v) { return '$' + U.compactAxis(v); },
          series: [{ name: 'Suma', color: U.token('--series-2'), values: values }],
          tipTitle: function (i) { return U.fullDate(slice[i].date); }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Data' }, { label: 'Tos dienos kaštai', num: true }, { label: 'Suma', num: true }],
          slice.slice().reverse().map(function (d, i) {
            return [U.fullDate(d.date), U.money(Data.dayCost(d)), U.money(values[values.length - 1 - i])];
          })
        );
      }
    });
  }

  /* --- Modelių lentelė ------------------------------------------------------ */

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
          el('h3', { class: 'card__title', text: 'Pagal modelį' }),
          el('p', { class: 'card__sub', text: 'iš viso ' + U.compact(now.tokensTotal) + ' žetonų · ' + U.money(now.cost) })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        el('div', { class: 'table-wrap' }, [
          el('table', { class: 'tbl' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { scope: 'col', text: 'Modelis' }),
              el('th', { class: 'num', scope: 'col', text: 'Žetonai' }),
              el('th', { class: 'num', scope: 'col', text: 'Įvestis' }),
              el('th', { class: 'num', scope: 'col', text: 'Išvestis' }),
              el('th', { class: 'num', scope: 'col', text: 'Kaštai' }),
              el('th', { class: 'num', scope: 'col', text: '$ / 1k pranešimų' }),
              el('th', { scope: 'col', text: 'Dalis' })
            ])]),
            el('tbody', {}, rows)
          ])
        ])
      ])
    ]);
  }

  /* --- Tarifų kortelė ------------------------------------------------------- */

  function ratesCard(R, models) {
    var dl = el('dl', { class: 'kv' });
    Data.MODELS.forEach(function (m) {
      dl.appendChild(el('dt', {}, [
        el('span', { class: 'swatch', style: { background: U.seriesColor(m.slot) } }),
        document.createTextNode(m.name)
      ]));
      dl.appendChild(el('dd', { text: U.money(R[m.id].in, 2) + ' / ' + U.money(R[m.id].out, 2) }));
    });
    dl.appendChild(el('dt', { text: 'Podėlio skaitymas' }));
    dl.appendChild(el('dd', { text: '×' + U.dec(R.cacheReadFactor, 2) + ' įvesties' }));
    dl.appendChild(el('dt', { text: 'Podėlio rašymas' }));
    dl.appendChild(el('dd', { text: '×' + U.dec(R.cacheWriteFactor, 2) + ' įvesties' }));

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Naudojami tarifai' }),
          el('p', { class: 'card__sub', text: '$ už 1 mln. žetonų · įvestis / išvestis' })
        ]),
        el('div', { class: 'card__tools' }, [
          el('a', { class: 'link-btn', href: '#/nustatymai', text: 'Keisti' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        dl,
        el('div', { style: { marginTop: '14px' } }, [
          VH.note('Tarifai — prielaida.',
            'Skydas nežino tavo realių įkainių, todėl skaičiuoja pagal čia įrašytas reikšmes. ' +
            'Pakeisk jas „Nustatymuose", ir visi kaštai persiskaičiuos.')
        ])
      ])
    ]);
  }

  /* --- Žetonų tipai --------------------------------------------------------- */

  function tokenTypesCard(models) {
    var types = [
      { key: 'cacheRead', name: 'Podėlio skaitymas' },
      { key: 'tokensIn', name: 'Įvestis' },
      { key: 'cacheWrite', name: 'Podėlio rašymas' },
      { key: 'tokensOut', name: 'Išvestis' }
    ];
    var series = models.map(function (m, i) {
      return {
        name: m.name, color: U.seriesColor(m.slot),
        values: types.map(function (t) { return Math.round(m[t.key]); })
      };
    });
    return Chart.card({
      title: 'Žetonų tipai pagal modelį',
      sub: 'sukrauti stulpeliai — kiekvienas tipas viename stulpelyje',
      legendBefore: Chart.legend(series),
      render: function (w) {
        return Chart.stackedBars(w, {
          labels: types.map(function (t) { return t.name; }),
          series: series, height: 260, barWidth: 24, format: U.compact
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Tipas' }].concat(series.map(function (s) { return { label: s.name, num: true }; })),
          types.map(function (t, i) {
            return [t.name].concat(series.map(function (s) { return U.num(s.values[i]); }));
          })
        );
      }
    });
  }

  return {
    title: 'Modeliai ir kaštai',
    sub: 'kas dirba ir kiek tai kainuoja',
    needsRange: true,
    render: render
  };
})();
