/* =============================================================================
   views/projects.js — tab 3: a deeper look at projects
   ========================================================================== */
Views.projects = (function () {
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

    frag.appendChild(VH.demoBanner(
      'The project names, repositories and every number here are invented placeholders, ' +
      'not a scan of your GitHub account.'));

    /* --- Tiles ---------------------------------------------------------------- */

    var leader = projects[0] || { name: '—', tokens: 0, cost: 0 };
    var lines = U.sum(slice, function (d) { return d.linesAdded + d.linesRemoved; });
    var linesBefore = U.sum(prev, function (d) { return d.linesAdded + d.linesRemoved; });

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Active projects', value: U.num(projects.length),
        foot: 'with at least one session', color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Leading project', value: U.dec((leader.tokens / totalTokens) * 100, 0), unit: '%',
        foot: leader.name, color: U.token('--series-2')
      })]),
      VH.col(3, [VH.tile({
        label: 'Lines changed', value: U.compact(lines),
        delta: Data.pctChange(lines, linesBefore),
        foot: 'added and removed',
        spark: VH.spark(slice, function (d) { return d.linesAdded + d.linesRemoved; }),
        color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Cost · leader', value: U.money(leader.cost),
        foot: U.dec((leader.cost / (U.sum(projects, function (p) { return p.cost; }) || 1)) * 100, 0) + '% of all cost',
        color: U.token('--series-4')
      })])
    ]));

    /* --- Stacked bars over time ------------------------------------------------- */

    frag.appendChild(VH.section('Where attention went', 'how projects shared tokens over time'));

    var topIds = projects.slice(0, 5).map(function (p) { return p.id; });
    var buckets = VH.bucketize(slice, 30);
    var series = topIds.map(function (pid) {
      var p = projects.filter(function (x) { return x.id === pid; })[0];
      return {
        name: p.name,
        /* Colour follows the project, never its rank — survivors of a filter
           never get repainted. */
        color: U.seriesColor(p.slot),
        values: buckets.groups.map(function (g) {
          return Math.round(U.sum(g.days, function (d) { return d.tokensTotal * (d.projSplit[pid] || 0); }));
        })
      };
    });
    /* The tail folds into "Other" — a 9th hue is never generated */
    series.push({
      name: 'Other projects',
      /* The tail gets neutral grey, not a ninth generated hue */
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
        title: 'Tokens by project',
        sub: 'grouped by ' + buckets.unit + ', ' + state.rangeLabel.toLowerCase(),
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
            [{ label: 'Period' }].concat(series.map(function (s) { return { label: s.name, num: true }; })),
            buckets.groups.map(function (g, i) {
              return [g.from === g.to ? U.dayLabel(g.from) : U.dayLabel(g.from) + ' – ' + U.dayLabel(g.to)]
                .concat(series.map(function (s) { return U.num(s.values[i]); }));
            })
          );
        }
      })])
    ]));

    /* --- Table + languages -------------------------------------------------------- */

    frag.appendChild(VH.section('All projects', 'click a column heading to re-sort'));

    frag.appendChild(VH.grid([VH.col(12, [projectTable(projects, beforeMap, totalTokens)])]));

    /* --- Single-project curve ------------------------------------------------------ */

    frag.appendChild(VH.section('Single-project curve', 'pick a project and see its daily rhythm'));
    frag.appendChild(VH.grid([
      VH.col(8, [singleProjectCard(slice, projects, state)]),
      VH.col(4, [languageCard(projects)])
    ]));

    return frag;
  }

  /* --- Sortable project table ------------------------------------------------------ */

  function projectTable(projects, beforeMap, totalTokens) {
    var COLS = [
      { key: 'name', label: 'Project' },
      { key: 'lang', label: 'Language' },
      { key: 'tokens', label: 'Tokens', num: true },
      { key: 'sessions', label: 'Sessions', num: true },
      { key: 'messages', label: 'Messages', num: true },
      { key: 'cost', label: 'Cost', num: true },
      { key: 'delta', label: 'Change', num: true },
      { key: 'lastActive', label: 'Last active' }
    ];

    var body = el('div', { class: 'table-wrap' });
    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Project table' }),
          el('p', { class: 'card__sub', text: projects.length + ' projects · ' + U.compact(totalTokens) + ' tokens' })
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
          return String(av || '').localeCompare(String(bv || ''), 'en') * sortState.dir * -1;
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

  /* --- Language split ---------------------------------------------------------------- */

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
      title: 'Languages',
      sub: 'by project tokens',
      legendAfter: Chart.legend(slices.map(function (s) {
        return { name: s.name, color: s.color, note: U.dec((s.value / total) * 100, 0) + '%' };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 186, slices: slices, format: U.compact, valueName: 'Tokens',
          centerValue: String(slices.length), centerLabel: 'languages'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Language' }, { label: 'Tokens', num: true }, { label: 'Share', num: true }],
          slices.map(function (s) {
            return [s.name, U.num(Math.round(s.value)), U.dec((s.value / total) * 100, 1) + '%'];
          })
        );
      }
    });
  }

  /* --- Single-project curve ------------------------------------------------------------ */

  function singleProjectCard(slice, projects, state) {
    var chosen = state.project && projects.filter(function (p) { return p.id === state.project; })[0]
      ? state.project : (projects[0] || {}).id;

    var picker = el('select', {
      class: 'select', 'aria-label': 'Choose a project',
      onchange: function () { state.project = picker.value; App.rerender(); }
    }, projects.map(function (p) {
      return el('option', { value: p.id, selected: p.id === chosen, text: p.name });
    }));

    var proj = projects.filter(function (p) { return p.id === chosen; })[0] || projects[0];
    var values = slice.map(function (d) { return Math.round(d.tokensTotal * (d.projSplit[chosen] || 0)); });
    var color = U.seriesColor(proj ? proj.slot : 0);

    return Chart.card({
      title: proj ? proj.name : 'Project',
      sub: proj ? (proj.lang + ' · ' + Math.round(proj.sessions) + ' sessions · ' + U.money(proj.cost)) : '',
      tools: [picker],
      render: function (w) {
        return Chart.lineChart(w, {
          labels: slice.map(function (d) { return U.dayLabel(d.date); }),
          height: 240, area: true, format: U.compact,
          series: [{ name: 'Tokens', color: color, values: values }],
          tipTitle: function (i) { return U.fullDate(slice[i].date); }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Date' }, { label: 'Tokens', num: true }],
          slice.slice().reverse().map(function (d, i) {
            return [U.fullDate(d.date), U.num(values[values.length - 1 - i])];
          })
        );
      }
    });
  }

  return {
    title: 'Projects',
    sub: 'where the time and tokens went · demo dataset',
    needsRange: true,
    render: render
  };
})();
