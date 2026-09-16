/* =============================================================================
   views/lol.js — tab 2: League of Legends patches and the Emerald+ meta
   ========================================================================== */
Views.lol = (function () {
  'use strict';

  var el = U.el;
  var sortState = { key: 'wr', dir: -1 };

  function render(state) {
    var role = state.lolRole || 'ALL';
    var champs = LoL.byRole(role);
    var patch = LoL.current;
    var frag = document.createDocumentFragment();

    frag.appendChild(VH.demoBanner(
      'Patch ' + patch.version + ' is not a real Riot patch and these win rates are not live ' +
      'statistics — both were written by hand for this demo. The analysis below applies real ' +
      'analytical methods to that invented dataset.'));

    /* --- Filter row: one row, above everything it scopes -------------------- */

    frag.appendChild(el('div', { class: 'grid', style: { marginBottom: '2px' } }, [
      el('div', { class: 'col-12' }, [
        el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, [
          VH.segmented(
            [{ value: 'ALL', label: 'All roles' }].concat(LoL.ROLES.map(function (r) {
              return { value: r.id, label: r.name };
            })),
            role,
            function (v) { state.lolRole = v; App.rerender(); },
            'Role'
          ),
          el('span', { class: 'chip', text: 'Emerald+ · ranked solo/duo' }),
          el('span', { class: 'chip', text: 'Patch ' + patch.version })
        ])
      ])
    ]));

    /* --- Tiles --------------------------------------------------------------- */

    var best = champs.slice().sort(function (a, b) { return b.wr - a.wr; })[0];
    var mostBanned = champs.slice().sort(function (a, b) { return b.br - a.br; })[0];
    var climber = champs.slice().sort(function (a, b) { return b.d - a.d; })[0];
    var games = U.sum(champs, function (c) { return c.games; });

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Highest win rate', value: U.dec(best.wr, 1), unit: '%',
        delta: best.d, deltaUnit: 'pp', foot: best.name + ' · ' + LoL.roleName(best.role),
        color: U.token('--series-6')
      })]),
      VH.col(3, [VH.tile({
        label: 'Biggest riser', value: U.signed(climber.d, function (v) { return U.dec(v, 1); }), unit: ' pp',
        foot: climber.name + ' · now ' + U.dec(climber.wr, 1) + '%',
        color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Most banned', value: U.dec(mostBanned.br, 1), unit: '%',
        foot: mostBanned.name + ' · wins ' + U.dec(mostBanned.wr, 1) + '%',
        color: U.token('--series-8')
      })]),
      VH.col(3, [VH.tile({
        label: 'Sample size', value: U.compact(games), unit: ' games',
        foot: champs.length + ' champions analysed', color: U.token('--series-1')
      })])
    ]));

    /* --- The written read ---------------------------------------------------- */

    frag.appendChild(VH.section('Patch ' + patch.version + ' analysis', 'what the numbers are actually saying'));
    frag.appendChild(VH.grid([
      VH.col(8, [analysisCard()]),
      VH.col(4, [watchlistCard(), caveatsCard()])
    ]));

    /* --- Patch history ------------------------------------------------------- */

    frag.appendChild(VH.section('Recent patches', 'what changed in the last six updates'));
    frag.appendChild(VH.grid([
      VH.col(7, [patchCard()]),
      VH.col(5, [patchImpactCard(patch)])
    ]));

    /* --- Highest win rates --------------------------------------------------- */

    frag.appendChild(VH.section(
      'Highest win rates',
      role === 'ALL' ? 'all roles' : LoL.roleName(role) + ' · Emerald+'
    ));

    frag.appendChild(VH.grid([
      VH.col(7, [winrateCard(champs)]),
      VH.col(5, [moversCard(champs)])
    ]));

    /* --- Win rate vs pick rate ----------------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(12, [scatterCard(champs)])
    ]));

    /* --- Full table ---------------------------------------------------------- */

    frag.appendChild(VH.section('Full table', 'sortable on any column'));
    frag.appendChild(VH.grid([VH.col(12, [champTable(champs, state)])]));

    /* --- Meta movement ------------------------------------------------------- */

    frag.appendChild(VH.section('Meta movement', 'the three biggest risers across six patches'));
    frag.appendChild(VH.grid([VH.col(12, [trendCard(champs)])]));

    frag.appendChild(el('div', { style: { marginTop: '16px' } }, [
      VH.note('Demo data.',
        'The patch notes and win rates here are illustrative so the site runs offline. ' +
        'The Settings tab explains how to point this at a real Riot or U.GG source.')
    ]));

    return frag;
  }

  /* --- The analysis article -------------------------------------------------- */

  function analysisCard() {
    var A = LoL.ANALYSIS;
    var body = el('div', { class: 'card__body' });

    body.appendChild(el('p', { class: 'article__kicker' }, [
      document.createTextNode(A.kicker),
      el('span', { class: 'article__kicker-sep', text: '·' }),
      el('span', { class: 'article__kicker-patch', text: 'Patch ' + A.patch })
    ]));
    body.appendChild(el('h2', { class: 'article__headline', text: A.headline }));
    body.appendChild(el('p', { class: 'article__standfirst', text: A.standfirst }));
    body.appendChild(el('p', { class: 'article__byline',
      text: 'Method: win rate vs pick rate, ban-rate lag, one-trick selection bias, ' +
            'and reading the patch arc rather than a single patch.' }));

    A.takes.forEach(function (t, i) {
      body.appendChild(el('section', { class: 'take' }, [
        el('div', { class: 'take__head' }, [
          el('span', { class: 'take__num', text: String(i + 1) }),
          el('h3', { class: 'take__title', text: t.title })
        ]),
        el('p', { class: 'take__body', text: t.body }),
        el('p', { class: 'take__evidence' }, [
          el('span', { class: 'take__evidence-label', text: 'In the data' }),
          document.createTextNode(t.evidence)
        ])
      ]));
    });

    /* No card header: the kicker and headline are this card's header. */
    return el('div', { class: 'card card--article' }, [body]);
  }

  var VERDICT_CLASS = {
    'Buy': 'good', 'Buy now': 'good', 'Sell': 'bad',
    'Careful': 'warn', 'Stop banning': 'warn'
  };

  function watchlistCard() {
    var list = el('div', { class: 'list' });
    LoL.ANALYSIS.watchlist.forEach(function (w) {
      var champ = LoL.byName(w.name);
      list.appendChild(el('div', { class: 'list__row' }, [
        el('div', { class: 'list__main' }, [
          champ ? VH.champCell(champ, U.dec(champ.wr, 1) + '% win · ' + U.dec(champ.pr, 1) + '% pick')
                : el('div', { class: 'list__title', text: w.name }),
          el('p', { class: 'list__meta', style: { marginTop: '6px' }, text: w.note })
        ]),
        el('span', { class: 'verdict verdict--' + (VERDICT_CLASS[w.verdict] || 'warn'), text: w.verdict })
      ]));
    });

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Watchlist' }),
          el('p', { class: 'card__sub', text: 'where the gap between perception and result is widest' })
        ])
      ]),
      el('div', { class: 'card__body' }, [list])
    ]);
  }

  function caveatsCard() {
    var ul = el('ul', { class: 'caveats' });
    LoL.ANALYSIS.caveats.forEach(function (c) {
      ul.appendChild(el('li', { text: c }));
    });
    return el('div', { class: 'card', style: { marginTop: '14px' } }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'What would make this wrong' }),
          el('p', { class: 'card__sub', text: 'the limits of the reading above' })
        ])
      ]),
      el('div', { class: 'card__body' }, [ul])
    ]);
  }

  /* --- Patch list ------------------------------------------------------------ */

  var TYPE_LABEL = { buff: 'Buffed', nerf: 'Nerfed', adjust: 'Adjusted', system: 'System' };
  /* A status colour never carries meaning alone — a glyph always rides along */
  var TYPE_GLYPH = { buff: '▲', nerf: '▼', adjust: '±', system: '⚙' };

  function patchCard() {
    var box = el('div', { class: 'list' });

    LoL.PATCHES.forEach(function (p, idx) {
      var open = idx === 0;                       /* the current patch starts open */
      var details = el('div', {}, [
        el('p', { class: 'patch__note', text: p.summary }),
        changeChips(p)
      ]);
      details.hidden = !open;

      var toggle = el('button', {
        class: 'link-btn', type: 'button', 'aria-expanded': String(open),
        text: open ? 'Collapse' : p.changes.length + ' changes'
      });

      var row = el('div', { class: 'patch' }, [
        el('div', { class: 'patch__head' }, [
          el('span', { class: 'patch__ver', text: p.version }),
          el('span', { class: 'patch__date', text: U.fullDate(p.date) + ' · ' + U.relativeDays(p.date) }),
          p.current ? el('span', { class: 'patch__tag', text: 'Current' }) : null
        ]),
        el('div', { style: { display: 'flex', alignItems: 'baseline', gap: '12px' } }, [
          el('p', { class: 'card__title', style: { flex: '1' }, text: p.title }),
          toggle
        ]),
        details
      ]);

      toggle.addEventListener('click', function () {
        open = !open;
        details.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Collapse' : p.changes.length + ' changes';
      });

      box.appendChild(row);
    });

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Patch history' }),
          el('p', { class: 'card__sub', text: 'hover a champion to see the exact change' })
        ]),
        el('div', { class: 'card__tools' }, [
          el('span', { class: 'chip chip--buff', text: TYPE_GLYPH.buff + ' buff' }),
          el('span', { class: 'chip chip--nerf', text: TYPE_GLYPH.nerf + ' nerf' }),
          el('span', { class: 'chip chip--adjust', text: TYPE_GLYPH.adjust + ' adjust' })
        ])
      ]),
      el('div', { class: 'card__body' }, [box])
    ]);
  }

  function changeChips(p) {
    var chips = el('div', { class: 'patch__changes' });
    p.changes.forEach(function (c) {
      chips.appendChild(el('span', {
        class: 'chip chip--' + c.type,
        title: TYPE_LABEL[c.type] + ': ' + c.note,
        text: TYPE_GLYPH[c.type] + ' ' + c.champ
      }));
    });
    return chips;
  }

  /* --- Patch impact ---------------------------------------------------------- */

  function patchImpactCard(patch) {
    var counts = { buff: 0, nerf: 0, adjust: 0, system: 0 };
    patch.changes.forEach(function (c) { counts[c.type]++; });
    var slices = [
      { name: 'Buffs', value: counts.buff, color: U.seriesColor(2) },
      { name: 'Nerfs', value: counts.nerf, color: U.seriesColor(7) },
      { name: 'Adjustments', value: counts.adjust, color: U.seriesColor(3) },
      { name: 'System changes', value: counts.system, color: U.seriesColor(6) }
    ].filter(function (s) { return s.value > 0; });

    return Chart.card({
      title: 'Patch ' + patch.version,
      sub: patch.changes.length + ' changes · ' + U.fullDate(patch.date),
      legendAfter: Chart.legend(slices.map(function (s) {
        return { name: s.name, color: s.color, note: String(s.value) };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 180, slices: slices, valueName: 'Changes',
          centerValue: String(patch.changes.length), centerLabel: 'changes'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Type' }, { label: 'Target' }, { label: 'Change' }],
          patch.changes.map(function (c) { return [TYPE_LABEL[c.type], c.champ, c.note]; })
        );
      }
    });
  }

  /* --- Win rate as a deviation from 50% -------------------------------------- */

  function winrateCard(champs) {
    var top = champs.slice().sort(function (a, b) { return b.wr - a.wr; }).slice(0, 10);
    return Chart.card({
      title: 'Top 10 by win rate',
      sub: 'shown as deviation from 50% — a real zero baseline, not a truncated axis',
      legendAfter: Chart.legend([
        { name: 'Above 50%', color: U.token('--series-1') },
        { name: 'Below 50%', color: U.token('--series-8') }
      ]),
      render: function (w) {
        return Chart.divergingBarsH(w, {
          rows: top.map(function (c) {
            return {
              label: c.name,
              value: Math.round((c.wr - 50) * 100) / 100,
              wr: c.wr, champ: c,
              note: 'pick ' + U.dec(c.pr, 1) + '% · ban ' + U.dec(c.br, 1) + '% · ' + U.compact(c.games) + ' games'
            };
          }),
          baseline: 50,
          baselineLabel: '50%',
          zeroAt: 0.22,
          rowHeight: 34, labelWidth: 112, valueWidth: 66,
          format: function (v) { return U.signed(v, function (x) { return U.dec(x, 1); }) + ' pp'; },
          absoluteFormat: function (r) { return U.dec(r.wr, 1) + '%'; },
          tipRows: function (r) {
            return [
              { name: 'Win rate', value: U.dec(r.wr, 1) + '%',
                color: U.token(r.value >= 0 ? '--series-1' : '--series-8') },
              { name: 'Deviation', value: U.signed(r.value, function (x) { return U.dec(x, 1); }) + ' pp' },
              { name: 'Role', value: LoL.roleName(r.champ.role) }
            ];
          }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Champion' }, { label: 'Role' }, { label: 'Win rate', num: true },
           { label: 'Deviation from 50%', num: true }, { label: 'Pick rate', num: true },
           { label: 'Games', num: true }],
          top.map(function (c) {
            return [c.name, LoL.roleName(c.role), U.dec(c.wr, 1) + '%',
                    U.signed(c.wr - 50, function (x) { return U.dec(x, 1); }) + ' pp',
                    U.dec(c.pr, 1) + '%', U.num(c.games)];
          })
        );
      }
    });
  }

  /* --- Risers and fallers ----------------------------------------------------- */

  function moversCard(champs) {
    var sorted = champs.slice().sort(function (a, b) { return b.d - a.d; });
    var up = sorted.slice(0, 5);
    var down = sorted.slice(-5).reverse();

    function rows(list) {
      var box = el('div', { class: 'list' });
      list.forEach(function (c) {
        box.appendChild(el('div', { class: 'list__row' }, [
          el('div', { class: 'list__main' }, [
            VH.champCell(c, U.dec(c.wr, 1) + '% win rate · ' + LoL.roleName(c.role))
          ]),
          el('div', { class: 'list__val' }, [U.deltaEl(c.d, true, 'pp')])
        ]));
      });
      return box;
    }

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Risers and fallers' }),
          el('p', { class: 'card__sub', text: 'win-rate change since the previous patch' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        el('p', { class: 'card__sub', style: { marginBottom: '4px' }, text: 'Rising' }),
        rows(up),
        el('p', { class: 'card__sub', style: { margin: '16px 0 4px' }, text: 'Falling' }),
        rows(down)
      ])
    ]);
  }

  /* --- Scatter ----------------------------------------------------------------- */

  function scatterCard(champs) {
    var labelTop = champs.slice().sort(function (a, b) { return b.wr - a.wr; }).slice(0, 3)
      .map(function (c) { return c.name; });

    return Chart.card({
      title: 'Win rate vs pick rate',
      sub: 'top right — strong and popular; top left — the picks nobody has caught up to yet',
      render: function (w) {
        return Chart.scatter(w, {
          points: champs.map(function (c) {
            return { x: c.pr, y: c.wr, r: 5, label: c.name, champ: c };
          }),
          height: 320,
          color: U.token('--series-1'),
          xLabel: 'Pick rate, %',
          yLabel: 'Win rate, %',
          xFormat: function (v) { return U.dec(v, 0) + '%'; },
          yFormat: function (v) { return U.dec(v, 1) + '%'; },
          refY: 50, refLabel: '50% — even',
          labelTop: labelTop,
          tipRows: function (p) {
            return [
              { name: 'Win rate', value: U.dec(p.champ.wr, 1) + '%', color: U.token('--series-1') },
              { name: 'Pick rate', value: U.dec(p.champ.pr, 1) + '%' },
              { name: 'Ban rate', value: U.dec(p.champ.br, 1) + '%' },
              { name: 'Role', value: LoL.roleName(p.champ.role) }
            ];
          }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Champion' }, { label: 'Role' }, { label: 'Win rate', num: true },
           { label: 'Pick rate', num: true }, { label: 'Ban rate', num: true }],
          champs.slice().sort(function (a, b) { return b.wr - a.wr; }).map(function (c) {
            return [c.name, LoL.roleName(c.role), U.dec(c.wr, 1) + '%',
                    U.dec(c.pr, 1) + '%', U.dec(c.br, 1) + '%'];
          })
        );
      }
    });
  }

  /* --- Full table --------------------------------------------------------------- */

  function champTable(champs, state) {
    var COLS = [
      { key: 'name', label: 'Champion' },
      { key: 'role', label: 'Role' },
      { key: 'tier', label: 'Tier' },
      { key: 'wr', label: 'Win rate', num: true },
      { key: 'pr', label: 'Pick rate', num: true },
      { key: 'br', label: 'Ban rate', num: true },
      { key: 'd', label: 'Change', num: true },
      { key: 'games', label: 'Games', num: true }
    ];
    var TIER_ORDER = { S: 4, A: 3, B: 2, C: 1 };
    var PAGE = 25;                                /* a button opens the long tail */

    var wrapper = el('div', { class: 'table-wrap' });

    var search = el('label', { class: 'search' }, [
      el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
        el('circle', { cx: '11', cy: '11', r: '7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
        el('path', { d: 'M20 20l-4-4', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' })
      ]),
      el('input', {
        class: 'input', type: 'search', placeholder: 'Search champions…', value: state.lolQuery || '',
        'aria-label': 'Search champions',
        oninput: function (e) { state.lolQuery = e.target.value; state.lolShowAll = false; draw(); }
      })
    ]);

    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Champion table' }),
          el('p', { class: 'card__sub', text: 'Emerald+ · patch ' + LoL.current.version })
        ]),
        el('div', { class: 'card__tools' }, [search])
      ]),
      el('div', { class: 'card__body' }, [wrapper])
    ]);

    function draw() {
      var q = (state.lolQuery || '').trim().toLowerCase();
      var rows = champs.filter(function (c) {
        return !q || c.name.toLowerCase().indexOf(q) !== -1 || LoL.roleName(c.role).toLowerCase().indexOf(q) !== -1;
      });
      rows.sort(function (a, b) {
        var k = sortState.key;
        var av = k === 'tier' ? TIER_ORDER[a.tier] : a[k];
        var bv = k === 'tier' ? TIER_ORDER[b.tier] : b[k];
        if (typeof av === 'string') return av.localeCompare(bv, 'en') * sortState.dir * -1;
        return (av - bv) * sortState.dir;
      });

      var thead = el('thead', {}, [el('tr', {}, COLS.map(function (c) {
        return el('th', {
          class: 'sortable' + (c.num ? ' num' : ''), scope: 'col', text: c.label,
          'aria-sort': sortState.key === c.key ? (sortState.dir === 1 ? 'ascending' : 'descending') : 'none',
          onclick: function () {
            if (sortState.key === c.key) sortState.dir *= -1;
            else { sortState.key = c.key; sortState.dir = -1; }
            draw();
          }
        });
      }))]);

      var shown = state.lolShowAll ? rows : rows.slice(0, PAGE);
      var tbody = el('tbody', {}, shown.map(function (c) {
        return el('tr', {}, [
          el('td', { class: 'name' }, [VH.champCell(c, false)]),
          el('td', { text: LoL.roleName(c.role) }),
          el('td', {}, [el('span', { class: 'tier tier--' + c.tier, title: LoL.TIER_LABEL[c.tier], text: c.tier })]),
          el('td', { class: 'num', text: U.dec(c.wr, 1) + '%' }),
          el('td', { class: 'num', text: U.dec(c.pr, 1) + '%' }),
          el('td', { class: 'num', text: U.dec(c.br, 1) + '%' }),
          el('td', { class: 'num' }, [U.deltaEl(c.d, true, 'pp')]),
          el('td', { class: 'num', text: U.num(c.games) })
        ]);
      }));

      U.clear(wrapper);
      if (!rows.length) {
        wrapper.appendChild(el('p', { class: 'empty', text: 'Nothing matches “' + q + '”.' }));
        return;
      }
      wrapper.appendChild(el('table', { class: 'tbl' }, [thead, tbody]));
      if (rows.length > PAGE && !state.lolShowAll) {
        wrapper.appendChild(el('div', { style: { padding: '12px 0 0', textAlign: 'center' } }, [
          el('button', {
            class: 'btn', type: 'button',
            text: 'Show all ' + rows.length,
            onclick: function () { state.lolShowAll = true; draw(); }
          })
        ]));
      }
    }
    draw();
    return card;
  }

  /* --- Meta movement across patches --------------------------------------------- */

  function trendCard(champs) {
    /* Three series only — the all-pairs colour cap applies to multi-line forms */
    var picks = champs.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, 3);
    var labels = LoL.PATCHES.slice().reverse().map(function (p) { return p.version; });
    var series = picks.map(function (c, i) {
      return { name: c.name, color: U.seriesColor(i), values: LoL.history(c) };
    });

    return Chart.card({
      title: 'Win rate across patches',
      sub: 'the axis is zoomed near 50% — direction is the point here, not distance from zero',
      legendBefore: Chart.legend(series, 'line'),
      render: function (w) {
        return Chart.lineChart(w, {
          labels: labels, height: 280, peakLabel: false, zoomY: true,
          format: function (v) { return U.dec(v, 1) + '%'; },
          yFormat: function (v) { return U.dec(v, 0) + '%'; },
          series: series,
          tipTitle: function (i) { return 'Patch ' + labels[i]; }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Patch' }].concat(series.map(function (s) { return { label: s.name, num: true }; })),
          labels.map(function (l, i) {
            return [l].concat(series.map(function (s) { return U.dec(s.values[i], 1) + '%'; }));
          })
        );
      }
    });
  }

  return {
    title: 'League of Legends',
    sub: 'patches and the Emerald+ meta · demo dataset',
    needsRange: false,
    render: render
  };
})();
