/* =============================================================================
   views/settings.js — tab 6: settings and data sources
   ========================================================================== */
Views.settings = (function () {
  'use strict';

  var el = U.el;

  function render(state) {
    var frag = document.createDocumentFragment();

    frag.appendChild(VH.grid([
      VH.col(6, [appearanceCard(state)]),
      VH.col(6, [ratesCard()])
    ]));

    frag.appendChild(VH.section('Data sources', 'how to swap the demo data for the real thing'));
    frag.appendChild(VH.grid([
      VH.col(6, [claudeSourceCard()]),
      VH.col(6, [lolSourceCard()])
    ]));

    frag.appendChild(VH.section('Data', 'export and reset'));
    frag.appendChild(VH.grid([
      VH.col(12, [exportCard(state)])
    ]));

    return frag;
  }

  /* --- Appearance ----------------------------------------------------------- */

  function appearanceCard(state) {
    var body = el('div', { class: 'card__body' });

    body.appendChild(setting(
      'Dark mode',
      'The default. The light palette is built and validated against the same contrast requirements.',
      toggle(document.documentElement.dataset.theme !== 'light', function (on) {
        App.setTheme(on ? 'dark' : 'light');
      })
    ));

    body.appendChild(setting(
      'Default time range',
      'Which range the Claude tabs open on.',
      VH.segmented(App.RANGES.map(function (r) { return { value: r.value, label: r.short }; }),
        U.store.get('defaultRange', 30),
        function (v) { U.store.set('defaultRange', v); state.range = v; App.rerender(); },
        'Default time range')
    ));

    body.appendChild(setting(
      'Starting tab',
      'Which view opens when the site loads.',
      select(
        [{ value: 'overview', label: 'Overview' }, { value: 'lol', label: 'League of Legends' },
         { value: 'projects', label: 'Projects' }, { value: 'models', label: 'Models & cost' },
         { value: 'activity', label: 'Activity' }],
        U.store.get('startView', 'overview'),
        function (v) { U.store.set('startView', v); }
      )
    ));

    return el('div', { class: 'card' }, [
      head('Appearance', 'theme, time range and starting view'),
      body
    ]);
  }

  /* --- Rates ----------------------------------------------------------------- */

  function ratesCard() {
    var current = Data.rates();
    var draft = JSON.parse(JSON.stringify(current));
    var body = el('div', { class: 'card__body' });

    Data.MODELS.forEach(function (m) {
      var inInput = numInput(draft[m.id].in, function (v) { draft[m.id].in = v; });
      var outInput = numInput(draft[m.id].out, function (v) { draft[m.id].out = v; });
      body.appendChild(el('div', { class: 'setting' }, [
        el('div', { class: 'setting__main' }, [
          el('div', { class: 'setting__title' }, [
            el('span', { class: 'swatch', style: { background: U.seriesColor(m.slot) } }),
            document.createTextNode(m.name)
          ]),
          el('div', { class: 'setting__desc', text: '$ per 1M tokens — input and output' })
        ]),
        el('div', { class: 'setting__control', style: { display: 'flex', gap: '6px' } }, [inInput, outInput])
      ]));
    });

    body.appendChild(setting('Cache read multiplier', 'What a cache read costs relative to input.',
      numInput(draft.cacheReadFactor, function (v) { draft.cacheReadFactor = v; }, 0.01)));
    body.appendChild(setting('Cache write multiplier', 'What writing to the cache costs.',
      numInput(draft.cacheWriteFactor, function (v) { draft.cacheWriteFactor = v; }, 0.01)));

    body.appendChild(el('div', { style: { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' } }, [
      el('button', {
        class: 'btn btn--primary', type: 'button', text: 'Save rates',
        onclick: function () {
          U.store.set('rates', draft);
          App.toast('Rates saved — costs recomputed.');
          App.rerender();
        }
      }),
      el('button', {
        class: 'btn', type: 'button', text: 'Restore defaults',
        onclick: function () { U.store.remove('rates'); App.toast('Default rates restored.'); App.rerender(); }
      })
    ]));

    body.appendChild(el('div', { style: { marginTop: '14px' } }, [
      VH.note('This is an assumption, not an invoice.',
        'The dashboard has no access to your real pricing, so costs are computed from the values ' +
        'above. Enter your own plan rates and every figure updates.')
    ]));

    return el('div', { class: 'card' }, [head('Pricing rates', 'used for every cost calculation'), body]);
  }

  /* --- Claude source ---------------------------------------------------------- */

  function claudeSourceCard() {
    var code = [
      '// assets/js/data/claude-data.js — Data.load()',
      'Data.load(',
      '  fetch("/my-usage.json").then(r => r.json())',
      ').then(() => App.rerender());',
      '',
      '// Expects an array with one row per day:',
      '// {',
      '//   date: "2026-09-16",      // ISO date',
      '//   weekday: 2,              // 0 = Monday',
      '//   sessions: 4, messages: 58, toolCalls: 121,',
      '//   tokensIn: 120000, tokensOut: 36000,',
      '//   cacheRead: 410000, cacheWrite: 52000,',
      '//   tokensTotal: 618000,',
      '//   linesAdded: 430, linesRemoved: 180,',
      '//   modelSplit: { "opus-5": 0.4, "sonnet-5": 0.45, "haiku-45": 0.15 },',
      '//   projSplit:  { "skydas-dashboard": 0.7, "other": 0.3 }',
      '// }'
    ].join('\n');

    return el('div', { class: 'card' }, [
      head('Claude usage', 'wiring up real data'),
      el('div', { class: 'card__body' }, [
        el('p', { class: 'setting__desc', style: { marginBottom: '10px' },
          text: 'Every view reads the Data API and nothing else, so one function is the whole ' +
                'integration — no card needs rewriting.' }),
        codeBlock(code)
      ])
    ]);
  }

  function lolSourceCard() {
    var code = [
      '// assets/js/data/lol-data.js — LoL.load()',
      'LoL.load(',
      '  fetch("/lol.json").then(r => r.json())',
      ').then(() => App.rerender());',
      '',
      '// { patches: [...], champions: [...] }',
      '// a champions row:',
      '// {',
      '//   name: "Jinx", key: "Jinx",   // key = Data Dragon name',
      '//   role: "ADC",                 // TOP | JUNGLE | MID | ADC | SUPPORT',
      '//   wr: 52.7, pr: 15.4, br: 8.2,',
      '//   games: 92530, d: 1.8,        // d = win-rate change, pp',
      '//   tier: "S", icon: "https://…"',
      '// }',
      '',
      '// Portraits: Data Dragon ' + LoL.DDRAGON_VERSION,
      '// Real sources: the Riot API (key required), or public',
      '// meta aggregators (U.GG, OP.GG, LoLalytics).'
    ].join('\n');

    return el('div', { class: 'card' }, [
      head('League data', 'patches and champion statistics'),
      el('div', { class: 'card__body' }, [
        el('p', { class: 'setting__desc', style: { marginBottom: '10px' },
          text: 'Riot publishes no public win-rate endpoint — that statistic is computed by third ' +
                'parties, or you collect it yourself from match history.' }),
        codeBlock(code)
      ])
    ]);
  }

  /* --- Export ----------------------------------------------------------------- */

  function exportCard(state) {
    var body = el('div', { class: 'card__body' });

    body.appendChild(setting(
      'Download the current slice',
      'Saves the visible time range as CSV, ready for a spreadsheet.',
      el('button', {
        class: 'btn', type: 'button', text: 'CSV',
        onclick: function () { downloadCSV(state); }
      })
    ));

    body.appendChild(setting(
      'Download everything as JSON',
      'All days, including the model and project splits.',
      el('button', {
        class: 'btn', type: 'button', text: 'JSON',
        onclick: function () {
          download('dashboard-data.json', JSON.stringify(Data.all(), null, 2), 'application/json');
        }
      })
    ));

    body.appendChild(setting(
      'Clear saved settings',
      'Theme, time range, rates and starting tab all return to their defaults.',
      el('button', {
        class: 'btn', type: 'button', text: 'Clear',
        onclick: function () {
          ['rates', 'theme', 'defaultRange', 'startView'].forEach(U.store.remove);
          App.toast('Settings cleared.');
          App.setTheme('dark');
          App.rerender();
        }
      })
    ));

    return el('div', { class: 'card' }, [head('Data', 'export and reset'), body]);
  }

  function downloadCSV(state) {
    var slice = Data.range(state.range);
    var headRow = ['date', 'weekday', 'sessions', 'messages', 'tool_calls',
                   'input', 'output', 'cache_read', 'cache_write', 'tokens_total', 'cost_usd'];
    var lines = [headRow.join(',')];
    slice.forEach(function (d) {
      lines.push([d.date, U.WEEKDAYS_LONG[d.weekday], d.sessions, d.messages, d.toolCalls,
                  d.tokensIn, d.tokensOut, d.cacheRead, d.cacheWrite, d.tokensTotal,
                  Data.dayCost(d).toFixed(4)].join(','));
    });
    download('dashboard-' + state.range + 'd.csv', lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function download(name, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* --- Small parts ------------------------------------------------------------- */

  function head(title, sub) {
    return el('div', { class: 'card__head' }, [
      el('div', { class: 'card__titles' }, [
        el('h3', { class: 'card__title', text: title }),
        el('p', { class: 'card__sub', text: sub })
      ])
    ]);
  }

  function setting(title, desc, control) {
    return el('div', { class: 'setting' }, [
      el('div', { class: 'setting__main' }, [
        el('div', { class: 'setting__title', text: title }),
        el('div', { class: 'setting__desc', text: desc })
      ]),
      el('div', { class: 'setting__control' }, [control])
    ]);
  }

  function toggle(on, onChange) {
    var btn = el('button', {
      class: 'switch', type: 'button', role: 'switch',
      'aria-checked': String(on), 'aria-label': 'Toggle',
      onclick: function () {
        on = !on;
        btn.setAttribute('aria-checked', String(on));
        onChange(on);
      }
    });
    return btn;
  }

  function select(options, value, onChange) {
    return el('select', {
      class: 'select', onchange: function (e) { onChange(e.target.value); }
    }, options.map(function (o) {
      return el('option', { value: o.value, selected: o.value === value, text: o.label });
    }));
  }

  function numInput(value, onChange, step) {
    return el('input', {
      class: 'input', type: 'number', min: '0', step: String(step || 0.01),
      value: String(value), style: { width: '92px' },
      'aria-label': 'Value',
      oninput: function (e) {
        var v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= 0) onChange(v);
      }
    });
  }

  function codeBlock(text) {
    return el('pre', {
      style: {
        margin: '0', padding: '12px 14px', overflowX: 'auto',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', fontFamily: 'var(--mono)',
        fontSize: '11.5px', lineHeight: '1.65', color: 'var(--text-secondary)'
      }
    }, [el('code', { text: text })]);
  }

  return {
    title: 'Settings',
    sub: 'theme, rates and data sources',
    needsRange: false,
    render: render
  };
})();
