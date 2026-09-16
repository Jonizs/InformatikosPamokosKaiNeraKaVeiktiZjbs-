/* =============================================================================
   views/activity.js — tab 5: the rhythm of the work
   ========================================================================== */
Views.activity = (function () {
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

    /* Peak hour and peak day */
    var hourTotals = [];
    for (var hh = 0; hh < 24; hh++) {
      hourTotals.push(U.sum(matrix, function (row) { return row[hh]; }));
    }
    var peakHour = hourTotals.indexOf(Math.max.apply(null, hourTotals));
    var dayTotals = matrix.map(function (row) { return U.sum(row); });
    var peakDay = dayTotals.indexOf(Math.max.apply(null, dayTotals));

    /* --- Tiles ------------------------------------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Current streak', value: U.num(st.current), unit: ' days',
        foot: 'longest was ' + st.best + ' days', color: U.token('--series-6')
      })]),
      VH.col(3, [VH.tile({
        label: 'Active days', value: U.dec((now.activeDays / Math.max(1, now.days)) * 100, 0), unit: '%',
        delta: Data.pctChange(now.activeDays, was.activeDays),
        foot: now.activeDays + ' of ' + now.days + ' days',
        spark: VH.spark(slice, function (d) { return d.sessions > 0 ? 1 : 0; }),
        color: U.token('--series-1')
      })]),
      VH.col(3, [VH.tile({
        label: 'Peak hour', value: pad(peakHour) + ':00',
        foot: U.compact(hourTotals[peakHour]) + ' messages in the period',
        color: U.token('--series-4')
      })]),
      VH.col(3, [VH.tile({
        label: 'Strongest day', value: U.WEEKDAYS_LONG[peakDay],
        foot: U.dec((dayTotals[peakDay] / (U.sum(dayTotals) || 1)) * 100, 0) + '% of all activity',
        color: U.token('--series-3')
      })])
    ]));

    /* --- Weekday × hour ----------------------------------------------------------- */

    frag.appendChild(VH.section('When the work happens', 'each cell is one weekday and one hour of the day'));

    var hourLabels = [];
    for (var h2 = 0; h2 < 24; h2++) hourLabels.push(pad(h2));

    frag.appendChild(VH.grid([
      VH.col(12, [Chart.card({
        title: 'Weekday × hour',
        sub: 'message counts, ' + state.rangeLabel.toLowerCase(),
        flush: true,
        legendAfter: Chart.rampLegend('quieter', 'busier'),
        render: function (w) {
          return Chart.matrixHeatmap(w - 14, {
            rowLabels: U.WEEKDAYS,
            colLabels: hourLabels,
            values: matrix,
            cellHeight: 22,
            valueName: 'Messages'
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Day' }].concat(hourLabels.map(function (l) { return { label: l, num: true }; })),
            matrix.map(function (row, i) {
              return [U.WEEKDAYS_LONG[i]].concat(row.map(function (v) { return U.num(v); }));
            })
          );
        }
      })])
    ]));

    /* --- Weekdays and the hour-of-day curve ----------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(6, [weekdayCard(dayTotals)]),
      VH.col(6, [hourCard(hourTotals, hourLabels)])
    ]));

    /* --- Calendar + streaks ------------------------------------------------------------ */

    frag.appendChild(VH.section('Consistency', 'how many days in a row without stopping'));
    frag.appendChild(VH.grid([
      VH.col(7, [Chart.card({
        title: 'Activity calendar',
        sub: 'the darker the cell, the more messages',
        flush: true,
        legendAfter: Chart.rampLegend('0', U.num(Math.max.apply(null, slice.map(function (d) { return d.messages; })))),
        render: function (w) {
          return Chart.calendarHeatmap(w - 14, {
            days: slice.map(function (d) {
              return {
                date: d.date, value: d.messages,
                note: d.sessions > 0
                  ? d.sessions + ' sessions · ' + U.compact(d.tokensTotal) + ' tokens'
                  : 'no activity'
              };
            }),
            valueName: 'Messages'
          });
        },
        table: function () {
          return Chart.table(
            [{ label: 'Date' }, { label: 'Day' }, { label: 'Messages', num: true },
             { label: 'Sessions', num: true }, { label: 'Tokens', num: true }],
            slice.slice().reverse().map(function (d) {
              return [U.fullDate(d.date), U.WEEKDAYS_LONG[d.weekday], U.num(d.messages),
                      U.num(d.sessions), U.num(d.tokensTotal)];
            })
          );
        }
      })]),
      VH.col(5, [streakCard(slice, st, now)])
    ]));

    /* --- Session intensity ----------------------------------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(12, [intensityCard(slice)])
    ]));

    return frag;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* --- Streak summary -------------------------------------------------------------------- */

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
      ['Current streak', st.current + ' days'],
      ['Longest streak', st.best + ' days'],
      ['Longest gap', longestGap + ' days'],
      ['Number of gaps', String(gaps.length)],
      ['Average messages per active day', U.num(Math.round(now.messages / Math.max(1, now.activeDays)))],
      ['Busiest day', busiest ? U.fullDate(busiest.date) : '—'],
      ['Messages that day', busiest ? U.num(busiest.messages) : '—']
    ];
    var dl = el('dl', { class: 'kv' });
    rows.forEach(function (r) {
      dl.appendChild(el('dt', { text: r[0] }));
      dl.appendChild(el('dd', { text: r[1] }));
    });

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Streaks and gaps' }),
          el('p', { class: 'card__sub', text: 'how consistent the period was' })
        ])
      ]),
      el('div', { class: 'card__body' }, [dl])
    ]);
  }

  /* --- Weekdays ------------------------------------------------------------------------- */

  function weekdayCard(dayTotals) {
    var accent = U.token('--series-1');
    return Chart.card({
      title: 'By weekday',
      sub: 'one series, one colour',
      render: function (w) {
        return Chart.barsH(w, {
          rows: U.WEEKDAYS_LONG.map(function (name, i) {
            return { label: name, value: Math.round(dayTotals[i]) };
          }),
          color: accent, format: U.compact, valueName: 'Messages',
          rowHeight: 34, labelWidth: 108
        });
      },
      table: function () {
        var total = U.sum(dayTotals) || 1;
        return Chart.table(
          [{ label: 'Day' }, { label: 'Messages', num: true }, { label: 'Share', num: true }],
          U.WEEKDAYS_LONG.map(function (name, i) {
            return [name, U.num(Math.round(dayTotals[i])), U.dec((dayTotals[i] / total) * 100, 1) + '%'];
          })
        );
      }
    });
  }

  /* --- Hour-of-day curve ------------------------------------------------------------------- */

  function hourCard(hourTotals, hourLabels) {
    return Chart.card({
      title: 'Hour-of-day curve',
      sub: 'how messages spread across 24 hours',
      render: function (w) {
        return Chart.lineChart(w, {
          labels: hourLabels.map(function (l) { return l + ':00'; }),
          height: 258, area: true, format: U.compact,
          series: [{ name: 'Messages', color: U.token('--series-4'), values: hourTotals.map(Math.round) }],
          tipTitle: function (i) { return hourLabels[i] + ':00 – ' + hourLabels[(i + 1) % 24] + ':00'; }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Hour' }, { label: 'Messages', num: true }],
          hourTotals.map(function (v, i) { return [hourLabels[i] + ':00', U.num(Math.round(v))]; })
        );
      }
    });
  }

  /* --- Session intensity: sessions vs messages per session ----------------------------------- */

  function intensityCard(slice) {
    var pts = slice.filter(function (d) { return d.sessions > 0; }).map(function (d) {
      return {
        x: d.sessions,
        y: Math.round(d.messages / d.sessions),
        r: 5,
        label: U.fullDate(d.date),
        meta: U.compact(d.tokensTotal) + ' tokens · ' + U.money(Data.dayCost(d)),
        day: d
      };
    });
    var avg = pts.length ? U.sum(pts, function (p) { return p.y; }) / pts.length : 0;

    return Chart.card({
      title: 'Daily intensity',
      sub: 'each dot is one day: how many sessions, and how many messages in each',
      render: function (w) {
        return Chart.scatter(w, {
          points: pts, height: 300,
          color: U.token('--series-1'),
          xLabel: 'Sessions per day',
          yLabel: 'Messages per session',
          xFormat: function (v) { return U.num(Math.round(v)); },
          yFormat: function (v) { return U.num(Math.round(v)); },
          refY: avg, refLabel: 'average ' + U.dec(avg, 0),
          tipRows: function (p) {
            return [
              { name: 'Messages / session', value: U.num(p.y), color: U.token('--series-1') },
              { name: 'Sessions', value: U.num(p.x) }
            ];
          }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Date' }, { label: 'Sessions', num: true }, { label: 'Messages / session', num: true },
           { label: 'Tokens', num: true }],
          pts.slice().reverse().map(function (p) {
            return [p.label, U.num(p.x), U.num(p.y), U.num(p.day.tokensTotal)];
          })
        );
      }
    });
  }

  return {
    title: 'Activity',
    sub: 'rhythm, streaks and time-of-day habits',
    needsRange: true,
    render: render
  };
})();
