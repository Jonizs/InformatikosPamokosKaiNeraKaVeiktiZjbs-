/* =============================================================================
   lol-data.js — League of Legends patches and the Emerald+ meta.

   NOTE: this is a DEMO dataset, hand-assembled so the dashboard runs offline.
   The numbers are NOT live Riot statistics. To wire a real source, replace
   `LoL.load()` — the same shape is expected (see the Settings tab).

   Champion portraits come from Riot's Data Dragon CDN; if they fail to load,
   initial tiles are shown instead, so the site works with no network at all.
   ========================================================================== */
window.LoL = (function () {
  'use strict';

  var DDRAGON_VERSION = '15.19.1';
  var ICON = function (key) {
    return 'https://ddragon.leagueoflegends.com/cdn/' + DDRAGON_VERSION + '/img/champion/' + key + '.png';
  };

  var ROLES = [
    { id: 'TOP', name: 'Top' },
    { id: 'JUNGLE', name: 'Jungle' },
    { id: 'MID', name: 'Mid' },
    { id: 'ADC', name: 'ADC' },
    { id: 'SUPPORT', name: 'Support' }
  ];

  var TIER_LABEL = { S: 'S tier', A: 'A tier', B: 'B tier', C: 'C tier' };

  /* --- Patches -------------------------------------------------------------- */

  var PATCHES = [
    {
      version: '26.18', date: '2026-09-09', current: true,
      title: 'The Worlds balance patch',
      summary: 'The last balance pass before the World Championship: jungle tempo and the support engine room take the hit.',
      changes: [
        { type: 'nerf',   champ: 'Briar',        note: 'Q cooldown 11/10/9/8/7s → 13/12/11/10/9s' },
        { type: 'nerf',   champ: 'Milio',        note: 'W shield strength −12% at early ranks' },
        { type: 'buff',   champ: 'Gnar',         note: 'Base attack damage 60 → 63' },
        { type: 'buff',   champ: 'Azir',         note: 'Soldier AP ratio 55% → 60%' },
        { type: 'buff',   champ: 'Kalista',      note: 'Passive hop range +15 units' },
        { type: 'adjust', champ: 'K\'Sante',     note: 'Less R damage, more team-wide durability' },
        { type: 'nerf',   champ: 'Smolder',      note: 'Passive stack rate −8%' },
        { type: 'system', champ: 'Jungle plants', note: 'Blast cones spawn 30s later' },
        { type: 'system', champ: 'Sundered Sky', note: 'Cost 2900 → 3000 gold' }
      ]
    },
    {
      version: '26.17', date: '2026-08-26',
      title: 'Marksmen get room to breathe',
      summary: 'Mage supports lose their grip on the bot lane; classic marksmen are handed their scaling back.',
      changes: [
        { type: 'buff',   champ: 'Jinx',         note: 'Passive move-speed bonus lasts 6s' },
        { type: 'buff',   champ: 'Sivir',        note: 'W bounce damage 60% → 70%' },
        { type: 'nerf',   champ: 'Brand',        note: 'Gold income −5% in the support role' },
        { type: 'nerf',   champ: 'Hwei',         note: 'QE base damage 70 → 60' },
        { type: 'buff',   champ: 'Sejuani',      note: 'Base armour 32 → 35' },
        { type: 'adjust', champ: 'Aurora',       note: 'Damage shifted out of W and into R' },
        { type: 'system', champ: 'Mortal Reaper', note: 'New legendary item for marksmen' }
      ]
    },
    {
      version: '26.16', date: '2026-08-12',
      title: 'Top lane learns durability again',
      summary: 'A tank pass: early gold economy and minion damage reworked in favour of front-liners.',
      changes: [
        { type: 'buff',   champ: 'Ornn',         note: 'Passive forge upgrade unlocks at level 11' },
        { type: 'buff',   champ: 'Malphite',     note: 'Q cost 60 → 50 mana' },
        { type: 'nerf',   champ: 'Ambessa',      note: 'R cooldown +10s at all ranks' },
        { type: 'nerf',   champ: 'Camille',      note: 'E dash speed −50 units' },
        { type: 'buff',   champ: 'Illaoi',       note: 'Soul stack timer 45s → 40s' },
        { type: 'adjust', champ: 'Yorick',       note: 'Less solo pressure, more teamfight payoff' }
      ]
    },
    {
      version: '26.15', date: '2026-07-29',
      title: 'Mid-lane mobility gets clipped',
      summary: 'Roaming assassins are reined in while control mages are handed their old levers back.',
      changes: [
        { type: 'nerf',   champ: 'Akali',        note: 'R1 base damage 75 → 65' },
        { type: 'nerf',   champ: 'Naafiri',      note: 'Packmate respawn 15s → 18s' },
        { type: 'buff',   champ: 'Orianna',      note: 'Ball recall window +0.25s' },
        { type: 'buff',   champ: 'Viktor',       note: 'E beam width +20 units' },
        { type: 'buff',   champ: 'Anivia',       note: 'Egg cooldown −20s in the late game' },
        { type: 'system', champ: 'Cursed Sceptre', note: 'Reworked: now grants ability haste' }
      ]
    },
    {
      version: '26.14', date: '2026-07-15',
      title: 'Jungle tempo recalibration',
      summary: 'Early jungle tempo slowed down so that lanes get space to play the game themselves.',
      changes: [
        { type: 'nerf',   champ: 'Nidalee',      note: 'Damage to monsters −6%' },
        { type: 'nerf',   champ: 'Graves',       note: 'Q damage to monsters −10%' },
        { type: 'buff',   champ: 'Amumu',        note: 'W damage per second +4' },
        { type: 'buff',   champ: 'Rammus',       note: 'Q reaches max speed sooner' },
        { type: 'adjust', champ: 'Bel\'Veth',    note: 'Coral mechanic reworked' },
        { type: 'system', champ: 'Jungle XP',    note: 'Second camp clear grants −8% experience' }
      ]
    },
    {
      version: '26.13', date: '2026-07-01',
      title: 'Summer split opener',
      summary: 'The mid-season update: new items and a rebuilt Baron buff.',
      changes: [
        { type: 'system', champ: 'Baron Nashor', note: 'Buff now empowers sieging instead of raw stats' },
        { type: 'buff',   champ: 'Zeri',         note: 'Q crit damage scaling +5%' },
        { type: 'nerf',   champ: 'Rell',         note: 'W and R cooldowns +8%' },
        { type: 'buff',   champ: 'Karthus',      note: 'R damage 200/350/500 → 220/380/540' },
        { type: 'nerf',   champ: 'Volibear',     note: 'Base health regen −1.5' }
      ]
    }
  ];

  /* --- Emerald+ champion statistics (current patch) ------------------------- */
  /* wr = win %, pr = pick %, br = ban %, d = win-rate change vs 26.17 (pp) */

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

  /** Tier from the win-rate / pick-rate pair, never from one number alone. */
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

  /* --- Patch analysis -------------------------------------------------------
     A written read of the dataset above. The method is the one the community
     uses — win-rate vs pick-rate quadrants, ban-rate lag, one-trick selection
     bias, reading a patch arc rather than a single patch — applied to these
     numbers. The conclusions are therefore about THIS dataset, not a claim
     about live solo queue.
     ----------------------------------------------------------------------- */

  var ANALYSIS = {
    patch: '26.18',
    kicker: 'Meta read',
    headline: 'The six-patch shove away from the solo carry',
    standfirst: 'Read 26.18 on its own and it looks like a quiet pre-Worlds tap. ' +
      'Read it as the sixth patch in a row pointing the same way and it is the ' +
      'closing argument: the game no longer pays you for winning your lane alone.',

    takes: [
      {
        title: 'This is an arc, not a patch',
        body: 'Every patch since 26.14 has pulled the same lever. Jungle XP cut, ' +
          'then assassin mobility clipped, then top-lane tanks handed durability, ' +
          'then marksmen given their scaling back — and now blast cones spawn 30 ' +
          'seconds later, which lands on top of the 26.14 camp-XP nerf rather than ' +
          'beside it. Individually each change is small. Stacked, they have moved ' +
          'roughly two percentage points of win rate from champions who snowball a ' +
          'lead into champions who convert a teamfight.',
        evidence: 'Top six win rates: three tanks, one control mage, one tank support, one late-game ADC. No assassins.'
      },
      {
        title: 'Ban rates are fighting the last patch',
        body: 'Ambessa is banned in 18.9% of games and wins 48.4% of the ones she ' +
          'reaches. Akali is banned 15.3% at 48.3%. Those bans are muscle memory ' +
          'from 26.13, and they are being spent on champions the patch notes ' +
          'already handled. Meanwhile Amumu — the single highest win rate in the ' +
          'dataset — is banned 2.4% of the time. The cheapest edge on this patch is ' +
          'not a pick; it is noticing which bans have stopped earning their slot.',
        evidence: 'Ambessa: 18.9% ban / 48.4% win. Amumu: 2.4% ban / 53.4% win.'
      },
      {
        title: 'The bot lane split is the sharpest signal',
        body: 'Sivir is the biggest riser at +2.1pp and sits at 52.3% — on 6.8% ' +
          'pick rate. Ezreal is the most-picked champion in the game at 21.4% and ' +
          'loses more than he wins. That gap is not a balance problem, it is a ' +
          'habit problem: 26.17 rewarded marksmen who commit to a teamfight ' +
          'position, and the most popular ADC is the one built to avoid ever ' +
          'committing to one. Kai\'Sa at 19.2% pick and 49.8% is the same story.',
        evidence: 'Sivir 6.8% pick at 52.3%. Ezreal 21.4% pick at 48.9%. Kai\'Sa 19.2% at 49.8%.'
      },
      {
        title: '26.18 removes the two champions holding the old meta together',
        body: 'Briar and Milio are not random targets. Briar was the last jungler ' +
          'who could still convert an early lead on her own, and Milio was the ' +
          'safety net that let a fragile carry survive the front-to-back fights the ' +
          'previous five patches created. Nerf both in the same patch and you have ' +
          'not adjusted two champions — you have removed the escape hatch from the ' +
          'meta you just spent two months building. Expect the tank cluster to ' +
          'overshoot before it settles.',
        evidence: 'Briar −2.6pp and Milio −2.8pp are the two largest drops on the patch.'
      },
      {
        title: 'Worlds will amplify this, not correct it',
        body: 'Pro teams already prefer front-to-back compositions with a scaling ' +
          'carry, because coordinated play makes teamfight win conditions more ' +
          'reliable than solo-queue skirmish ones. Handing them a patch that was ' +
          'already pushing that direction means the stage version will look more ' +
          'extreme than the ladder version, not less. The honest caution is the ' +
          'reverse direction: what wins at Worlds on 26.18 will be worse advice for ' +
          'your own games than usual, because the patch rewards exactly the ' +
          'coordination solo queue cannot supply.',
        evidence: 'Azir +1.7pp and Kalista +1.6pp — two champions that scale hard with coordination — are buffed directly on 26.18.'
      }
    ],

    watchlist: [
      { name: 'Sivir', verdict: 'Buy', note: 'Biggest riser, still only 6.8% picked and 2.9% banned. The gap closes.' },
      { name: 'Anivia', verdict: 'Careful', note: '53.1% on 3.9% pick rate is mostly one-trick selection bias, not a free win.' },
      { name: 'Azir', verdict: 'Buy', note: 'Directly buffed on 26.18, already +1.7pp, and Worlds visibility is about to arrive.' },
      { name: 'Ambessa', verdict: 'Stop banning', note: '18.9% ban rate on a 48.4% champion — that slot is being wasted.' },
      { name: 'Ezreal', verdict: 'Sell', note: 'The most-picked champion in the game has been below 50% for two patches.' },
      { name: 'Amumu', verdict: 'Buy now', note: 'Best win rate in the dataset, near-zero ban rate. This will not last.' }
    ],

    caveats: [
      'Emerald+ is not pro play. A pick that needs five coordinated players reads worse here than it does on stage.',
      'Low pick rate inflates win rate. Anivia at 3.9% and Rammus at 3.8% are largely played by people who play only them.',
      'Ban rates lag the meta by roughly two patches, so ban data describes what players feared recently, not what is strong now.',
      'Win-rate deltas this size (±2pp) need a full patch cycle to separate real change from noise.',
      'These are demo numbers shipped with the dashboard, not a live Riot feed — the reasoning is real, the underlying data is illustrative.'
    ]
  };

  /** Win-rate history across the six patches — deterministic per champion name. */
  function history(champ) {
    var seed = 0;
    for (var i = 0; i < champ.name.length; i++) seed = (seed * 31 + champ.name.charCodeAt(i)) >>> 0;
    var rnd = U.rng(seed);
    var out = new Array(PATCHES.length);
    out[0] = champ.wr;                                   /* most recent patch */
    for (var k = 1; k < PATCHES.length; k++) {
      var drift = k === 1 ? champ.d : (rnd() - 0.5) * 2.2;
      out[k] = Math.round((out[k - 1] - drift) * 10) / 10;
    }
    return out.reverse();                                /* oldest → newest */
  }

  function byRole(role) {
    return CHAMPIONS.filter(function (c) { return role === 'ALL' || c.role === role; });
  }

  function roleName(id) {
    var r = ROLES.filter(function (x) { return x.id === id; })[0];
    return r ? r.name : id;
  }

  function byName(name) {
    return CHAMPIONS.filter(function (c) { return c.name === name; })[0] || null;
  }

  /** Headline numbers for the top of the view. */
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
    ANALYSIS: ANALYSIS,
    current: PATCHES[0],
    history: history,
    byRole: byRole,
    byName: byName,
    roleName: roleName,
    summary: summary,
    icon: ICON,

    /* Hook-up point: return { patches, champions } in the same shape. */
    load: function (promise) {
      return Promise.resolve(promise).then(function (payload) {
        if (payload && payload.champions) CHAMPIONS = payload.champions;
        if (payload && payload.patches) PATCHES = payload.patches;
        return { patches: PATCHES, champions: CHAMPIONS };
      });
    }
  };
})();
