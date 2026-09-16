/* =============================================================================
   lol-data.js — League of Legends pataisos ir Emerald+ meta.

   ĮSPĖJIMAS: tai DEMO rinkinys, sudėtas ranka, kad skydas veiktų neprisijungus.
   Skaičiai NĖRA gyva Riot statistika. Realų šaltinį prijungsi pakeisdamas
   `LoL.load()` — laukiama tos pačios struktūros (žr. „Nustatymai").

   Čempionų paveikslėliai imami iš Riot Data Dragon CDN; nepavykus krautis,
   rodomos inicialų plytelės (svetainė veikia ir be interneto).
   ========================================================================== */
window.LoL = (function () {
  'use strict';

  var DDRAGON_VERSION = '15.19.1';
  var ICON = function (key) {
    return 'https://ddragon.leagueoflegends.com/cdn/' + DDRAGON_VERSION + '/img/champion/' + key + '.png';
  };

  var ROLES = [
    { id: 'TOP', name: 'Viršus' },
    { id: 'JUNGLE', name: 'Miškas' },
    { id: 'MID', name: 'Vidurys' },
    { id: 'ADC', name: 'Šaulys' },
    { id: 'SUPPORT', name: 'Palaikymas' }
  ];

  var TIER_LABEL = { S: 'S pakopa', A: 'A pakopa', B: 'B pakopa', C: 'C pakopa' };

  /* --- Pataisos ------------------------------------------------------------ */

  var PATCHES = [
    {
      version: '26.18', date: '2026-09-09', current: true,
      title: 'Pasaulio čempionato pusiausvyra',
      summary: 'Paskutinė balansavimo pataisa prieš pasaulio čempionatą: nusitaikyta į miško tempą ir palaikymo inžinierius.',
      changes: [
        { type: 'nerf',   champ: 'Briar',       note: 'Q atšalimas 11/10/9/8/7 s → 13/12/11/10/9 s' },
        { type: 'nerf',   champ: 'Milio',       note: 'W skydo dydis −12 % ankstyvuose lygiuose' },
        { type: 'buff',   champ: 'Gnar',        note: 'Bazinė ginklų žala 60 → 63' },
        { type: 'buff',   champ: 'Azir',        note: 'Kareivių žala pagal AP 55 % → 60 %' },
        { type: 'buff',   champ: 'Kalista',     note: 'Pasyvaus šuolio atstumas +15 vnt.' },
        { type: 'adjust', champ: 'K\'Sante',    note: 'Mažiau R žalos, daugiau tvarumo visai komandai' },
        { type: 'nerf',   champ: 'Smolder',     note: 'Pasyvo kaupimo greitis −8 %' },
        { type: 'system', champ: 'Miško augalai', note: 'Pilies augalai atsiranda 30 s vėliau' },
        { type: 'system', champ: 'Sudaužytas šarvas', note: 'Kaina 2900 → 3000 aukso' }
      ]
    },
    {
      version: '26.17', date: '2026-08-26',
      title: 'Šaulių eilė atgauna orą',
      summary: 'Sumažintas mago palaikymų dominavimas apatinėje eilėje, sustiprinti klasikiniai šauliai.',
      changes: [
        { type: 'buff',   champ: 'Jinx',        note: 'Pasyvo greičio priedas trunka 6 s' },
        { type: 'buff',   champ: 'Sivir',       note: 'W atšokimų žala 60 % → 70 %' },
        { type: 'nerf',   champ: 'Brand',       note: 'Palaikymo pozicijoje aukso pajamos −5 %' },
        { type: 'nerf',   champ: 'Hwei',        note: 'QE pralaidumo žala 70 → 60 baziniu lygiu' },
        { type: 'buff',   champ: 'Sejuani',     note: 'Bazinis atsparumas 32 → 35' },
        { type: 'adjust', champ: 'Aurora',      note: 'Perkelta dalis žalos iš W į R' },
        { type: 'system', champ: 'Mirtingumo dalgis', note: 'Naujas legendinis daiktas šauliams' }
      ]
    },
    {
      version: '26.16', date: '2026-08-12',
      title: 'Viršaus eilės tvarumas',
      summary: 'Tankų atnaujinimas: peržiūrėta ankstyvos stadijos aukso ekonomika ir bandinių žala.',
      changes: [
        { type: 'buff',   champ: 'Ornn',        note: 'Pasyvus kalvės atnaujinimas pasiekiamas 11 lygyje' },
        { type: 'buff',   champ: 'Malphite',    note: 'Q kaina 60 → 50 manos' },
        { type: 'nerf',   champ: 'Ambessa',     note: 'R atšalimas +10 s visuose lygiuose' },
        { type: 'nerf',   champ: 'Camille',     note: 'E pagreitis −50 vnt.' },
        { type: 'buff',   champ: 'Illaoi',      note: 'Sielos kaupimo laikas 45 s → 40 s' },
        { type: 'adjust', champ: 'Yorick',      note: 'Mažiau spaudimo vienam, daugiau komandinių kovų naudos' }
      ]
    },
    {
      version: '26.15', date: '2026-07-29',
      title: 'Vidurio eilės mobilumas',
      summary: 'Apribotas judrių žudikų roamingas, sustiprinti klasikiniai magai.',
      changes: [
        { type: 'nerf',   champ: 'Akali',       note: 'R1 žala 75 → 65 baziniu lygiu' },
        { type: 'nerf',   champ: 'Naafiri',     note: 'Šunų atnaujinimo laikas 15 s → 18 s' },
        { type: 'buff',   champ: 'Orianna',     note: 'Rutulio atšaukimo langas +0,25 s' },
        { type: 'buff',   champ: 'Viktor',      note: 'E spindulio plotis +20 vnt.' },
        { type: 'buff',   champ: 'Anivia',      note: 'Kiaušinio atšalimas −20 s vėlyvoje stadijoje' },
        { type: 'system', champ: 'Prakeiktas skeptras', note: 'Perdarytas: dabar teikia atšalimo sumažinimą' }
      ]
    },
    {
      version: '26.14', date: '2026-07-15',
      title: 'Miško tempo perkalibravimas',
      summary: 'Sulėtintas ankstyvas miško tempas, kad eilės turėtų daugiau erdvės.',
      changes: [
        { type: 'nerf',   champ: 'Nidalee',     note: 'Miško monstrų žala −6 %' },
        { type: 'nerf',   champ: 'Graves',      note: 'Q žala monstrams −10 %' },
        { type: 'buff',   champ: 'Amumu',       note: 'W žala per sekundę +4' },
        { type: 'buff',   champ: 'Rammus',      note: 'Q pagreitis pasiekiamas greičiau' },
        { type: 'adjust', champ: 'Bel\'Veth',   note: 'Perdirbtas koralo mechanizmas' },
        { type: 'system', champ: 'Miško patirtis', note: 'Antra stovyklų banga duoda −8 % patirties' }
      ]
    },
    {
      version: '26.13', date: '2026-07-01',
      title: 'Vasaros sezono startas',
      summary: 'Sezono vidurio atnaujinimas: nauji daiktai, pakeista Baron nauda.',
      changes: [
        { type: 'system', champ: 'Baron Nashor', note: 'Nauda dabar stiprina bokštų ardymą, ne bazines savybes' },
        { type: 'buff',   champ: 'Zeri',        note: 'Q žalos priedas nuo kritinio smūgio +5 %' },
        { type: 'nerf',   champ: 'Rell',        note: 'W ir R atšalimai +8 %' },
        { type: 'buff',   champ: 'Karthus',     note: 'R žala 200/350/500 → 220/380/540' },
        { type: 'nerf',   champ: 'Volibear',    note: 'Bazinis gyvybės atsinaujinimas −1,5' }
      ]
    }
  ];

  /* --- Emerald+ čempionų statistika (dabartinė pataisa) --------------------- */
  /* wr = laimėjimų %, pr = pasirinkimo %, br = draudimo %, d = wr pokytis vs 26.17 */

  var RAW = [
    /* TOP */
    ['Ornn', 'Ornn', 'TOP', 52.8, 6.4, 3.1, 38420, 1.4],
    ['Malphite', 'Malphite', 'TOP', 52.1, 8.9, 4.8, 54210, 0.9],
    ['Illaoi', 'Illaoi', 'TOP', 51.9, 4.2, 2.0, 25140, 0.7],
    ['Sett', 'Sett', 'TOP', 51.2, 9.8, 6.4, 59870, 0.2],
    ['Gnar', 'Gnar', 'TOP', 51.0, 5.1, 1.9, 30880, 1.1],
    ['Mordekaiser', 'Mordekaiser', 'TOP', 50.6, 7.6, 12.4, 46030, -0.3],
    ['Aatrox', 'Aatrox', 'TOP', 49.8, 11.2, 14.7, 67900, -0.4],
    ['K\'Sante', 'KSante', 'TOP', 49.1, 6.8, 9.2, 41220, -1.8],
    ['Camille', 'Camille', 'TOP', 48.9, 6.0, 5.5, 36340, -1.2],
    ['Ambessa', 'Ambessa', 'TOP', 48.4, 8.1, 18.9, 49110, -2.1],
    ['Yorick', 'Yorick', 'TOP', 50.9, 3.4, 4.1, 20460, 0.4],
    ['Riven', 'Riven', 'TOP', 48.1, 5.3, 3.8, 32010, -0.6],

    /* JUNGLE */
    ['Amumu', 'Amumu', 'JUNGLE', 53.4, 5.2, 2.4, 31220, 1.8],
    ['Rammus', 'Rammus', 'JUNGLE', 52.9, 3.8, 3.0, 22870, 1.2],
    ['Sejuani', 'Sejuani', 'JUNGLE', 52.4, 6.1, 4.2, 36700, 1.6],
    ['Warwick', 'Warwick', 'JUNGLE', 51.8, 7.4, 5.1, 44500, 0.5],
    ['Nunu & Willump', 'Nunu', 'JUNGLE', 51.3, 4.6, 3.3, 27680, 0.3],
    ['Vi', 'Vi', 'JUNGLE', 50.7, 8.2, 4.9, 49330, -0.1],
    ['Lee Sin', 'LeeSin', 'JUNGLE', 48.6, 14.8, 8.1, 88910, -0.5],
    ['Briar', 'Briar', 'JUNGLE', 49.4, 6.9, 11.2, 41480, -2.6],
    ['Graves', 'Graves', 'JUNGLE', 49.0, 7.1, 5.6, 42700, -1.4],
    ['Nidalee', 'Nidalee', 'JUNGLE', 47.8, 4.4, 2.8, 26450, -1.9],
    ['Bel\'Veth', 'Belveth', 'JUNGLE', 50.2, 4.9, 3.7, 29440, 0.8],
    ['Kayn', 'Kayn', 'JUNGLE', 50.4, 12.1, 9.8, 72680, 0.1],

    /* MID */
    ['Anivia', 'Anivia', 'MID', 53.1, 3.9, 2.1, 23420, 1.9],
    ['Viktor', 'Viktor', 'MID', 52.6, 7.8, 5.4, 46880, 1.5],
    ['Orianna', 'Orianna', 'MID', 52.0, 6.2, 3.2, 37260, 1.3],
    ['Azir', 'Azir', 'MID', 51.4, 4.1, 3.9, 24630, 1.7],
    ['Malzahar', 'Malzahar', 'MID', 51.9, 5.4, 8.7, 32440, 0.2],
    ['Aurora', 'Aurora', 'MID', 50.8, 9.1, 12.6, 54680, -0.7],
    ['Hwei', 'Hwei', 'MID', 49.2, 6.7, 4.4, 40270, -1.6],
    ['Akali', 'Akali', 'MID', 48.3, 10.4, 15.3, 62510, -2.3],
    ['Naafiri', 'Naafiri', 'MID', 48.8, 4.8, 6.1, 28860, -1.7],
    ['Yone', 'Yone', 'MID', 49.6, 13.2, 11.9, 79340, -0.2],
    ['Syndra', 'Syndra', 'MID', 50.1, 6.9, 4.0, 41460, 0.6],
    ['Ahri', 'Ahri', 'MID', 50.5, 11.6, 7.2, 69700, 0.4],

    /* ADC */
    ['Jinx', 'Jinx', 'ADC', 52.7, 15.4, 8.2, 92530, 1.8],
    ['Sivir', 'Sivir', 'ADC', 52.3, 6.8, 2.9, 40870, 2.1],
    ['Kalista', 'Kalista', 'ADC', 51.6, 4.2, 5.8, 25240, 1.6],
    ['Caitlyn', 'Caitlyn', 'ADC', 50.9, 17.1, 11.4, 102740, 0.3],
    ['Jhin', 'Jhin', 'ADC', 51.1, 14.6, 6.7, 87720, 0.5],
    ['Ashe', 'Ashe', 'ADC', 51.4, 12.8, 5.3, 76900, 0.7],
    ['Kai\'Sa', 'Kaisa', 'ADC', 49.8, 19.2, 13.1, 115400, -0.4],
    ['Smolder', 'Smolder', 'ADC', 48.7, 7.4, 9.6, 44480, -2.4],
    ['Zeri', 'Zeri', 'ADC', 49.1, 5.1, 4.2, 30640, -0.8],
    ['Ezreal', 'Ezreal', 'ADC', 48.9, 21.4, 6.9, 128600, -0.2],

    /* SUPPORT */
    ['Braum', 'Braum', 'SUPPORT', 52.9, 5.6, 2.1, 33660, 1.4],
    ['Leona', 'Leona', 'SUPPORT', 52.2, 10.8, 6.4, 64910, 0.8],
    ['Nautilus', 'Nautilus', 'SUPPORT', 51.7, 11.4, 7.8, 68500, 0.5],
    ['Janna', 'Janna', 'SUPPORT', 52.4, 6.2, 2.4, 37270, 1.1],
    ['Thresh', 'Thresh', 'SUPPORT', 50.3, 16.2, 9.1, 97350, -0.1],
    ['Milio', 'Milio', 'SUPPORT', 49.4, 8.9, 10.2, 53480, -2.8],
    ['Brand', 'Brand', 'SUPPORT', 49.7, 7.1, 8.4, 42670, -2.2],
    ['Rell', 'Rell', 'SUPPORT', 50.6, 6.4, 4.6, 38460, -0.6],
    ['Lulu', 'Lulu', 'SUPPORT', 51.0, 9.2, 5.9, 55290, 0.2],
    ['Renata Glasc', 'Renata', 'SUPPORT', 51.5, 4.8, 3.1, 28840, 0.9]
  ];

  /** Pakopa — pagal laimėjimų ir pasirinkimo derinį (ne pagal vieną skaičių). */
  function tierOf(wr, pr) {
    var score = (wr - 50) * 2.2 + Math.min(pr, 20) * 0.22;
    if (score >= 5.4) return 'S';
    if (score >= 2.6) return 'A';
    if (score >= 0.2) return 'B';
    return 'C';
  }

  var CHAMPIONS = RAW.map(function (r, i) {
    return {
      name: r[0], key: r[1], role: r[2],
      wr: r[3], pr: r[4], br: r[5], games: r[6], d: r[7],
      tier: tierOf(r[3], r[4]),
      icon: ICON(r[1]),
      index: i
    };
  });

  /** Laimėjimų istorija per 6 pataisas — determinuota pagal čempiono vardą. */
  function history(champ) {
    var seed = 0;
    for (var i = 0; i < champ.name.length; i++) seed = (seed * 31 + champ.name.charCodeAt(i)) >>> 0;
    var rnd = U.rng(seed);
    var out = new Array(PATCHES.length);
    out[0] = champ.wr;                                   /* naujausia pataisa */
    for (var k = 1; k < PATCHES.length; k++) {
      var drift = k === 1 ? champ.d : (rnd() - 0.5) * 2.2;
      out[k] = Math.round((out[k - 1] - drift) * 10) / 10;
    }
    return out.reverse();                                /* seniausia → naujausia */
  }

  function byRole(role) {
    return CHAMPIONS.filter(function (c) { return role === 'ALL' || c.role === role; });
  }

  function roleName(id) {
    var r = ROLES.filter(function (x) { return x.id === id; })[0];
    return r ? r.name : id;
  }

  /** Bendra statistika viršuje. */
  function summary() {
    var total = U.sum(CHAMPIONS, function (c) { return c.games; });
    var top = CHAMPIONS.slice().sort(function (a, b) { return b.wr - a.wr; })[0];
    var climber = CHAMPIONS.slice().sort(function (a, b) { return b.d - a.d; })[0];
    var faller = CHAMPIONS.slice().sort(function (a, b) { return a.d - b.d; })[0];
    var banned = CHAMPIONS.slice().sort(function (a, b) { return b.br - a.br; })[0];
    return { total: total, top: top, climber: climber, faller: faller, banned: banned };
  }

  return {
    DDRAGON_VERSION: DDRAGON_VERSION,
    ROLES: ROLES,
    TIER_LABEL: TIER_LABEL,
    PATCHES: PATCHES,
    CHAMPIONS: CHAMPIONS,
    current: PATCHES[0],
    history: history,
    byRole: byRole,
    roleName: roleName,
    summary: summary,
    icon: ICON,

    /* Prijungimo taškas: gražink {patches, champions} tos pačios formos. */
    load: function (promise) {
      return Promise.resolve(promise).then(function (payload) {
        if (payload && payload.champions) CHAMPIONS = payload.champions;
        if (payload && payload.patches) PATCHES = payload.patches;
        return { patches: PATCHES, champions: CHAMPIONS };
      });
    }
  };
})();
