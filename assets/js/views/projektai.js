/* =============================================================================
   views/projektai.js — 3 skirtukas: projektų gilinimasis
   ========================================================================== */
Views.projektai = (function () {
  'use strict';

  var el = U.el;
  var sortState = { key: 'tokens', dir: -1 };

  function render(state) {
    var slice = Data.range(state.range);
    var prev = Data.previous(state.range);
    var projects = Data.byProject(slice);
    var before = Data.byProject(prev);
    var beforeMap = {};
    before.forEach(function (p) { beforeMap[p.id] = p; });

    var totalTokens = U.sum(projects, function (p) { return p.tokens; }) || 1;
    var frag = document.createDocumentFragment();

    /* --- Plytelės ---------------------------------------------------------- */

    var leader = projects[0] || { name: '—', tokens: 0, cost: 0 };
    var lines = U.sum(slice, function (d) { return d.linesAdded + d.linesRemoved; });
    var linesBefore = U.sum(prev, function (d) { return d.linesAdded + d.linesRemoved; });

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Aktyvūs projektai', value: U.num(projects.length),
        foot: 'turėję bent vieną sesiją', color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Pirmaujantis projektas', value: U.dec((leader.tokens / totalTokens) * 100, 0), unit: ' %',
        foot: leader.name, color: U.token('--series-2')
      })]),
      VH.col(3, [VH.tile({
        label: 'Pakeistos eilutės', value: U.compact(lines),
        delta: Data.pctChange(lines, linesBefore),
        foot: 'pridėta ir pašalinta',
        spark: VH.spark(slice, function (d) { return d.linesAdded + d.linesRemoved; }),
        color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Kaštai · pirmaujantis', value: U.money(leader.cost),
        foot: U.dec((leader.cost / (U.sum(projects, function (p) { return p.cost; }) || 1)) * 100, 0) + ' % visų kaštų',
        color: U.token('--series-4')
      })])
    ]));

    /* --- Sukrauti stulpeliai per laiką ------------------------------------- */

    frag.appendChild(VH.section('Dėmesio pasiskirstymas', 'kaip projektai dalijosi žetonus per laiką'));

    var topIds = projects.slice(0, 5).map(function (p) { return p.id; });
    var buckets = VH.bucketize(slice, 30);
    var series = topIds.map(function (pid) {
      var p = projects.filter(function (x) { return x.id === pid; })[0];
      return {
        name: p.name,
        /* Spalva seka projektą, o ne jo vietą reitinge — filtruojant
           išlikusieji nepersidažo. */
        color: U.seriesColor(p.slot),
        values: buckets.groups.map(function (g) {
          return Math.round(U.sum(g.days, function (d) { return d.tokensTotal * (d.projSplit[pid] || 0); }));
        })
      };
    });
    /* Uodega suvyniojama į „Kita" — niekada negeneruojama 9-a spalva */
    series.push({
      name: 'Kiti projektai',
      /* Uodega — neutrali pilka, o ne devinta sugeneruota spalva */
      color: U.token('--text-muted'),
      values: buckets.groups.map(function (g) {
        return Math.round(U.sum(g.days, function (d) {
          return U.sum(Object.keys(d.projSplit), function (pid) {
            return topIds.indexOf(pid) === -1 ? d.tokensTotal * d.projSplit[pid] : 0;
          });
        }));
      })
    });

    frag.appendChild(VH.grid([
      VH.col(12, [Chart.card({
        title: 'Žetonai pagal projektą',
        sub: 'grupuojama pagal ' + buckets.unit + ', ' + state.rangeLabel.toLowerCase(),
        legendBefore: Chart.legend(series),
        render: function (w) {
          return Chart.stackedBars(w, {
            labels: buckets.groups.map(function (g) { return g.label; }),
            series: series,
            height: 300,
            format: U.compact,
            tipTitle: function (i) {
              var g = buckets.groups[i];
              return g.from === g.to ? U.fullDate(g.from) : U.dayLabel(g.from) + ' – ' + U.dayLabel(g.to);
            }
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Laikotarpis' }].concat(series.map(function (s) { return { label: s.name, num: true }; })),
            buckets.groups.map(function (g, i) {
              return [g.from === g.to ? U.dayLabel(g.from) : U.dayLabel(g.from) + ' – ' + U.dayLabel(g.to)]
                .concat(series.map(function (s) { return U.num(s.values[i]); }));
            })
          );
        }
      })])
    ]));

    /* --- Lentelė + kalbos --------------------------------------------------- */

    frag.appendChild(VH.section('Visi projektai', 'spustelėk stulpelio antraštę, kad perrikiuotum'));

    frag.appendChild(VH.grid([VH.col(12, [projectTable(projects, beforeMap, totalTokens)])]));

    /* --- Vieno projekto kreivė ---------------------------------------------- */

    frag.appendChild(VH.section('Vieno projekto kreivė', 'pasirink projektą ir matyk jo dienos ritmą'));
    frag.appendChild(VH.grid([
      VH.col(8, [singleProjectCard(slice, projects, state)]),
      VH.col(4, [languageCard(projects)])
    ]));

    return frag;
  }

  /* --- Rikiuojama projektų lentelė ---------------------------------------- */

  function projectTable(projects, beforeMap, totalTokens) {
    var COLS = [
      { key: 'name', label: 'Projektas' },
      { key: 'lang', label: 'Kalba' },
      { key: 'tokens', label: 'Žetonai', num: true },
      { key: 'sessions', label: 'Sesijos', num: true },
      { key: 'messages', label: 'Pranešimai', num: true },
      { key: 'cost', label: 'Kaštai', num: true },
      { key: 'delta', label: 'Pokytis', num: true },
      { key: 'lastActive', label: 'Paskutinį kartą' }
    ];

    var body = el('div', { class: 'table-wrap' });
    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Projektų lentelė' }),
          el('p', { class: 'card__sub', text: projects.length + ' projektai · ' + U.compact(totalTokens) + ' žetonų' })
        ])
      ]),
      el('div', { class: 'card__body' }, [body])
    ]);

    function draw() {
      var rows = projects.map(function (p) {
        var was = beforeMap[p.id];
        return {
          p: p,
          delta: was && was.tokens ? ((p.tokens - was.tokens) / was.tokens) * 100 : null
        };
      });
      rows.sort(function (a, b) {
        var k = sortState.key;
        var av = k === 'delta' ? (a.delta === null ? -Infinity : a.delta) : a.p[k];
        var bv = k === 'delta' ? (b.delta === null ? -Infinity : b.delta) : b.p[k];
        if (typeof av === 'string' || typeof bv === 'string') {
          return String(av || '').localeCompare(String(bv || ''), 'lt') * sortState.dir * -1;
        }
        return ((av || 0) - (bv || 0)) * sortState.dir;
      });

      var thead = el('thead', {}, [el('tr', {}, COLS.map(function (c) {
        var th = el('th', {
          class: 'sortable' + (c.num ? ' num' : ''), scope: 'col', text: c.label,
          'aria-sort': sortState.key === c.key ? (sortState.dir === 1 ? 'ascending' : 'descending') : 'none',
          onclick: function () {
            if (sortState.key === c.key) sortState.dir *= -1;
            else { sortState.key = c.key; sortState.dir = -1; }
            draw();
          }
        });
        return th;
      }))]);

      var tbody = el('tbody', {}, rows.map(function (r) {
        var p = r.p;
        return el('tr', {}, [
          el('td', {}, [
            el('span', { class: 'swatch', style: { background: U.seriesColor(p.slot) } }),
            document.createTextNode(p.name)
          ]),
          el('td', { text: p.lang }),
          el('td', { class: 'num', text: U.num(Math.round(p.tokens)) }),
          el('td', { class: 'num', text: U.num(Math.round(p.sessions)) }),
          el('td', { class: 'num', text: U.num(Math.round(p.messages)) }),
          el('td', { class: 'num', text: U.money(p.cost) }),
          el('td', { class: 'num' }, [r.delta === null ? document.createTextNode('—') : U.deltaEl(r.delta)]),
          el('td', { text: p.lastActive ? U.relativeDays(p.lastActive) : '—' })
        ]);
      }));

      U.clear(body).appendChild(el('table', { class: 'tbl' }, [thead, tbody]));
    }
    draw();
    return card;
  }

  /* --- Kalbų pasiskirstymas ------------------------------------------------ */

  function languageCard(projects) {
    var acc = {};
    projects.forEach(function (p) {
      if (p.lang === '—') return;
      acc[p.lang] = (acc[p.lang] || 0) + p.tokens;
    });
    var slices = Object.keys(acc)
      .map(function (k) { return { name: k, value: acc[k] }; })
      .sort(function (a, b) { return b.value - a.value; })
      .slice(0, 6)
      .map(function (s, i) { s.color = U.seriesColor(i); return s; });
    var total = U.sum(slices, function (s) { return s.value; }) || 1;

    return Chart.card({
      title: 'Kalbos',
      sub: 'pagal projektų žetonus',
      legendAfter: Chart.legend(slices.map(function (s) {
        return { name: s.name, color: s.color, note: U.dec((s.value / total) * 100, 0) + ' %' };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 186, slices: slices, format: U.compact, valueName: 'Žetonai',
          centerValue: String(slices.length), centerLabel: 'kalbos'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Kalba' }, { label: 'Žetonai', num: true }, { label: 'Dalis', num: true }],
          slices.map(function (s) {
            return [s.name, U.num(Math.round(s.value)), U.dec((s.value / total) * 100, 1) + ' %'];
          })
        );
      }
    });
  }

  /* --- Vieno projekto kreivė ------------------------------------------------ */

  function singleProjectCard(slice, projects, state) {
    var chosen = state.project && projects.filter(function (p) { return p.id === state.project; })[0]
      ? state.project : (projects[0] || {}).id;

    var picker = el('select', {
      class: 'select', 'aria-label': 'Pasirink projektą',
      onchange: function () { state.project = picker.value; App.rerender(); }
    }, projects.map(function (p) {
      return el('option', { value: p.id, selected: p.id === chosen, text: p.name });
    }));

    var proj = projects.filter(function (p) { return p.id === chosen; })[0] || projects[0];
    var values = slice.map(function (d) { return Math.round(d.tokensTotal * (d.projSplit[chosen] || 0)); });
    var color = U.seriesColor(proj ? proj.slot : 0);

    return Chart.card({
      title: proj ? proj.name : 'Projektas',
      sub: proj ? (proj.lang + ' · ' + Math.round(proj.sessions) + ' sesijos · ' + U.money(proj.cost)) : '',
      tools: [picker],
      render: function (w) {
        return Chart.lineChart(w, {
          labels: slice.map(function (d) { return U.dayLabel(d.date); }),
          height: 240, area: true, format: U.compact,
          series: [{ name: 'Žetonai', color: color, values: values }],
          tipTitle: function (i) { return U.fullDate(slice[i].date); }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Data' }, { label: 'Žetonai', num: true }],
          slice.slice().reverse().map(function (d, i) {
            return [U.fullDate(d.date), U.num(values[values.length - 1 - i])];
          })
        );
      }
    });
  }

  return {
    title: 'Projektai',
    sub: 'kur nuėjo laikas ir žetonai',
    needsRange: true,
    render: render
  };
})();
