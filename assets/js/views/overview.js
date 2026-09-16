/* =============================================================================
   views/overview.js — tab 1: Claude account usage overview
   ========================================================================== */
Views.overview = (function () {
  'use strict';

  var el = U.el;

  function render(state) {
    var slice = Data.range(state.range);
    var prev = Data.previous(state.range);
    var now = Data.totals(slice);
    var was = Data.totals(prev);
    var frag = document.createDocumentFragment();

    frag.appendChild(VH.demoBanner(
      'Every figure below is generated locally by a seeded random-number generator ' +
      'in assets/js/data/claude-data.js — the projects, sessions, tokens and costs are invented.'));

    /* --- Hero figure + tiles ------------------------------------------------ */

    frag.appendChild(VH.grid([
      VH.col(8, [VH.hero({
        label: 'Total tokens · ' + state.rangeLabel.toLowerCase(),
        value: U.compact(now.tokensTotal),
        delta: Data.pctChange(now.tokensTotal, was.tokensTotal),
        deltaNote: 'vs the preceding period of equal length',
        sparkValues: VH.spark(slice, function (d) { return d.tokensTotal; }),
        sparkColor: U.token('--series-1')
      })]),
      VH.col(4, [VH.tile({
        label: 'Estimated cost',
        value: U.money(now.cost),
        delta: Data.pctChange(now.cost, was.cost),
        upIsGood: false,
        foot: VH.costFoot(),
        spark: VH.spark(slice, function (d) { return Data.dayCost(d); }),
        color: U.token('--series-2')
      })])
    ]));

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Sessions', value: U.num(now.sessions),
        delta: Data.pctChange(now.sessions, was.sessions),
        foot: U.dec(now.sessions / Math.max(1, now.activeDays), 1) + ' per active day',
        spark: VH.spark(slice, function (d) { return d.sessions; }),
        color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Messages', value: U.compact(now.messages),
        delta: Data.pctChange(now.messages, was.messages),
        foot: U.num(Math.round(now.messages / Math.max(1, now.sessions))) + ' per session',
        spark: VH.spark(slice, function (d) { return d.messages; }),
        color: U.token('--series-3')
      })]),
      VH.col(3, [Data.hasMetric('toolCalls') ? VH.tile({
        label: 'Tool calls', value: U.compact(now.toolCalls),
        delta: Data.pctChange(now.toolCalls, was.toolCalls),
        foot: U.dec(now.toolCalls / Math.max(1, now.messages), 1) + ' per message',
        spark: VH.spark(slice, function (d) { return d.toolCalls; }),
        color: U.token('--series-4')
      }) : VH.tile({
        label: 'Tool calls', value: '—',
        foot: 'needs message content, which the exporter does not read',
        color: U.token('--series-4')
      })]),
      VH.col(3, [VH.tile({
        label: 'Active days', value: U.num(now.activeDays),
        unit: ' / ' + now.days,
        delta: Data.pctChange(now.activeDays, was.activeDays),
        foot: 'streak: ' + Data.streaks(slice).current + ' days',
        spark: VH.spark(slice, function (d) { return d.sessions > 0 ? 1 : 0; }),
        color: U.token('--series-6')
      })])
    ]));

    /* --- Token flow + composition -------------------------------------------- */

    frag.appendChild(VH.section('Token flow', 'how much the model read and wrote over the period'));

    var flowLabels = slice.map(function (d) { return U.dayLabel(d.date); });
    frag.appendChild(VH.grid([
      VH.col(8, [Chart.card({
        title: 'Tokens per day',
        sub: 'input + output + cache, ' + state.rangeLabel.toLowerCase(),
        render: function (w) {
          return Chart.lineChart(w, {
            labels: flowLabels,
            height: 268,
            area: true,
            format: U.compact,
            series: [{ name: 'Tokens', color: U.token('--series-1'),
                       values: slice.map(function (d) { return d.tokensTotal; }) }],
            tipTitle: function (i) { return U.fullDate(slice[i].date); },
            tipFoot: function (i) {
              return slice[i].sessions + ' sessions · ' + U.money(Data.dayCost(slice[i]));
            }
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Date' }, { label: 'Tokens', num: true }, { label: 'Sessions', num: true },
             { label: 'Messages', num: true }, { label: 'Cost', num: true }],
            slice.slice().reverse().map(function (d) {
              return [U.fullDate(d.date), U.num(d.tokensTotal), U.num(d.sessions),
                      U.num(d.messages), U.money(Data.dayCost(d))];
            })
          );
        }
      })]),
      VH.col(4, [compositionCard(slice, now)])
    ]));

    /* --- Projects + models ---------------------------------------------------- */

    frag.appendChild(VH.section('Where the work goes', 'split by project and by model'));

    var projects = Data.byProject(slice);
    frag.appendChild(VH.grid([
      VH.col(7, [projectsCard(projects)]),
      VH.col(5, [modelsCard(slice)])
    ]));

    /* --- Calendar -------------------------------------------------------------- */

    frag.appendChild(VH.section('Activity calendar', 'messages sent on each day'));
    frag.appendChild(VH.grid([
      VH.col(7, [calendarCard(slice)]),
      VH.col(5, [hottestDaysCard(slice)])
    ]));

    /* --- Recent sessions -------------------------------------------------------- */

    frag.appendChild(VH.section('Recent sessions', 'newest work first'));
    frag.appendChild(VH.grid([
      VH.col(7, [sessionsCard()]),
      VH.col(5, [balanceCard(now, was)])
    ]));

    return frag;
  }

  /* --- Card: token composition ------------------------------------------------ */

  function compositionCard(slice, now) {
    var parts = [
      { name: 'Cache read', value: now.cacheRead, color: U.token('--series-1') },
      { name: 'Input', value: now.tokensIn, color: U.token('--series-2') },
      { name: 'Cache write', value: now.cacheWrite, color: U.token('--series-3') },
      { name: 'Output', value: now.tokensOut, color: U.token('--series-4') }
    ];
    return Chart.card({
      title: 'Token composition',
      sub: 'the cache share is what you are not paying full price for',
      legendAfter: Chart.legend(parts.map(function (p) {
        return { name: p.name, color: p.color, note: U.dec((p.value / (now.tokensTotal || 1)) * 100, 0) + '%' };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 190,
          slices: parts,
          format: U.compact,
          valueName: 'Tokens',
          centerValue: U.dec(now.cacheHitRate, 0) + '%',
          centerLabel: 'from cache'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Type' }, { label: 'Tokens', num: true }, { label: 'Share', num: true }],
          parts.map(function (p) {
            return [p.name, U.num(Math.round(p.value)), U.dec((p.value / (now.tokensTotal || 1)) * 100, 1) + '%'];
          })
        );
      }
    });
  }

  /* --- Card: most-worked projects ---------------------------------------------- */

  function projectsCard(projects) {
    var top = projects.slice(0, 7);
    var max = top.length ? top[0].tokens : 1;
    var accent = U.token('--series-1');
    return Chart.card({
      title: 'Most-worked projects',
      sub: 'by tokens consumed',
      render: function (w) {
        return Chart.barsH(w, {
          rows: top.map(function (p) {
            return {
              label: p.name, value: Math.round(p.tokens),
              note: Math.round(p.sessions) + ' sessions · ' + U.money(p.cost)
            };
          }),
          color: accent,
          format: U.compact,
          valueName: 'Tokens',
          rowHeight: 36
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Project' }, { label: 'Language' }, { label: 'Tokens', num: true },
           { label: 'Sessions', num: true }, { label: 'Cost', num: true }, { label: 'Share' }],
          projects.map(function (p) {
            return [p.name, p.lang, U.num(Math.round(p.tokens)), U.num(Math.round(p.sessions)),
                    U.money(p.cost), { node: VH.barCell(p.tokens, max, accent) }];
          })
        );
      }
    });
  }

  /* --- Card: models ------------------------------------------------------------ */

  function modelsCard(slice) {
    var models = Data.byModel(slice);
    var total = U.sum(models, function (m) { return m.tokens; }) || 1;
    var withColor = models.map(function (m) {
      return { name: m.name, value: m.tokens, color: U.seriesColor(m.slot), cost: m.cost, messages: m.messages };
    });
    return Chart.card({
      title: 'Model split',
      sub: 'which model did how much of the work',
      legendAfter: Chart.legend(withColor.map(function (m) {
        return { name: m.name, color: m.color, note: U.dec((m.value / total) * 100, 0) + '%' };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 190, slices: withColor, format: U.compact, valueName: 'Tokens',
          centerValue: U.compact(total), centerLabel: 'tokens'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Model' }, { label: 'Tokens', num: true }, { label: 'Messages', num: true },
           { label: 'Cost', num: true }, { label: 'Share', num: true }],
          withColor.map(function (m) {
            return [m.name, U.num(Math.round(m.value)), U.num(Math.round(m.messages)),
                    U.money(m.cost), U.dec((m.value / total) * 100, 1) + '%'];
          })
        );
      }
    });
  }

  /* --- Card: calendar ----------------------------------------------------------- */

  function calendarCard(slice) {
    var days = slice.map(function (d) {
      return { date: d.date, value: d.messages, note: d.sessions + ' sessions · ' + U.compact(d.tokensTotal) + ' tokens' };
    });
    var st = Data.streaks(slice);
    return Chart.card({
      title: 'Daily activity',
      sub: 'longest streak — ' + st.best + ' days',
      flush: true,
      legendAfter: Chart.rampLegend('quieter', 'busier'),
      render: function (w) {
        return Chart.calendarHeatmap(w - 14, { days: days, valueName: 'Messages' });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Date' }, { label: 'Weekday' }, { label: 'Messages', num: true }, { label: 'Sessions', num: true }],
          slice.slice().reverse().filter(function (d) { return d.messages > 0; }).map(function (d) {
            return [U.fullDate(d.date), U.WEEKDAYS_LONG[d.weekday], U.num(d.messages), U.num(d.sessions)];
          })
        );
      }
    });
  }

  /* --- Card: hottest days --------------------------------------------------------- */

  function hottestDaysCard(slice) {
    var top = slice.slice().sort(function (a, b) { return b.tokensTotal - a.tokensTotal; }).slice(0, 6);
    var max = top.length ? top[0].tokensTotal : 1;
    var accent = U.token('--series-1');
    var list = el('div', { class: 'list' });
    top.forEach(function (d) {
      list.appendChild(el('div', { class: 'list__row' }, [
        el('div', { class: 'list__main' }, [
          el('div', { class: 'list__title', text: U.fullDate(d.date) }),
          el('div', { class: 'list__meta',
            text: d.sessions + ' sessions · ' + U.num(d.messages) + ' messages · ' + U.money(Data.dayCost(d)) })
        ]),
        el('div', { style: { width: '84px', flex: 'none' } }, [VH.barCell(d.tokensTotal, max, accent)]),
        el('div', { class: 'list__val', style: { minWidth: '68px', textAlign: 'right' },
                    text: U.compact(d.tokensTotal) })
      ]));
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Hottest days' }),
          el('p', { class: 'card__sub', text: 'the days that consumed the most tokens' })
        ])
      ]),
      el('div', { class: 'card__body' }, [list])
    ]);
  }

  /* --- Card: recent sessions ------------------------------------------------------ */

  function sessionsCard() {
    var rows = Data.recentSessions(9);
    var list = el('div', { class: 'list' });
    rows.forEach(function (s) {
      list.appendChild(el('div', { class: 'list__row' }, [
        el('span', { class: 'swatch', style: { background: colorForProject(s.project) } }),
        el('div', { class: 'list__main' }, [
          el('div', { class: 'list__title', text: s.title }),
          el('div', { class: 'list__meta',
            text: s.projectName + ' · ' + s.model + ' · ' + s.minutes + ' min · ' + U.relativeDays(s.date) })
        ]),
        el('div', { class: 'list__val', text: U.compact(s.tokens) })
      ]));
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Session feed' }),
          el('p', { class: 'card__sub', text: 'project, model, duration and tokens used' })
        ])
      ]),
      el('div', { class: 'card__body' }, [list])
    ]);
  }

  function colorForProject(id) {
    var p = Data.PROJECTS.filter(function (x) { return x.id === id; })[0];
    return U.seriesColor(p ? p.slot : 0);
  }

  /* --- Card: summary numbers ------------------------------------------------------- */

  function balanceCard(now, was) {
    var rows = [
      ['Tokens per session', U.compact(now.avgSession)],
      ['Tokens per active day', U.compact(now.avgPerActiveDay)],
      ['Cache hit rate', U.pct(now.cacheHitRate, 1)],
      ['Lines added', Data.hasMetric('linesAdded') ? U.num(now.linesAdded) : '—'],
      ['Lines removed', Data.hasMetric('linesRemoved') ? U.num(now.linesRemoved) : '—'],
      ['Cost per session', U.money(now.cost / Math.max(1, now.sessions))],
      ['Cost per 1M tokens', U.money(now.cost / Math.max(1, now.tokensTotal / 1e6))]
    ];
    var dl = el('dl', { class: 'kv' });
    rows.forEach(function (r) {
      dl.appendChild(el('dt', { text: r[0] }));
      dl.appendChild(el('dd', { text: r[1] }));
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Summary' }),
          el('p', { class: 'card__sub', text: 'averages across the selected period' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        dl,
        el('div', { style: { marginTop: '14px' } }, [
          VH.note('Demo data.', 'These numbers are generated locally so the dashboard runs with ' +
            'no server. Wire up a real source in the Settings tab.')
        ])
      ])
    ]);
  }

  return {
    title: 'Overview',
    get sub() { return 'Claude account usage' + (Data.isReal() ? '' : ' · demo dataset'); },
    needsRange: true,
    render: render
  };
})();
