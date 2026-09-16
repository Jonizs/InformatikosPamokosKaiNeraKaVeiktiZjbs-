/* =============================================================================
   app.js — maršrutizavimas, būsena, tema ir bendri viršutinės juostos valdikliai
   ========================================================================== */
window.App = (function () {
  'use strict';

  var el = U.el;

  var RANGES = [
    { value: 7,   short: '7 d.',  label: 'Paskutinės 7 dienos' },
    { value: 30,  short: '30 d.', label: 'Paskutinės 30 dienų' },
    { value: 90,  short: '90 d.', label: 'Paskutinės 90 dienų' },
    { value: 182, short: 'Viskas', label: 'Visas laikotarpis' }
  ];

  var ORDER = ['apzvalga', 'lol', 'projektai', 'modeliai', 'aktyvumas', 'nustatymai'];

  var state = {
    view: 'apzvalga',
    range: U.store.get('defaultRange', 30),
    rangeLabel: 'Paskutinės 30 dienų',
    project: null,
    lolRole: 'ALL',
    lolQuery: '',
    lolShowAll: false
  };

  /* --- Tema ----------------------------------------------------------------- */

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    U.store.set('theme', theme);
    var btn = U.qs('#themeToggle');
    var label = U.qs('#themeToggleLabel');
    if (btn) btn.setAttribute('aria-pressed', String(theme === 'dark'));
    if (label) label.textContent = theme === 'dark' ? 'Tamsus režimas' : 'Šviesus režimas';
    /* Grafikai laiko hex reikšmes, todėl juos reikia perbraižyti */
    document.dispatchEvent(new CustomEvent('theme-change'));
    rerender();
  }

  /* --- Maršrutai ------------------------------------------------------------- */

  function viewFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return ORDER.indexOf(h) !== -1 ? h : null;
  }

  function navigate() {
    var v = viewFromHash();
    if (!v) {
      var start = U.store.get('startView', 'apzvalga');
      location.replace('#/' + (ORDER.indexOf(start) !== -1 ? start : 'apzvalga'));
      return;
    }
    state.view = v;
    render();
  }

  /* --- Atvaizdavimas ---------------------------------------------------------- */

  function render() {
    var view = Views[state.view];
    if (!view) return;

    var picked = RANGES.filter(function (r) { return r.value === state.range; })[0] || RANGES[1];
    state.rangeLabel = picked.label;

    /* Viršutinė juosta */
    U.qs('#viewTitle').textContent = view.title;
    U.qs('#viewSub').textContent = view.sub;
    document.title = view.title + ' — Skydas';

    var actions = U.clear(U.qs('#topbarActions'));
    if (view.needsRange) {
      actions.appendChild(el('span', {
        class: 'card__sub', style: { marginRight: '2px' }, text: 'Laikotarpis'
      }));
      actions.appendChild(VH.segmented(
        RANGES.map(function (r) { return { value: r.value, label: r.short, title: r.label }; }),
        state.range,
        function (v) { state.range = v; render(); },
        'Laikotarpis'
      ));
    }

    /* Navigacijos aktyvumas */
    U.qsa('.nav__item').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.view === state.view);
      if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    /* Turinys */
    var main = U.clear(U.qs('#main'));
    main.appendChild(view.render(state));

    Chart.hideTip();
    closeNav();
    requestAnimationFrame(function () { Chart.resizeAll(); });
  }

  function rerender() { render(); }

  /* --- Pranešimai (trumpas burbulas apačioje) --------------------------------- */

  var toastTimer = null;
  function toast(text) {
    var node = U.qs('#toast');
    if (!node) {
      node = el('div', { id: 'toast' });
      Object.assign(node.style, {
        position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
        padding: '10px 16px', borderRadius: 'var(--r-pill)',
        background: 'var(--surface-3)', border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-2)', fontSize: '12.5px', zIndex: '95',
        opacity: '0', transition: 'opacity .15s ease', pointerEvents: 'none'
      });
      document.body.appendChild(node);
    }
    node.textContent = text;
    requestAnimationFrame(function () { node.style.opacity = '1'; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.style.opacity = '0'; }, 2600);
  }

  /* --- Šoninis meniu mažuose ekranuose ----------------------------------------- */

  function openNav() {
    U.qs('#sidebar').classList.add('is-open');
    U.qs('#scrim').hidden = false;
  }
  function closeNav() {
    U.qs('#sidebar').classList.remove('is-open');
    U.qs('#scrim').hidden = true;
  }

  /* --- Paleidimas -------------------------------------------------------------- */

  function init() {
    setTheme(U.store.get('theme', 'dark'));

    U.qs('#themeToggle').addEventListener('click', function () {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    U.qs('#navOpen').addEventListener('click', openNav);
    U.qs('#navClose').addEventListener('click', closeNav);
    U.qs('#scrim').addEventListener('click', closeNav);

    window.addEventListener('hashchange', navigate);
    window.addEventListener('pointermove', function (e) { Chart.positionTip(e); }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeNav(); Chart.hideTip(); }
      /* 1–6 greitas šuolis tarp skirtukų, kai fokusas ne laukelyje */
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/^[1-6]$/.test(e.key) && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        location.hash = '#/' + ORDER[Number(e.key) - 1];
      }
    });

    /* Šoninės juostos ženkliukai */
    var total = Data.totals(Data.range(30));
    U.qs('#navBadgeOverview').textContent = U.compact(total.tokensTotal, 0);
    U.qs('#navBadgePatch').textContent = LoL.current.version;
    U.qs('#footStamp').textContent = 'Duomenys iki ' + U.fullDate(U.iso(U.TODAY));

    navigate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    RANGES: RANGES,
    state: state,
    setTheme: setTheme,
    rerender: rerender,
    toast: toast
  };
})();
