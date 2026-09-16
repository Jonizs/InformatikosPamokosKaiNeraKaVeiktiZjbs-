/* =============================================================================
   views/lol.js — 2 skirtukas: LoL pataisos ir Emerald+ meta
   ========================================================================== */
Views.lol = (function () {
  'use strict';

  var el = U.el;
  var sortState = { key: 'wr', dir: -1 };

  function render(state) {
    var role = state.lolRole || 'ALL';
    var champs = LoL.byRole(role);
    var sum = LoL.summary();
    var patch = LoL.current;
    var frag = document.createDocumentFragment();

    /* --- Filtrų eilutė: viena, virš viso turinio ---------------------------- */

    frag.appendChild(el('div', { class: 'grid', style: { marginBottom: '2px' } }, [
      el('div', { class: 'col-12' }, [
        el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, [
          VH.segmented(
            [{ value: 'ALL', label: 'Visos' }].concat(LoL.ROLES.map(function (r) {
              return { value: r.id, label: r.name };
            })),
            role,
            function (v) { state.lolRole = v; App.rerender(); },
            'Pozicija'
          ),
          el('span', { class: 'chip', text: 'Emerald+ · ranguotos solo/duo' }),
          el('span', { class: 'chip', text: 'Pataisa ' + patch.version })
        ])
      ])
    ]));

    /* --- Plytelės ----------------------------------------------------------- */

    var best = champs.slice().sort(function (a, b) { return b.wr - a.wr; })[0];
    var mostBanned = champs.slice().sort(function (a, b) { return b.br - a.br; })[0];
    var climber = champs.slice().sort(function (a, b) { return b.d - a.d; })[0];
    var games = U.sum(champs, function (c) { return c.games; });

    frag.appendChild(VH.grid([
      VH.col(3, [VH.tile({
        label: 'Aukščiausias winrate', value: U.dec(best.wr, 1), unit: ' %',
        delta: best.d, foot: best.name + ' · ' + LoL.roleName(best.role),
        color: U.token('--series-6')
      })]),
      VH.col(3, [VH.tile({
        label: 'Labiausiai pakilęs', value: U.signed(climber.d, function (v) { return U.dec(v, 1); }), unit: ' p.p.',
        foot: climber.name + ' · dabar ' + U.dec(climber.wr, 1) + ' %',
        color: U.token('--series-3')
      })]),
      VH.col(3, [VH.tile({
        label: 'Dažniausiai banintas', value: U.dec(mostBanned.br, 1), unit: ' %',
        foot: mostBanned.name, color: U.token('--series-8')
      })]),
      VH.col(3, [VH.tile({
        label: 'Žaidimų imtis', value: U.compact(games),
        foot: champs.length + ' čempionai analizėje', color: U.token('--series-1')
      })])
    ]));

    /* --- Naujausia pataisa --------------------------------------------------- */

    frag.appendChild(VH.section('Naujos pataisos', 'kas pasikeitė paskutiniuose atnaujinimuose'));
    frag.appendChild(VH.grid([
      VH.col(7, [patchCard()]),
      VH.col(5, [patchImpactCard(patch)])
    ]));

    /* --- Didžiausias winrate ------------------------------------------------- */

    frag.appendChild(VH.section(
      'Didžiausio winrate čempionai',
      role === 'ALL' ? 'visos pozicijos' : LoL.roleName(role) + ' · Emerald+'
    ));

    frag.appendChild(VH.grid([
      VH.col(7, [winrateCard(champs, role)]),
      VH.col(5, [moversCard(champs)])
    ]));

    /* --- Sklaida: winrate vs pickrate ---------------------------------------- */

    frag.appendChild(VH.grid([
      VH.col(12, [scatterCard(champs, role)])
    ]));

    /* --- Pilna lentelė -------------------------------------------------------- */

    frag.appendChild(VH.section('Pilna lentelė', 'rikiuojama pagal bet kurį stulpelį'));
    frag.appendChild(VH.grid([VH.col(12, [champTable(champs, state)])]));

    /* --- Meta judėjimas per pataisas ------------------------------------------ */

    frag.appendChild(VH.section('Meta judėjimas', 'trijų didžiausių kilėjų winrate per 6 pataisas'));
    frag.appendChild(VH.grid([VH.col(12, [trendCard(champs)])]));

    frag.appendChild(el('div', { style: { marginTop: '16px' } }, [
      VH.note('Demo duomenys.',
        'Pataisų turinys ir winrate skaičiai čia yra pavyzdiniai — svetainė veikia be interneto. ' +
        'Kaip prijungti realų Riot ar U.GG šaltinį, aprašyta „Nustatymų" skirtuke.')
    ]));

    return frag;
  }

  /* --- Pataisų sąrašas ------------------------------------------------------- */

  var TYPE_LABEL = { buff: 'Sustiprintas', nerf: 'Susilpnintas', adjust: 'Perbalansuotas', system: 'Sistema' };
  /* Būsenos spalva niekada nenešioja reikšmės viena — šalia visada ženklas */
  var TYPE_GLYPH = { buff: '▲', nerf: '▼', adjust: '±', system: '⚙' };

  function patchCard() {
    var box = el('div', { class: 'list' });

    LoL.PATCHES.forEach(function (p, idx) {
      var open = idx === 0;                       /* dabartinė — atverta */
      var details = el('div', {}, [
        el('p', { class: 'patch__note', text: p.summary }),
        changeChips(p)
      ]);
      details.hidden = !open;

      var toggle = el('button', {
        class: 'link-btn', type: 'button', 'aria-expanded': String(open),
        text: open ? 'Suskleisti' : p.changes.length + ' pakeitimai'
      });

      var head = el('div', { class: 'patch__head' }, [
        el('span', { class: 'patch__ver', text: p.version }),
        el('span', { class: 'patch__date', text: U.fullDate(p.date) + ' · ' + U.relativeDays(p.date) }),
        p.current ? el('span', { class: 'patch__tag', text: 'Dabartinė' }) : null
      ]);

      var row = el('div', { class: 'patch' }, [
        head,
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
        toggle.textContent = open ? 'Suskleisti' : p.changes.length + ' pakeitimai';
      });

      box.appendChild(row);
    });

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Pataisų istorija' }),
          el('p', { class: 'card__sub', text: 'užvesk pelę ant čempiono — pamatysi tikslų pakeitimą' })
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

  /* --- Pataisos poveikis ------------------------------------------------------ */

  function patchImpactCard(patch) {
    var counts = { buff: 0, nerf: 0, adjust: 0, system: 0 };
    patch.changes.forEach(function (c) { counts[c.type]++; });
    var slices = [
      { name: 'Sustiprinimai', value: counts.buff, color: U.seriesColor(2) },
      { name: 'Susilpninimai', value: counts.nerf, color: U.seriesColor(7) },
      { name: 'Perbalansavimai', value: counts.adjust, color: U.seriesColor(3) },
      { name: 'Sistemos pokyčiai', value: counts.system, color: U.seriesColor(6) }
    ].filter(function (s) { return s.value > 0; });

    var changed = patch.changes.map(function (c) { return c.champ; });

    return Chart.card({
      title: 'Pataisa ' + patch.version,
      sub: patch.changes.length + ' pakeitimai · ' + U.fullDate(patch.date),
      legendAfter: Chart.legend(slices.map(function (s) {
        return { name: s.name, color: s.color, note: String(s.value) };
      })),
      render: function (w) {
        return Chart.donut(w, {
          size: 180, slices: slices, valueName: 'Pakeitimai',
          centerValue: String(patch.changes.length), centerLabel: 'pakeitimai'
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Tipas' }, { label: 'Taikinys' }, { label: 'Pakeitimas' }],
          patch.changes.map(function (c) { return [TYPE_LABEL[c.type], c.champ, c.note]; })
        );
      }
    });
  }

  /* --- Winrate stulpeliai ------------------------------------------------------ */

  function winrateCard(champs, role) {
    var top = champs.slice().sort(function (a, b) { return b.wr - a.wr; }).slice(0, 10);
    return Chart.card({
      title: 'Top 10 pagal winrate',
      sub: 'nuokrypis nuo 50 % — bazinė linija yra tikra nulinė reikšmė, ne nukirpta ašis',
      legendAfter: Chart.legend([
        { name: 'Virš 50 %', color: U.token('--series-1') },
        { name: 'Žemiau 50 %', color: U.token('--series-8') }
      ]),
      render: function (w) {
        return Chart.divergingBarsH(w, {
          rows: top.map(function (c) {
            return {
              label: c.name,
              value: Math.round((c.wr - 50) * 100) / 100,
              wr: c.wr, champ: c,
              note: 'pick ' + U.dec(c.pr, 1) + ' % · ban ' + U.dec(c.br, 1) + ' % · ' + U.compact(c.games) + ' žaidimų'
            };
          }),
          baseline: 50,
          baselineLabel: '50 %',
          zeroAt: 0.22,
          rowHeight: 34, labelWidth: 112, valueWidth: 66,
          format: function (v) { return U.signed(v, function (x) { return U.dec(x, 1); }) + ' p.p.'; },
          absoluteFormat: function (r) { return U.dec(r.wr, 1) + ' %'; },
          tipRows: function (r) {
            return [
              { name: 'Winrate', value: U.dec(r.wr, 1) + ' %',
                color: U.token(r.value >= 0 ? '--series-1' : '--series-8') },
              { name: 'Nuokrypis', value: U.signed(r.value, function (x) { return U.dec(x, 1); }) + ' p.p.' },
              { name: 'Pozicija', value: LoL.roleName(r.champ.role) }
            ];
          }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Čempionas' }, { label: 'Pozicija' }, { label: 'Winrate', num: true },
           { label: 'Nuokrypis nuo 50 %', num: true }, { label: 'Pickrate', num: true },
           { label: 'Žaidimai', num: true }],
          top.map(function (c) {
            return [c.name, LoL.roleName(c.role), U.dec(c.wr, 1) + ' %',
                    U.signed(c.wr - 50, function (x) { return U.dec(x, 1); }) + ' p.p.',
                    U.dec(c.pr, 1) + ' %', U.num(c.games)];
          })
        );
      }
    });
  }

  /* --- Kilėjai ir kritėjai ------------------------------------------------------ */

  function moversCard(champs) {
    var sorted = champs.slice().sort(function (a, b) { return b.d - a.d; });
    var up = sorted.slice(0, 5);
    var down = sorted.slice(-5).reverse();

    function rows(list) {
      var box = el('div', { class: 'list' });
      list.forEach(function (c) {
        box.appendChild(el('div', { class: 'list__row' }, [
          el('div', { class: 'list__main' }, [
            VH.champCell(c, U.dec(c.wr, 1) + ' % winrate · ' + LoL.roleName(c.role))
          ]),
          el('div', { class: 'list__val' }, [U.deltaEl(c.d, true, 'p.p.')])
        ]));
      });
      return box;
    }

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Kilėjai ir kritėjai' }),
          el('p', { class: 'card__sub', text: 'winrate pokytis nuo praėjusios pataisos' })
        ])
      ]),
      el('div', { class: 'card__body' }, [
        el('p', { class: 'card__sub', style: { marginBottom: '4px' }, text: 'Kyla' }),
        rows(up),
        el('p', { class: 'card__sub', style: { margin: '16px 0 4px' }, text: 'Krenta' }),
        rows(down)
      ])
    ]);
  }

  /* --- Sklaida ------------------------------------------------------------------ */

  function scatterCard(champs, role) {
    var labelTop = champs.slice().sort(function (a, b) { return b.wr - a.wr; }).slice(0, 3)
      .map(function (c) { return c.name; });

    return Chart.card({
      title: 'Winrate prieš pickrate',
      sub: 'viršuje dešinėje — stiprūs ir populiarūs; viršuje kairėje — nišiniai perliukai',
      render: function (w) {
        return Chart.scatter(w, {
          points: champs.map(function (c) {
            return { x: c.pr, y: c.wr, r: 5, label: c.name, champ: c };
          }),
          height: 320,
          color: U.token('--series-1'),
          xLabel: 'Pickrate, %',
          yLabel: 'Winrate, %',
          xFormat: function (v) { return U.dec(v, 0) + ' %'; },
          yFormat: function (v) { return U.dec(v, 1) + ' %'; },
          refY: 50, refLabel: '50 % — pusiausvyra',
          labelTop: labelTop,
          tipRows: function (p) {
            return [
              { name: 'Winrate', value: U.dec(p.champ.wr, 1) + ' %', color: U.token('--series-1') },
              { name: 'Pickrate', value: U.dec(p.champ.pr, 1) + ' %' },
              { name: 'Banrate', value: U.dec(p.champ.br, 1) + ' %' },
              { name: 'Pozicija', value: LoL.roleName(p.champ.role) }
            ];
          }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Čempionas' }, { label: 'Pozicija' }, { label: 'Winrate', num: true },
           { label: 'Pickrate', num: true }, { label: 'Banrate', num: true }],
          champs.slice().sort(function (a, b) { return b.wr - a.wr; }).map(function (c) {
            return [c.name, LoL.roleName(c.role), U.dec(c.wr, 1) + ' %',
                    U.dec(c.pr, 1) + ' %', U.dec(c.br, 1) + ' %'];
          })
        );
      }
    });
  }

  /* --- Pilna lentelė ------------------------------------------------------------ */

  function champTable(champs, state) {
    var COLS = [
      { key: 'name', label: 'Čempionas' },
      { key: 'role', label: 'Pozicija' },
      { key: 'tier', label: 'Pakopa' },
      { key: 'wr', label: 'Winrate', num: true },
      { key: 'pr', label: 'Pickrate', num: true },
      { key: 'br', label: 'Banrate', num: true },
      { key: 'd', label: 'Pokytis', num: true },
      { key: 'games', label: 'Žaidimai', num: true }
    ];
    var TIER_ORDER = { S: 4, A: 3, B: 2, C: 1 };
    var PAGE = 25;                                /* ilgą sąrašą atveria mygtukas */

    var wrapper = el('div', { class: 'table-wrap' });
    var query = state.lolQuery || '';

    var search = el('label', { class: 'search' }, [
      el('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
        el('circle', { cx: '11', cy: '11', r: '7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }),
        el('path', { d: 'M20 20l-4-4', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' })
      ]),
      el('input', {
        class: 'input', type: 'search', placeholder: 'Ieškoti čempiono…', value: query,
        'aria-label': 'Ieškoti čempiono',
        oninput: function (e) { state.lolQuery = e.target.value; state.lolShowAll = false; draw(); }
      })
    ]);

    var card = el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', { class: 'card__titles' }, [
          el('h3', { class: 'card__title', text: 'Čempionų lentelė' }),
          el('p', { class: 'card__sub', text: 'Emerald+ · pataisa ' + LoL.current.version })
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
        if (typeof av === 'string') return av.localeCompare(bv, 'lt') * sortState.dir * -1;
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
          el('td', { class: 'num', text: U.dec(c.wr, 1) + ' %' }),
          el('td', { class: 'num', text: U.dec(c.pr, 1) + ' %' }),
          el('td', { class: 'num', text: U.dec(c.br, 1) + ' %' }),
          el('td', { class: 'num' }, [U.deltaEl(c.d, true, 'p.p.')]),
          el('td', { class: 'num', text: U.num(c.games) })
        ]);
      }));

      U.clear(wrapper);
      if (!rows.length) {
        wrapper.appendChild(el('p', { class: 'empty', text: 'Nieko nerasta pagal „' + q + '".' }));
        return;
      }
      wrapper.appendChild(el('table', { class: 'tbl' }, [thead, tbody]));
      if (rows.length > PAGE && !state.lolShowAll) {
        wrapper.appendChild(el('div', { style: { padding: '12px 0 0', textAlign: 'center' } }, [
          el('button', {
            class: 'btn', type: 'button',
            text: 'Rodyti visus (' + rows.length + ')',
            onclick: function () { state.lolShowAll = true; draw(); }
          })
        ]));
      }
    }
    draw();
    return card;
  }

  /* --- Meta judėjimas per pataisas ---------------------------------------------- */

  function trendCard(champs) {
    /* Tik trys serijos — sklaidos/daugiaserijinėms formoms galioja 3 spalvų riba */
    var picks = champs.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, 3);
    var labels = LoL.PATCHES.slice().reverse().map(function (p) { return p.version; });
    var series = picks.map(function (c, i) {
      return { name: c.name, color: U.seriesColor(i), values: LoL.history(c) };
    });

    return Chart.card({
      title: 'Winrate per pataisas',
      sub: 'ašis priartinta prie 50 % — svarbi kryptis, ne atstumas iki nulio',
      legendBefore: Chart.legend(series, 'line'),
      render: function (w) {
        return Chart.lineChart(w, {
          labels: labels, height: 280, peakLabel: false, zoomY: true,
          format: function (v) { return U.dec(v, 1) + ' %'; },
          yFormat: function (v) { return U.dec(v, 0) + ' %'; },
          series: series,
          tipTitle: function (i) { return 'Pataisa ' + labels[i]; }
        });
      },
      table: function () {
        return Chart.table(
          [{ label: 'Pataisa' }].concat(series.map(function (s) { return { label: s.name, num: true }; })),
          labels.map(function (l, i) {
            return [l].concat(series.map(function (s) { return U.dec(s.values[i], 1) + ' %'; }));
          })
        );
      }
    });
  }

  return {
    title: 'League of Legends',
    sub: 'pataisos ir Emerald+ meta',
    needsRange: false,
    render: render
  };
})();
