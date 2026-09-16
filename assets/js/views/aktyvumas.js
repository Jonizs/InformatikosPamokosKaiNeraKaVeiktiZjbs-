/* =============================================================================
   views/aktyvumas.js — 5 skirtukas: aktyvumo ritmas
   ========================================================================== */
Views.aktyvumas = (function () {
  'use strict';

  var el = U.el;

  function render(state) {
    var slice = Data.range(state.range);
    var prev = Data.previous(state.range);
    var now = Data.totals(slice);
    var was = Data.totals(prev);
    var st = Data.streaks(slice);
    var matrix = Data.hourMatrix(slice);
    var frag = document.createDocumentFragment();

    /* Piko valanda ir diena */
    var hourTotals = [];
    for (var hh = 0; hh < 24; hh++) {
      hourTotals.push(U.sum(matrix, function (row) { return row[hh]; }));
    }
    var peakHour = hourTotals.indexOf(Math.max.apply(null, hourTotals));
    var dayTotals = matrix.map(function (row) { return U.sum(row); });
    var peakDay = dayTotals.indexOf(Math.max.apply(null, dayTotals));

    /* --- Plytelės ----------------------------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Dabartinė serija', value: U.num(st.current), unit: ' d.',
        foot: 'ilgiausia buvo ' + st.best + ' d.', color: U.token('--series-6')
      })]),
      VH.col(3, [VH.tile({
        label: 'Aktyvios dienos', value: U.dec((now.activeDays / Math.max(1, now.days)) * 100, 0), unit: ' %',
        delta: Data.pctChange(now.activeDays, was.activeDays),
        foot: now.activeDays + ' iš ' + now.days + ' dienų',
        spark: VH.spark(slice, function (d) { return d.sessions > 0 ? 1 : 0; }),
        color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Piko valanda', value: pad(peakHour) + ':00',
        foot: U.compact(hourTotals[peakHour]) + ' pranešimų per laikotarpį',
        color: U.token('--series-4')
      })]),
      VH.col(3, [VH.tile({
        label: 'Stipriausia diena', value: U.WEEKDAYS_SHORT[peakDay],
        foot: U.dec((dayTotals[peakDay] / (U.sum(dayTotals) || 1)) * 100, 0) + ' % viso aktyvumo',
        color: U.token('--series-3')
      })])
    ]));

    /* --- Savaitės diena × valanda ------------------------------------------- */

    frag.appendChild(VH.section('Kada dirbama', 'kiekvienas langelis — savaitės diena ir paros valanda'));

    var hourLabels = [];
    for (var h2 = 0; h2 < 24; h2++) hourLabels.push(pad(h2));

    frag.appendChild(VH.grid([
      VH.col(12, [Chart.card({
        title: 'Savaitės diena × valanda',
        sub: 'pranešimų kiekis, ' + state.rangeLabel.toLowerCase(),
        flush: true,
        legendAfter: Chart.rampLegend('tyliau', 'karščiau'),
        render: function (w) {
          return Chart.matrixHeatmap(w - 14, {
            rowLabels: U.WEEKDAYS,
            colLabels: hourLabels,
            values: matrix,
            cellHeight: 22,
            valueName: 'Pranešimai'
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Diena' }].concat(hourLabels.map(function (l) { return { label: l, num: true }; })),
            matrix.map(function (row, i) {
              return [U.WEEKDAYS_LONG[i]].concat(row.map(function (v) { return U.num(v); }));
            })
          );
        }
      })])
    ]));

    /* --- Savaitės dienos ir paros kreivė ------------------------------------ */

    frag.appendChild(VH.grid([
      VH.col(6, [weekdayCard(dayTotals)]),
      VH.col(6, [hourCard(hourTotals, hourLabels)])
    ]));

    /* --- Kalendorius + sesijų ilgis ----------------------------------------- */

    frag.appendChild(VH.section('Tęstinumas', 'kiek dienų iš eilės nesustota'));
    frag.appendChild(VH.grid([
      VH.col(7, [Chart.card({
        title: 'Aktyvumo kalendorius',
        sub: 'kuo tamsesnis langelis, tuo daugiau pranešimų',
        flush: true,
        legendAfter: Chart.rampLegend('0', U.num(Math.max.apply(null, slice.map(function (d) { return d.messages; })))),
        render: function (w) {
          return Chart.calendarHeatmap(w - 14, {
            days: slice.map(function (d) {
              return {
                date: d.date, value: d.messages,
                note: d.sessions > 0
                  ? d.sessions + ' sesijos · ' + U.compact(d.tokensTotal) + ' žetonų'
                  : 'neaktyvi diena'
              };
            }),
            valueName: 'Pranešimai'
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Data' }, { label: 'Diena' }, { label: 'Pranešimai', num: true },
             { label: 'Sesijos', num: true }, { label: 'Žetonai', num: true }],
            slice.slice().reverse().map(function (d) {
              return [U.fullDate(d.date), U.WEEKDAYS_LONG[d.weekday], U.num(d.messages),
                      U.num(d.sessions), U.num(d.tokensTotal)];
            })
          );
        }
      })]),
      VH.col(5, [streakCard(slice, st, now)])
    ]));

    /* --- Sesijų intensyvumas ------------------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(12, [intensityCard(slice)])
    ]));

    return frag;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* --- Tęstinumo suvestinė -------------------------------------------------- */

  function streakCard(slice, st, now) {
    var gaps = [];
    var run = 0;
    slice.forEach(function (d) {
      if (d.sessions === 0) run++;
      else { if (run) gaps.push(run); run = 0; }
    });
    if (run) gaps.push(run);
    var longestGap = gaps.length ? Math.max.apply(null, gaps) : 0;
    var busiest = slice.slice().sort(function (a, b) { return b.messages - a.messages; })[0];

    var rows = [
      ['Dabartinė serija', st.current + ' d.'],
      ['Ilgiausia serija', st.best + ' d.'],
      ['Ilgiausia pertrauka', longestGap + ' d.'],
      ['Pertraukų skaičius', String(gaps.length)],
      ['Vidutiniškai pranešimų per aktyvią dieną', U.num(Math.round(now.messages / Math.max(1, now.activeDays)))],
      ['Darbingiausia diena', busiest ? U.fullDate(busiest.date) : '—'],
      ['Tos dienos pranešimai', busiest ? U.num(busiest.messages) : '—']
    ];
    var dl = el('dl', { class: 'kv' });
    rows.forEach(function (r) {
      dl.appendChild(el('dt', { text: r[0] }));
      dl.appendChild(el('dd', { text: r[1] }));
    });

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Serijos ir pertraukos' }),
          el('p', { class: 'card__sub', text: 'kiek nuosekliai dirbama per laikotarpį' })
        ])
      ]),
      el('div', { class: 'card__body' }, [dl])
    ]);
  }

  /* --- Savaitės dienos ------------------------------------------------------ */

  function weekdayCard(dayTotals) {
    var accent = U.token('--series-1');
    return Chart.card({
      title: 'Pagal savaitės dieną',
      sub: 'viena serija — viena spalva',
      render: function (w) {
        return Chart.barsH(w, {
          rows: U.WEEKDAYS_LONG.map(function (name, i) {
            return { label: name, value: Math.round(dayTotals[i]) };
          }),
          color: accent, format: U.compact, valueName: 'Pranešimai',
          rowHeight: 34, labelWidth: 108
        });
      },
      table: function () {
        var total = U.sum(dayTotals) || 1;
        return Chart.table(
          [{ label: 'Diena' }, { label: 'Pranešimai', num: true }, { label: 'Dalis', num: true }],
          U.WEEKDAYS_LONG.map(function (name, i) {
            return [name, U.num(Math.round(dayTotals[i])), U.dec((dayTotals[i] / total) * 100, 1) + ' %'];
          })
        );
      }
    });
  }

  /* --- Paros kreivė --------------------------------------------------------- */

  function hourCard(hourTotals, hourLabels) {
    return Chart.card({
      title: 'Paros kreivė',
      sub: 'pranešimų pasiskirstymas per 24 valandas',
      render: function (w) {
        return Chart.lineChart(w, {
          labels: hourLabels.map(function (l) { return l + ':00'; }),
          height: 258, area: true, format: U.compact,
          series: [{ name: 'Pranešimai', color: U.token('--series-4'), values: hourTotals.map(Math.round) }],
          tipTitle: function (i) { return hourLabels[i] + ':00 – ' + hourLabels[(i + 1) % 24] + ':00'; }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Valanda' }, { label: 'Pranešimai', num: true }],
          hourTotals.map(function (v, i) { return [hourLabels[i] + ':00', U.num(Math.round(v))]; })
        );
      }
    });
  }

  /* --- Sesijų intensyvumas: sesijos vs pranešimai vienai sesijai ------------ */

  function intensityCard(slice) {
    var pts = slice.filter(function (d) { return d.sessions > 0; }).map(function (d) {
      return {
        x: d.sessions,
        y: Math.round(d.messages / d.sessions),
        r: 5,
        label: U.fullDate(d.date),
        meta: U.compact(d.tokensTotal) + ' žetonų · ' + U.money(Data.dayCost(d)),
        day: d
      };
    });
    var avg = pts.length ? U.sum(pts, function (p) { return p.y; }) / pts.length : 0;

    return Chart.card({
      title: 'Dienos intensyvumas',
      sub: 'kiekvienas taškas — viena diena: kiek sesijų ir kiek žinučių kiekvienoje',
      render: function (w) {
        return Chart.scatter(w, {
          points: pts, height: 300,
          color: U.token('--series-1'),
          xLabel: 'Sesijos per dieną',
          yLabel: 'Pranešimai vienai sesijai',
          xFormat: function (v) { return U.num(Math.round(v)); },
          yFormat: function (v) { return U.num(Math.round(v)); },
          refY: avg, refLabel: 'vidurkis ' + U.dec(avg, 0),
          tipRows: function (p) {
            return [
              { name: 'Pranešimai / sesija', value: U.num(p.y), color: U.token('--series-1') },
              { name: 'Sesijos', value: U.num(p.x) }
            ];
          }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Data' }, { label: 'Sesijos', num: true }, { label: 'Pranešimai / sesija', num: true },
           { label: 'Žetonai', num: true }],
          pts.slice().reverse().map(function (p) {
            return [p.label, U.num(p.x), U.num(p.y), U.num(p.day.tokensTotal)];
          })
        );
      }
    });
  }

  return {
    title: 'Aktyvumas',
    sub: 'ritmas, serijos ir paros įpročiai',
    needsRange: true,
    render: render
  };
})();
