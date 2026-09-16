/* =============================================================================
   views/nustatymai.js — 6 skirtukas: nustatymai ir duomenų šaltiniai
   ========================================================================== */
Views.nustatymai = (function () {
  'use strict';

  var el = U.el;

  function render(state) {
    var frag = document.createDocumentFragment();

    frag.appendChild(VH.grid([
      VH.col(6, [appearanceCard(state)]),
      VH.col(6, [ratesCard()])
    ]));

    frag.appendChild(VH.section('Duomenų šaltiniai', 'kaip pakeisti demo duomenis tikrais'));
    frag.appendChild(VH.grid([
      VH.col(6, [claudeSourceCard()]),
      VH.col(6, [lolSourceCard()])
    ]));

    frag.appendChild(VH.section('Duomenys', 'eksportas ir atstatymas'));
    frag.appendChild(VH.grid([
      VH.col(12, [exportCard(state)])
    ]));

    return frag;
  }

  /* --- Išvaizda ------------------------------------------------------------- */

  function appearanceCard(state) {
    var body = el('div', { class: 'card__body' });

    body.appendChild(setting(
      'Tamsus režimas',
      'Numatytasis. Šviesi paletė paruošta ir patikrinta tiems patiems kontrasto reikalavimams.',
      toggle(document.documentElement.dataset.theme !== 'light', function (on) {
        App.setTheme(on ? 'dark' : 'light');
      })
    ));

    body.appendChild(setting(
      'Numatytasis laikotarpis',
      'Kokį intervalą rodyti atidarius Claude skirtukus.',
      VH.segmented(App.RANGES.map(function (r) { return { value: r.value, label: r.short }; }),
        U.store.get('defaultRange', 30),
        function (v) { U.store.set('defaultRange', v); state.range = v; App.rerender(); },
        'Numatytasis laikotarpis')
    ));

    body.appendChild(setting(
      'Pradinis skirtukas',
      'Kuris rodinys atidaromas paleidus svetainę.',
      select(
        [{ value: 'apzvalga', label: 'Apžvalga' }, { value: 'lol', label: 'League of Legends' },
         { value: 'projektai', label: 'Projektai' }, { value: 'modeliai', label: 'Modeliai ir kaštai' },
         { value: 'aktyvumas', label: 'Aktyvumas' }],
        U.store.get('startView', 'apzvalga'),
        function (v) { U.store.set('startView', v); }
      )
    ));

    return el('div', { class: 'card' }, [
      head('Išvaizda', 'tema, laikotarpis ir pradinis rodinys'),
      body
    ]);
  }

  /* --- Tarifai --------------------------------------------------------------- */

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
          el('div', { class: 'setting__desc', text: '$ už 1 mln. žetonų — įvestis ir išvestis' })
        ]),
        el('div', { class: 'setting__control', style: { display: 'flex', gap: '6px' } }, [inInput, outInput])
      ]));
    });

    body.appendChild(setting('Podėlio skaitymo daugiklis', 'Kiek kainuoja podėlio skaitymas, palyginti su įvestimi.',
      numInput(draft.cacheReadFactor, function (v) { draft.cacheReadFactor = v; }, 0.01)));
    body.appendChild(setting('Podėlio rašymo daugiklis', 'Kiek kainuoja įrašymas į podėlį.',
      numInput(draft.cacheWriteFactor, function (v) { draft.cacheWriteFactor = v; }, 0.01)));

    body.appendChild(el('div', { style: { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' } }, [
      el('button', {
        class: 'btn btn--primary', type: 'button', text: 'Išsaugoti tarifus',
        onclick: function () {
          U.store.set('rates', draft);
          App.toast('Tarifai išsaugoti — kaštai perskaičiuoti.');
          App.rerender();
        }
      }),
      el('button', {
        class: 'btn', type: 'button', text: 'Grąžinti numatytuosius',
        onclick: function () { U.store.remove('rates'); App.toast('Grąžinti numatytieji tarifai.'); App.rerender(); }
      })
    ]));

    body.appendChild(el('div', { style: { marginTop: '14px' } }, [
      VH.note('Tai prielaida, ne sąskaita.',
        'Skydas neturi prieigos prie tavo tikrų įkainių, todėl kaštai skaičiuojami pagal čia įrašytas reikšmes. ' +
        'Įrašyk savo plano kainas, ir visi skaičiai atsinaujins.')
    ]));

    return el('div', { class: 'card' }, [head('Kainų tarifai', 'naudojami visiems kaštų skaičiavimams'), body]);
  }

  /* --- Claude šaltinis -------------------------------------------------------- */

  function claudeSourceCard() {
    var code = [
      '// assets/js/data/claude-data.js — Data.load()',
      'Data.load(',
      '  fetch("/mano-statistika.json").then(r => r.json())',
      ').then(() => App.rerender());',
      '',
      '// Laukiamas masyvas, viena eilutė per dieną:',
      '// {',
      '//   date: "2026-09-16",      // ISO data',
      '//   weekday: 2,              // 0 = pirmadienis',
      '//   sessions: 4, messages: 58, toolCalls: 121,',
      '//   tokensIn: 120000, tokensOut: 36000,',
      '//   cacheRead: 410000, cacheWrite: 52000,',
      '//   tokensTotal: 618000,',
      '//   linesAdded: 430, linesRemoved: 180,',
      '//   modelSplit: { "opus-5": 0.4, "sonnet-5": 0.45, "haiku-45": 0.15 },',
      '//   projSplit:  { "skydas-dashboard": 0.7, "kita": 0.3 }',
      '// }'
    ].join('\n');

    return el('div', { class: 'card' }, [
      head('Claude statistika', 'kaip prijungti tikrus duomenis'),
      el('div', { class: 'card__body' }, [
        el('p', { class: 'setting__desc', style: { marginBottom: '10px' },
          text: 'Visi rodiniai skaito tik `Data` API, todėl užtenka pakeisti vieną funkciją — ' +
                'nė vienos kortelės perrašinėti nereikia.' }),
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
      '// champions eilutė:',
      '// {',
      '//   name: "Jinx", key: "Jinx",   // key = Data Dragon vardas',
      '//   role: "ADC",                 // TOP | JUNGLE | MID | ADC | SUPPORT',
      '//   wr: 52.7, pr: 15.4, br: 8.2,',
      '//   games: 92530, d: 1.8,        // d = winrate pokytis, p.p.',
      '//   tier: "S", icon: "https://…"',
      '// }',
      '',
      '// Paveikslėliai: Data Dragon ' + LoL.DDRAGON_VERSION,
      '// Realūs šaltiniai: Riot API (raktas reikalingas) arba',
      '// viešos meta suvestinės (U.GG, OP.GG, LoLalytics).'
    ].join('\n');

    return el('div', { class: 'card' }, [
      head('LoL duomenys', 'pataisos ir čempionų statistika'),
      el('div', { class: 'card__body' }, [
        el('p', { class: 'setting__desc', style: { marginBottom: '10px' },
          text: 'Riot neteikia viešo winrate galinio taško — tokią statistiką skaičiuoja trečiosios ' +
                'šalys arba ją reikia surinkti pačiam iš rungtynių istorijos.' }),
        codeBlock(code)
      ])
    ]);
  }

  /* --- Eksportas -------------------------------------------------------------- */

  function exportCard(state) {
    var body = el('div', { class: 'card__body' });

    body.appendChild(setting(
      'Atsisiųsti dabartinį pjūvį',
      'Išsaugo matomą laikotarpį kaip CSV — galima atidaryti skaičiuoklėje.',
      el('button', {
        class: 'btn', type: 'button', text: 'CSV',
        onclick: function () { downloadCSV(state); }
      })
    ));

    body.appendChild(setting(
      'Atsisiųsti viską kaip JSON',
      'Visos dienos su modelių ir projektų pasiskirstymu.',
      el('button', {
        class: 'btn', type: 'button', text: 'JSON',
        onclick: function () {
          download('skydas-duomenys.json', JSON.stringify(Data.all(), null, 2), 'application/json');
        }
      })
    ));

    body.appendChild(setting(
      'Išvalyti išsaugotus nustatymus',
      'Tema, laikotarpis, tarifai ir pradinis skirtukas grįš į numatytuosius.',
      el('button', {
        class: 'btn', type: 'button', text: 'Išvalyti',
        onclick: function () {
          ['rates', 'theme', 'defaultRange', 'startView'].forEach(U.store.remove);
          App.toast('Nustatymai išvalyti.');
          App.setTheme('dark');
          App.rerender();
        }
      })
    ));

    return el('div', { class: 'card' }, [head('Duomenys', 'eksportas ir atstatymas'), body]);
  }

  function downloadCSV(state) {
    var slice = Data.range(state.range);
    var headRow = ['data', 'savaites_diena', 'sesijos', 'pranesimai', 'irankiu_iskvietimai',
                   'ivestis', 'isvestis', 'podelio_skaitymas', 'podelio_rasymas', 'zetonai_viso', 'kastai_usd'];
    var lines = [headRow.join(',')];
    slice.forEach(function (d) {
      lines.push([d.date, U.WEEKDAYS_LONG[d.weekday], d.sessions, d.messages, d.toolCalls,
                  d.tokensIn, d.tokensOut, d.cacheRead, d.cacheWrite, d.tokensTotal,
                  Data.dayCost(d).toFixed(4)].join(','));
    });
    download('skydas-' + state.range + 'd.csv', lines.join('\n'), 'text/csv;charset=utf-8');
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

  /* --- Smulkios dalys ---------------------------------------------------------- */

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
      'aria-checked': String(on), 'aria-label': 'Perjungti',
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
      'aria-label': 'Reikšmė',
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
    title: 'Nustatymai',
    sub: 'tema, tarifai ir duomenų šaltiniai',
    needsRange: false,
    render: render
  };
})();
