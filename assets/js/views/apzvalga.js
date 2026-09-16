/* =============================================================================
   views/apzvalga.js — 1 skirtukas: Claude paskyros naudojimo apžvalga
   ========================================================================== */
Views.apzvalga = (function () {
  'use strict';

  var el = U.el;

  function render(state) {
    var slice = Data.range(state.range);
    var prev = Data.previous(state.range);
    var now = Data.totals(slice);
    var was = Data.totals(prev);
    var frag = document.createDocumentFragment();

    /* --- Herojinis skaičius + plytelės ------------------------------------ */

    frag.appendChild(VH.grid([
      VH.col(8, [VH.hero({
        label: 'Iš viso žetonų · ' + state.rangeLabel.toLowerCase(),
        value: U.compact(now.tokensTotal),
        delta: Data.pctChange(now.tokensTotal, was.tokensTotal),
        deltaNote: 'lyginant su ankstesniu tokiu pat laikotarpiu',
        sparkValues: VH.spark(slice, function (d) { return d.tokensTotal; }),
        sparkColor: U.token('--series-1')
      })]),
      VH.col(4, [VH.tile({
        label: 'Įvertinti kaštai',
        value: U.money(now.cost),
        delta: Data.pctChange(now.cost, was.cost),
        upIsGood: false,
        foot: 'pagal redaguojamus tarifus',
        spark: VH.spark(slice, function (d) { return Data.dayCost(d); }),
        color: U.token('--series-2')
      })])
    ]));

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Sesijos', value: U.num(now.sessions),
        delta: Data.pctChange(now.sessions, was.sessions),
        foot: U.dec(now.sessions / Math.max(1, now.activeDays), 1) + ' per aktyvią dieną',
        spark: VH.spark(slice, function (d) { return d.sessions; }),
        color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Pranešimai', value: U.compact(now.messages),
        delta: Data.pctChange(now.messages, was.messages),
        foot: U.num(Math.round(now.messages / Math.max(1, now.sessions))) + ' vienai sesijai',
        spark: VH.spark(slice, function (d) { return d.messages; }),
        color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Įrankių iškvietimai', value: U.compact(now.toolCalls),
        delta: Data.pctChange(now.toolCalls, was.toolCalls),
        foot: U.dec(now.toolCalls / Math.max(1, now.messages), 1) + ' vienam pranešimui',
        spark: VH.spark(slice, function (d) { return d.toolCalls; }),
        color: U.token('--series-4')
      })]),
      VH.col(3, [VH.tile({
        label: 'Aktyvios dienos', value: U.num(now.activeDays),
        unit: ' / ' + now.days,
        delta: Data.pctChange(now.activeDays, was.activeDays),
        foot: 'serija: ' + Data.streaks(slice).current + ' d. iš eilės',
        spark: VH.spark(slice, function (d) { return d.sessions > 0 ? 1 : 0; }),
        color: U.token('--series-6')
      })])
    ]));

    /* --- Žetonų srautas + sudėtis ----------------------------------------- */

    frag.appendChild(VH.section('Žetonų srautas', 'kiek modelis perskaitė ir parašė per laikotarpį'));

    var flowLabels = slice.map(function (d) { return U.dayLabel(d.date); });
    frag.appendChild(VH.grid([
      VH.col(8, [Chart.card({
        title: 'Žetonai per dieną',
        sub: 'įvestis + išvestis + podėlis, ' + state.rangeLabel.toLowerCase(),
        render: function (w) {
          return Chart.lineChart(w, {
            labels: flowLabels,
            height: 268,
            area: true,
            format: U.compact,
            series: [{ name: 'Žetonai', color: U.token('--series-1'),
                       values: slice.map(function (d) { return d.tokensTotal; }) }],
            tipTitle: function (i) { return U.fullDate(slice[i].date); },
            tipFoot: function (i) {
              return slice[i].sessions + ' sesijos · ' + U.money(Data.dayCost(slice[i]));
            }
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Data' }, { label: 'Žetonai', num: true }, { label: 'Sesijos', num: true },
             { label: 'Pranešimai', num: true }, { label: 'Kaštai', num: true }],
            slice.slice().reverse().map(function (d) {
              return [U.fullDate(d.date), U.num(d.tokensTotal), U.num(d.sessions),
                      U.num(d.messages), U.money(Data.dayCost(d))];
            })
          );
        }
      })]),
      VH.col(4, [compositionCard(slice, now)])
    ]));

    /* --- Projektai + modeliai --------------------------------------------- */

    frag.appendChild(VH.section('Kur dirbama', 'projektų ir modelių pasiskirstymas'));

    var projects = Data.byProject(slice);
    frag.appendChild(VH.grid([
      VH.col(7, [projectsCard(projects)]),
      VH.col(5, [modelsCard(slice)])
    ]));

    /* --- Kalendorius ------------------------------------------------------- */

    frag.appendChild(VH.section('Aktyvumo kalendorius', 'pranešimų kiekis kiekvieną dieną'));
    frag.appendChild(VH.grid([
      VH.col(7, [calendarCard(slice)]),
      VH.col(5, [hottestDaysCard(slice)])
    ]));

    /* --- Paskutinės sesijos ------------------------------------------------ */

    frag.appendChild(VH.section('Paskutinės sesijos', 'naujausias darbas, naujausias viršuje'));
    frag.appendChild(VH.grid([
      VH.col(7, [sessionsCard()]),
      VH.col(5, [balanceCard(now, was)])
    ]));

    return frag;
  }

  /* --- Kortelė: žetonų sudėtis ------------------------------------------- */

  function compositionCard(slice, now) {
    var parts = [
      { name: 'Podėlio skaitymas', value: now.cacheRead, color: U.token('--series-1') },
      { name: 'Įvestis', value: now.tokensIn, color: U.token('--series-2') },
      { name: 'Podėlio rašymas', value: now.cacheWrite, color: U.token('--series-3') },
      { name: 'Išvestis', value: now.tokensOut, color: U.token('--series-4') }
    ];
    return Chart.card({
      title: 'Žetonų sudėtis',
      sub: 'podėlio dalis rodo, kiek sutaupoma',
      legendAfter: Chart.legend(parts.map(function (p) {
        return { name: p.name, color: p.color, note: U.dec((p.value / (now.tokensTotal || 1)) * 100, 0) + ' %' };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 190,
          slices: parts,
          format: U.compact,
          valueName: 'Žetonai',
          centerValue: U.dec(now.cacheHitRate, 0) + ' %',
          centerLabel: 'iš podėlio'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Tipas' }, { label: 'Žetonai', num: true }, { label: 'Dalis', num: true }],
          parts.map(function (p) {
            return [p.name, U.num(Math.round(p.value)), U.dec((p.value / (now.tokensTotal || 1)) * 100, 1) + ' %'];
          })
        );
      }
    });
  }

  /* --- Kortelė: daugiausiai dirbti projektai ------------------------------ */

  function projectsCard(projects) {
    var top = projects.slice(0, 7);
    var max = top.length ? top[0].tokens : 1;
    var accent = U.token('--series-1');
    return Chart.card({
      title: 'Daugiausiai dirbti projektai',
      sub: 'pagal sunaudotus žetonus',
      render: function (w) {
        return Chart.barsH(w, {
          rows: top.map(function (p) {
            return {
              label: p.name, value: Math.round(p.tokens),
              note: Math.round(p.sessions) + ' sesijos · ' + U.money(p.cost)
            };
          }),
          color: accent,
          format: U.compact,
          valueName: 'Žetonai',
          rowHeight: 36
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Projektas' }, { label: 'Kalba' }, { label: 'Žetonai', num: true },
           { label: 'Sesijos', num: true }, { label: 'Kaštai', num: true }, { label: 'Dalis' }],
          projects.map(function (p) {
            return [p.name, p.lang, U.num(Math.round(p.tokens)), U.num(Math.round(p.sessions)),
                    U.money(p.cost), { node: VH.barCell(p.tokens, max, accent) }];
          })
        );
      }
    });
  }

  /* --- Kortelė: modeliai -------------------------------------------------- */

  function modelsCard(slice) {
    var models = Data.byModel(slice);
    var total = U.sum(models, function (m) { return m.tokens; }) || 1;
    var withColor = models.map(function (m) {
      return { name: m.name, value: m.tokens, color: U.seriesColor(m.slot), cost: m.cost, messages: m.messages };
    });
    return Chart.card({
      title: 'Modelių pasiskirstymas',
      sub: 'kuris modelis kiek dirbo',
      legendAfter: Chart.legend(withColor.map(function (m) {
        return { name: m.name, color: m.color, note: U.dec((m.value / total) * 100, 0) + ' %' };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 190, slices: withColor, format: U.compact, valueName: 'Žetonai',
          centerValue: U.compact(total), centerLabel: 'žetonų'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Modelis' }, { label: 'Žetonai', num: true }, { label: 'Pranešimai', num: true },
           { label: 'Kaštai', num: true }, { label: 'Dalis', num: true }],
          withColor.map(function (m) {
            return [m.name, U.num(Math.round(m.value)), U.num(Math.round(m.messages)),
                    U.money(m.cost), U.dec((m.value / total) * 100, 1) + ' %'];
          })
        );
      }
    });
  }

  /* --- Kortelė: kalendorius ----------------------------------------------- */

  function calendarCard(slice) {
    var days = slice.map(function (d) {
      return { date: d.date, value: d.messages, note: d.sessions + ' sesijos · ' + U.compact(d.tokensTotal) + ' žetonų' };
    });
    var st = Data.streaks(slice);
    return Chart.card({
      title: 'Kasdienis aktyvumas',
      sub: 'ilgiausia serija — ' + st.best + ' d. iš eilės',
      flush: true,
      legendAfter: Chart.rampLegend('tyliau', 'karščiau'),
      render: function (w) {
        return Chart.calendarHeatmap(w - 14, { days: days, valueName: 'Pranešimai' });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Data' }, { label: 'Savaitės diena' }, { label: 'Pranešimai', num: true }, { label: 'Sesijos', num: true }],
          slice.slice().reverse().filter(function (d) { return d.messages > 0; }).map(function (d) {
            return [U.fullDate(d.date), U.WEEKDAYS_LONG[d.weekday], U.num(d.messages), U.num(d.sessions)];
          })
        );
      }
    });
  }

  /* --- Kortelė: karščiausios dienos --------------------------------------- */

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
            text: d.sessions + ' sesijos · ' + U.num(d.messages) + ' pranešimų · ' + U.money(Data.dayCost(d)) })
        ]),
        el('div', { style: { width: '84px', flex: 'none' } }, [VH.barCell(d.tokensTotal, max, accent)]),
        el('div', { class: 'list__val', style: { minWidth: '68px', textAlign: 'right' },
                    text: U.compact(d.tokensTotal) })
      ]));
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Karščiausios dienos' }),
          el('p', { class: 'card__sub', text: 'daugiausiai žetonų sunaudojusios dienos' })
        ])
      ]),
      el('div', { class: 'card__body' }, [list])
    ]);
  }

  /* --- Kortelė: paskutinės sesijos ---------------------------------------- */

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
          el('h3', { class: 'card__title', text: 'Sesijų juosta' }),
          el('p', { class: 'card__sub', text: 'projektas, modelis, trukmė ir sunaudoti žetonai' })
        ])
      ]),
      el('div', { class: 'card__body' }, [list])
    ]);
  }

  function colorForProject(id) {
    var p = Data.PROJECTS.filter(function (x) { return x.id === id; })[0];
    return U.seriesColor(p ? p.slot : 0);
  }

  /* --- Kortelė: santrauka skaičiais --------------------------------------- */

  function balanceCard(now, was) {
    var rows = [
      ['Žetonų vienai sesijai', U.compact(now.avgSession)],
      ['Žetonų aktyviai dienai', U.compact(now.avgPerActiveDay)],
      ['Podėlio pataikymas', U.pct(now.cacheHitRate, 1)],
      ['Pridėta eilučių', U.num(now.linesAdded)],
      ['Pašalinta eilučių', U.num(now.linesRemoved)],
      ['Kaštai vienai sesijai', U.money(now.cost / Math.max(1, now.sessions))],
      ['Kaštai 1 mln. žetonų', U.money(now.cost / Math.max(1, now.tokensTotal / 1e6))]
    ];
    var dl = el('dl', { class: 'kv' });
    rows.forEach(function (r) {
      dl.appendChild(el('dt', { text: r[0] }));
      dl.appendChild(el('dd', { text: r[1] }));
    });
    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Santrauka' }),
          el('p', { class: 'card__sub', text: 'vidurkiai per pasirinktą laikotarpį' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        dl,
        el('div', { style: { marginTop: '14px' } }, [
          VH.note('Demo duomenys.', 'Skaičiai sugeneruoti vietoje, kad skydas veiktų be serverio. ' +
            'Realų šaltinį prijunk „Nustatymų" skirtuke.')
        ])
      ])
    ]);
  }

  return {
    title: 'Apžvalga',
    sub: 'Claude paskyros naudojimas',
    needsRange: true,
    render: render
  };
})();
