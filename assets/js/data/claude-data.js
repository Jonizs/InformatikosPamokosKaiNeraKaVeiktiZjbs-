/* =============================================================================
   claude-data.js — Claude paskyros naudojimo duomenų sluoksnis.

   ĮSPĖJIMAS: čia generuojami DEMO duomenys (determinuotas sėklinis
   generatorius), kad skydas veiktų be jokio serverio. Visa vartotojo sąsaja
   skaito TIK žemiau aprašytą `Data` API, todėl realų šaltinį prijungsi
   pakeisdamas vienintelę funkciją `Data.load()` — žr. „Nustatymai" skirtuką.
   ========================================================================== */
window.Data = (function () {
  'use strict';

  var DAYS = 182;                                  /* ~6 mėnesiai */
  var SEED = 20260916;

  /* --- Katalogai ----------------------------------------------------------- */

  var PROJECTS = [
    { id: 'informatikos-pamokos', name: 'informatikos-pamokos', lang: 'HTML/CSS', slot: 0, weight: 0.26, from: 0,   repo: 'Jonizs/InformatikosPamokos' },
    { id: 'skydas-dashboard',     name: 'skydas-dashboard',     lang: 'JavaScript', slot: 1, weight: 0.21, from: 96,  repo: 'Jonizs/skydas' },
    { id: 'lol-stats-api',        name: 'lol-stats-api',        lang: 'Python',   slot: 2, weight: 0.17, from: 40,  repo: 'Jonizs/lol-stats-api' },
    { id: 'tvarkarastis',         name: 'tvarkarastis',         lang: 'TypeScript', slot: 3, weight: 0.13, from: 12,  repo: 'Jonizs/tvarkarastis' },
    { id: 'discord-botas',        name: 'discord-botas',        lang: 'JavaScript', slot: 4, weight: 0.10, from: 0,   repo: 'Jonizs/discord-botas' },
    { id: 'algoritmu-uzduotys',   name: 'algoritmu-uzduotys',   lang: 'C++',      slot: 5, weight: 0.08, from: 60,  repo: 'Jonizs/algoritmai' },
    { id: 'kita',                 name: 'Kita',                 lang: '—',        slot: 6, weight: 0.05, from: 0,   repo: null }
  ];

  var MODELS = [
    { id: 'opus-5',   name: 'Opus 5',   slot: 0, share: [0.18, 0.42] },  /* dalis: pradžia → pabaiga */
    { id: 'sonnet-5', name: 'Sonnet 5', slot: 1, share: [0.52, 0.44] },
    { id: 'haiku-45', name: 'Haiku 4.5', slot: 2, share: [0.30, 0.14] }
  ];

  /* Kainos prielaidos ($ už 1 mln. žetonų). Redaguojamos „Nustatymuose". */
  var DEFAULT_RATES = {
    'opus-5':   { in: 5.00, out: 25.00 },
    'sonnet-5': { in: 3.00, out: 15.00 },
    'haiku-45': { in: 1.00, out: 5.00 },
    cacheReadFactor: 0.10,                         /* × įvesties kainos */
    cacheWriteFactor: 1.25
  };

  function rates() {
    var saved = U.store.get('rates', null);
    if (!saved) return DEFAULT_RATES;
    return Object.assign({}, DEFAULT_RATES, saved);
  }

  /* --- Generavimas --------------------------------------------------------- */

  /* Savaitės ritmas: moksleivio grafikas — piktai dirbama vakarais ir savaitgalį. */
  var WEEKDAY_FACTOR = [0.82, 0.88, 0.95, 0.90, 1.18, 1.32, 1.12];  /* Pr..Sk */

  /* Paros pasiskirstymas (24 val.) — vėlyvas vakaras dominuoja. */
  var HOUR_SHAPE = [
    0.020, 0.008, 0.003, 0.001, 0.001, 0.002, 0.006, 0.014,
    0.022, 0.028, 0.030, 0.033, 0.030, 0.034, 0.040, 0.052,
    0.068, 0.078, 0.070, 0.084, 0.106, 0.118, 0.094, 0.058
  ];

  function build() {
    var rnd = U.rng(SEED);
    var start = U.addDays(U.TODAY, -(DAYS - 1));
    var days = [];

    for (var i = 0; i < DAYS; i++) {
      var date = U.addDays(start, i);
      var wd = U.mondayIndex(date);
      var progress = i / (DAYS - 1);

      /* Auganti bazė + du „projektų karštymečio" kupranugario kupros */
      var trend = 0.55 + 0.85 * progress;
      var bump = 1 + 0.42 * Math.exp(-Math.pow((i - 118) / 13, 2))
                   + 0.30 * Math.exp(-Math.pow((i - 64) / 11, 2));
      var noise = 0.72 + rnd() * 0.62;
      var intensity = trend * bump * noise * WEEKDAY_FACTOR[wd];

      /* Neaktyvios dienos: atostogos, egzaminų savaitė, tiesiog pertrauka */
      var idle = rnd() < (progress < 0.18 ? 0.22 : 0.09);
      var vacation = (i >= 26 && i <= 36) || (i >= 150 && i <= 154);
      if (idle || vacation) intensity *= rnd() < 0.55 ? 0 : 0.18;

      var sessions = Math.round(intensity * 3.4);
      var messages = sessions === 0 ? 0 : Math.round(sessions * (7 + rnd() * 11));
      var toolCalls = Math.round(messages * (1.8 + rnd() * 1.5));

      var outTok = Math.round(messages * (620 + rnd() * 520));
      var inTok = Math.round(messages * (2100 + rnd() * 1800));
      var cacheRead = Math.round(inTok * (2.6 + rnd() * 2.2));
      var cacheWrite = Math.round(inTok * (0.42 + rnd() * 0.3));

      /* Modelių dalys slenka per laikotarpį */
      var modelSplit = {};
      var total = 0;
      MODELS.forEach(function (mdl) {
        var share = mdl.share[0] + (mdl.share[1] - mdl.share[0]) * progress;
        share *= 0.85 + rnd() * 0.3;
        modelSplit[mdl.id] = share;
        total += share;
      });
      MODELS.forEach(function (mdl) { modelSplit[mdl.id] /= total; });

      /* Projektų pasiskirstymas — tik tie, kurie tą dieną jau egzistuoja */
      var live = PROJECTS.filter(function (p) { return i >= p.from; });
      var projSplit = {};
      var pTotal = 0;
      live.forEach(function (p) {
        /* Kiekvienas projektas turi savo „karštą" atkarpą */
        var age = (i - p.from) / Math.max(1, DAYS - p.from);
        var focus = 0.6 + 0.8 * Math.exp(-Math.pow((age - 0.35) / 0.4, 2));
        var w = p.weight * focus * (0.5 + rnd() * 1.3);
        projSplit[p.id] = w;
        pTotal += w;
      });
      live.forEach(function (p) { projSplit[p.id] /= pTotal || 1; });

      days.push({
        date: U.iso(date),
        weekday: wd,
        sessions: sessions,
        messages: messages,
        toolCalls: toolCalls,
        tokensIn: inTok,
        tokensOut: outTok,
        cacheRead: cacheRead,
        cacheWrite: cacheWrite,
        tokensTotal: inTok + outTok + cacheRead + cacheWrite,
        linesAdded: Math.round(toolCalls * (3.1 + rnd() * 4)),
        linesRemoved: Math.round(toolCalls * (1.2 + rnd() * 2)),
        modelSplit: modelSplit,
        projSplit: projSplit,
        hourSeed: rnd()
      });
    }
    return days;
  }

  var days = build();

  /* --- Kaštų skaičiavimas --------------------------------------------------- */

  function dayCost(d, R) {
    var c = 0;
    MODELS.forEach(function (mdl) {
      var share = d.modelSplit[mdl.id];
      var r = R[mdl.id];
      c += (d.tokensIn * share / 1e6) * r.in;
      c += (d.tokensOut * share / 1e6) * r.out;
      c += (d.cacheRead * share / 1e6) * r.in * R.cacheReadFactor;
      c += (d.cacheWrite * share / 1e6) * r.in * R.cacheWriteFactor;
    });
    return c;
  }

  /* --- Užklausos ------------------------------------------------------------ */

  /** Paskutinės N dienos (N = 7 / 30 / 90 / 182). */
  function range(n) {
    return days.slice(Math.max(0, days.length - n));
  }
  /** Ankstesnis vienodo ilgio langas — palyginimui. */
  function previous(n) {
    var end = Math.max(0, days.length - n);
    return days.slice(Math.max(0, end - n), end);
  }

  function totals(slice) {
    var R = rates();
    var t = {
      days: slice.length, activeDays: 0, sessions: 0, messages: 0, toolCalls: 0,
      tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, tokensTotal: 0,
      linesAdded: 0, linesRemoved: 0, cost: 0
    };
    slice.forEach(function (d) {
      if (d.sessions > 0) t.activeDays++;
      t.sessions += d.sessions; t.messages += d.messages; t.toolCalls += d.toolCalls;
      t.tokensIn += d.tokensIn; t.tokensOut += d.tokensOut;
      t.cacheRead += d.cacheRead; t.cacheWrite += d.cacheWrite;
      t.tokensTotal += d.tokensTotal;
      t.linesAdded += d.linesAdded; t.linesRemoved += d.linesRemoved;
      t.cost += dayCost(d, R);
    });
    t.cacheHitRate = t.cacheRead + t.tokensIn > 0
      ? (t.cacheRead / (t.cacheRead + t.tokensIn)) * 100 : 0;
    t.avgSession = t.sessions ? t.tokensTotal / t.sessions : 0;
    t.avgPerActiveDay = t.activeDays ? t.tokensTotal / t.activeDays : 0;
    return t;
  }

  function pctChange(now, before) {
    if (!before) return 0;
    return ((now - before) / before) * 100;
  }

  /** Suvestinė pagal projektus (rūšiuota mažėjančiai). */
  function byProject(slice) {
    var R = rates();
    var acc = {};
    PROJECTS.forEach(function (p) {
      acc[p.id] = { id: p.id, name: p.name, lang: p.lang, slot: p.slot, repo: p.repo,
                    tokens: 0, sessions: 0, messages: 0, cost: 0, lines: 0, lastActive: null };
    });
    slice.forEach(function (d) {
      var c = dayCost(d, R);
      Object.keys(d.projSplit).forEach(function (pid) {
        var share = d.projSplit[pid];
        var a = acc[pid];
        if (!a) return;
        a.tokens += d.tokensTotal * share;
        a.sessions += d.sessions * share;
        a.messages += d.messages * share;
        a.lines += (d.linesAdded + d.linesRemoved) * share;
        a.cost += c * share;
        if (d.sessions > 0 && share > 0.02) a.lastActive = d.date;
      });
    });
    return Object.keys(acc).map(function (k) { return acc[k]; })
      .filter(function (a) { return a.tokens > 0; })
      .sort(function (a, b) { return b.tokens - a.tokens; });
  }

  /** Dienos eilutė vienam projektui — sukrautiems stulpeliams. */
  function projectSeries(slice, projectIds) {
    return projectIds.map(function (pid) {
      return slice.map(function (d) { return Math.round(d.tokensTotal * (d.projSplit[pid] || 0)); });
    });
  }

  function byModel(slice) {
    var R = rates();
    var acc = MODELS.map(function (m) {
      return { id: m.id, name: m.name, slot: m.slot, tokens: 0, tokensIn: 0, tokensOut: 0,
               cacheRead: 0, cacheWrite: 0, messages: 0, cost: 0 };
    });
    slice.forEach(function (d) {
      acc.forEach(function (a) {
        var share = d.modelSplit[a.id];
        a.tokens += d.tokensTotal * share;
        a.tokensIn += d.tokensIn * share;
        a.tokensOut += d.tokensOut * share;
        a.cacheRead += d.cacheRead * share;
        a.cacheWrite += d.cacheWrite * share;
        a.messages += d.messages * share;
        var r = R[a.id];
        a.cost += (d.tokensIn * share / 1e6) * r.in
                + (d.tokensOut * share / 1e6) * r.out
                + (d.cacheRead * share / 1e6) * r.in * R.cacheReadFactor
                + (d.cacheWrite * share / 1e6) * r.in * R.cacheWriteFactor;
      });
    });
    return acc.sort(function (a, b) { return b.tokens - a.tokens; });
  }

  /** Savaitės diena × valanda — pranešimų skaičius. */
  function hourMatrix(slice) {
    var m = [];
    for (var i = 0; i < 7; i++) m.push(new Array(24).fill(0));
    slice.forEach(function (d) {
      var rnd = U.rng(Math.round(d.hourSeed * 1e9));
      for (var hh = 0; hh < 24; hh++) {
        var v = d.messages * HOUR_SHAPE[hh] * (0.6 + rnd() * 0.9);
        m[d.weekday][hh] += v;
      }
    });
    return m.map(function (row) { return row.map(function (v) { return Math.round(v); }); });
  }

  /** Ilgiausia ir dabartinė aktyvių dienų serija. */
  function streaks(slice) {
    var cur = 0, best = 0, running = 0;
    slice.forEach(function (d) {
      if (d.sessions > 0) { running++; if (running > best) best = running; }
      else running = 0;
    });
    for (var i = slice.length - 1; i >= 0; i--) {
      if (slice[i].sessions > 0) cur++; else break;
    }
    return { current: cur, best: best };
  }

  /* --- Paskutinės sesijos (įvykių juosta) ---------------------------------- */

  var SESSION_TITLES = {
    'informatikos-pamokos': ['Pamokos lentelės stilius', 'Formos validavimas', 'Flexbox išdėstymas', 'Kontrastų taisymas', 'Semantinis HTML'],
    'skydas-dashboard':     ['Grafikų komponentė', 'Tamsaus režimo žetonai', 'Maršrutizavimas per hash', 'Lentelės rikiavimas', 'Patarimų burbulai'],
    'lol-stats-api':        ['Riot API ribotuvas', 'Pataisų cache sluoksnis', 'Winrate agregavimas', 'Pytest aprėptis', 'Duomenų modelis'],
    'tvarkarastis':         ['Savaitės rodinys', 'ICS eksportas', 'Pranešimų logika', 'Zod schemos', 'Laiko juostos'],
    'discord-botas':        ['Slash komandos', 'Rolių valdymas', 'Klaidų žurnalas', 'Deploy į Railway'],
    'algoritmu-uzduotys':   ['Dinaminis programavimas', 'Grafų apėjimas', 'Rikiavimo lyginimas', 'Atminties optimizavimas'],
    'kita':                 ['Git konfliktai', 'Shell skriptai', 'Regex derinimas']
  };

  function recentSessions(limit) {
    var out = [];
    var rnd = U.rng(SEED + 7);
    for (var i = days.length - 1; i >= 0 && out.length < (limit || 12); i--) {
      var d = days[i];
      if (d.sessions <= 0) continue;
      var ids = Object.keys(d.projSplit).sort(function (a, b) { return d.projSplit[b] - d.projSplit[a]; });
      var count = Math.min(d.sessions, 2);
      for (var k = 0; k < count && out.length < (limit || 12); k++) {
        var pid = ids[k % ids.length];
        var titles = SESSION_TITLES[pid] || ['Sesija'];
        var share = d.projSplit[pid];
        out.push({
          date: d.date,
          project: pid,
          projectName: (PROJECTS.filter(function (p) { return p.id === pid; })[0] || {}).name || pid,
          title: titles[Math.floor(rnd() * titles.length)],
          tokens: Math.round(d.tokensTotal * share / Math.max(1, count)),
          messages: Math.max(3, Math.round(d.messages * share / Math.max(1, count))),
          minutes: Math.max(6, Math.round(12 + rnd() * 78)),
          model: rnd() < 0.42 ? 'Opus 5' : rnd() < 0.75 ? 'Sonnet 5' : 'Haiku 4.5'
        });
      }
    }
    return out;
  }

  /* --- Vieša sąsaja --------------------------------------------------------- */

  return {
    PROJECTS: PROJECTS,
    MODELS: MODELS,
    DEFAULT_RATES: DEFAULT_RATES,
    rates: rates,
    all: function () { return days; },
    range: range,
    previous: previous,
    totals: totals,
    pctChange: pctChange,
    byProject: byProject,
    projectSeries: projectSeries,
    byModel: byModel,
    hourMatrix: hourMatrix,
    streaks: streaks,
    recentSessions: recentSessions,
    dayCost: function (d) { return dayCost(d, rates()); },

    /* Prijungimo taškas realiems duomenims: gražink tokį pat `days` masyvą.
       Pvz.: Data.load(fetch(url).then(r => r.json())) — žr. „Nustatymai". */
    load: function (promise) {
      return Promise.resolve(promise).then(function (rows) {
        if (Array.isArray(rows) && rows.length) { days = rows; }
        return days;
      });
    }
  };
})();
