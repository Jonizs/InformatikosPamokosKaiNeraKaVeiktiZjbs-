# Dashboard — Claude usage & League of Legends meta

A dark-mode analytics dashboard with six tabs: four for Claude account usage,
one for the League of Legends meta, one for settings.

Plain HTML, CSS and JavaScript. **No libraries, no build step, no CDN** — every
chart is a hand-rolled SVG component (`assets/js/charts.js`), so the site works
fully offline.

**Live:** https://jonizs.github.io/InformatikosPamokosKaiNeraKaVeiktiZjbs-/

---

## Running it

Open `index.html` in a browser.

For a local server (recommended — the CSV export needs it):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Publishing to GitHub Pages

`.github/workflows/pages.yml` is already set up. One-time step, repo owner only:

1. **Settings → Pages**
2. **Build and deployment → Source** → **GitHub Actions**
3. **Actions → Deploy to GitHub Pages → Run workflow**

After that every push to the branch redeploys automatically.

The workflow cannot enable Pages itself: `GITHUB_TOKEN` has no admin rights, so
`enablement: true` returns "Resource not accessible by integration".

`.nojekyll` stops Jekyll from skipping files. All paths are relative, so the
site also works from a `/<repo-name>/` sub-path.

---

## Tabs

| # | Tab | What's in it |
|---|-----|--------------|
| 1 | **Overview** | Hero token figure, KPI tiles with sparklines, daily token curve, token composition (cache vs input/output), most-worked projects, model split, activity calendar, hottest days, session feed |
| 2 | **League of Legends** | **Written patch analysis** (five numbered takes, watchlist, caveats), patch history accordion, patch-impact donut, Emerald+ win-rate leaders, risers and fallers, win rate × pick rate scatter, sortable searchable champion table, meta movement across six patches |
| 3 | **Projects** | Attention split over time (stacked bars), sortable project table, language split, single-project curve |
| 4 | **Models & cost** | Cost over time by model, cumulative cost, model comparison table, editable rates, token types by model |
| 5 | **Activity** | Weekday × hour heatmap, weekday rollup, hour-of-day curve, activity calendar, streaks and gaps, daily intensity scatter |
| 6 | **Settings** | Theme, default range, starting tab, pricing rates, data-source instructions, CSV/JSON export |

---

## Data

> **Important: this ships with demo data.**
>
> Claude statistics are generated locally by a deterministic seeded generator
> (`assets/js/data/claude-data.js`). The League patches and win rates are a
> hand-assembled illustrative set (`assets/js/data/lol-data.js`). Neither is a
> live Riot or Claude feed. This is deliberate: the dashboard runs with no
> server and no API keys.

Pricing is also an **assumption** — the dashboard has no access to your real
rates, so it computes costs from the values in Settings. Change them and every
figure recomputes.

### Using your own real usage

Claude Code writes a transcript of every session to
`~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`, and every assistant
record in it carries a real `usage` block — input tokens, output tokens, cache
reads and cache writes — plus a timestamp, the model and the working directory.

```bash
python3 tools/export-usage.py          # writes assets/data/usage.json
```

Reload the dashboard and it picks the file up automatically: the banner turns
green, the sidebar shows your date range, and every chart is drawing your own
numbers. Options: `--list` (preview only), `--days 90`, `--claude-dir`.

**It reads counts, never content.** The exporter touches only `timestamp`,
`sessionId`, `cwd`, `message.model` and `message.usage`. It never opens your
prompts, Claude's replies, file contents or tool output — see `_extract()` in
the script, which is the only place fields are read. The output is gitignored,
so it stays on your machine unless you force-add it.

**What it cannot cover:** claude.ai web and mobile chats, sessions on other
machines, and transcripts Claude Code has already pruned. There is no public
API that returns personal usage history for a Claude.ai subscription, so local
transcripts are the only real source available. (Anthropic *API* organisations
have `GET /v1/organizations/usage_report/messages` and `/cost_report`, but
those need an Admin API key and do not cover consumer subscriptions.)

**Two metrics stay blank on real data** — tool calls and lines changed. Both
would require reading message content, so the dashboard shows `—` rather than
inventing them.

**Cost on a subscription is hypothetical.** Your token counts are real, but a
Claude.ai plan is a flat fee. The cost figures show what that usage *would* have
cost at published API rates, labelled as such.

### Any other source

Every view reads the `Data` and `LoL` APIs and nothing else, so one function per
source is the whole integration:

```js
Data.load(fetch('/my-usage.json').then(r => r.json())).then(() => App.rerender());
LoL.load(fetch('/lol.json').then(r => r.json())).then(() => App.rerender());
```

`Data.load()` accepts either a bare `days` array or the full
`{ meta, models, projects, days }` payload the exporter writes. The exact field
shapes are printed in the Settings tab.

Champion portraits come from Riot's Data Dragon CDN. If they fail to load (no
network, blocked), initial tiles are shown instead — nothing breaks.

### About the patch analysis

The League tab includes a written read of the current patch. The *method* is the
one the community uses — win rate versus pick rate, ban-rate lag, one-trick
selection bias, and reading a patch arc rather than a single patch — applied to
the numbers in this repository. Because those numbers are the demo set, the
conclusions describe **this dataset**, not live solo queue. The card says so,
and a "What would make this wrong" panel lists the limits explicitly.

---

## Code layout

```
index.html                     shell: sidebar, topbar, content slot
assets/css/app.css             design system: tokens, components, responsive rules
assets/js/util.js              formatting (en-US), dates, seeded RNG, localStorage
assets/js/charts.js            SVG chart library + tooltips + table twins
assets/js/data/claude-data.js  Claude data layer and queries
assets/js/data/lol-data.js     League patches, champion stats, patch analysis
assets/js/views/shared.js      shared view blocks (tiles, headings, filters)
assets/js/views/*.js           one file per tab
assets/js/app.js               routing (#/hash), state, theme, real-data loading
tools/export-usage.py          rolls your local Claude Code transcripts into usage.json
assets/data/usage.json         your export (gitignored — private by default)
.github/workflows/pages.yml    automatic GitHub Pages deployment
.nojekyll                      disables Jekyll processing on Pages
```

To add a tab: create `Views.name = { title, sub, needsRange, render(state) }`,
add the file to `index.html`, and add `name` to the `ORDER` array in `app.js`.

---

## Chart rules

The charts follow a few strict rules so they never mislead:

- **One y axis.** Never a dual scale — it invents correlations.
- **Bars grow from zero.** Where the deviation is the point (win rate against
  50%), a diverging form with a real zero baseline is used instead of a
  truncated axis. A zoomed axis is allowed only on trend lines, and the caption
  says so.
- **Colour follows the entity, not its rank.** Filtering never repaints the
  survivors.
- **At most 8 categorical colours**, with the tail folded into a grey "Other";
  a ninth hue is never generated.
- **Status colour never travels alone.** Buff / nerf / adjust always carry a
  glyph as well.
- **Every chart has a table twin** — the "Table" button in the card corner
  shows the same values as text.
- **Thin marks:** 2px lines, ≤24px bars, 4px rounded data-ends, a 2px surface
  gap between segments (never a border), hairline gridlines.

The palette was validated for colour-blind separation and contrast against both
the dark surface `#16161a` and the light surface `#fcfcfb`.

---

## Keyboard and accessibility

- `1`–`6` — jump between tabs
- `Esc` — close the menu and any tooltip
- Skip link, `aria-current`, `aria-sort`, `role="switch"`
- Respects `prefers-reduced-motion`
- Works without a pointer: every value is also reachable through a table view
