# Skydas — Claude & League of Legends kontrolės skydas

Tamsaus režimo analitikos skydas su šešiais skirtukais: keturi skirti Claude
paskyros naudojimo statistikai, vienas — League of Legends metai, vienas —
nustatymams.

Viskas parašyta grynu HTML / CSS / JavaScript. **Jokių bibliotekų, jokių
build'o žingsnių, jokių CDN** — visi grafikai yra savos SVG komponentės
(`assets/js/charts.js`), todėl svetainė veikia ir visiškai neprisijungus.

---

## Paleidimas

Užtenka atidaryti `index.html` naršyklėje.

Jei nori vietinio serverio (rekomenduojama — taip veikia ir CSV eksportas):

```bash
python3 -m http.server 8000
# atidaryk http://localhost:8000
```

---

## Publikavimas per GitHub Pages

Workflow'as (`.github/workflows/pages.yml`) jau paruoštas. Lieka **vienas
vienkartinis žingsnis, kurį gali padaryti tik repo savininkas**:

1. **Settings → Pages**
2. **Build and deployment → Source** → pasirink **GitHub Actions**
3. Eik į **Actions → Deploy to GitHub Pages** ir paspausk **Re-run jobs**
   ties paskutiniu paleidimu (arba **Run workflow**)

Pats workflow'as Pages įjungti negali: `GITHUB_TOKEN` neturi admin teisių,
todėl `enablement: true` grąžina „Resource not accessible by integration".

Įjungus, kiekvienas push'as į šaką svetainę atnaujina automatiškai. Eigą
matysi **Actions** skirtuke, o nuoroda bus:

```
https://jonizs.github.io/InformatikosPamokosKaiNeraKaVeiktiZjbs-/
```

Deploy'ą galima paleisti ir ranka: **Actions → Deploy to GitHub Pages →
Run workflow**.

> Repozitorija yra vieša, tad ir svetainė bus vieša.

Jei kada prireiktų seno būdo be Actions, veiks ir **Source: Deploy from a
branch**, pasirinkus šią šaką ir šakninį (`/`) katalogą — visi keliai
projekte reliatyvūs, tad svetainė veikia ir iš podėlio
`/<repo-pavadinimas>/`. Failas `.nojekyll` išjungia Jekyll apdorojimą, kad
šis nieko nepraleistų.

---

## Skirtukai

| # | Skirtukas | Kas viduje |
|---|-----------|------------|
| 1 | **Apžvalga** | Herojinis žetonų skaičius, KPI plytelės su sparklainais, dienos žetonų kreivė, žetonų sudėtis (podėlis vs įvestis/išvestis), daugiausiai dirbti projektai, modelių pasiskirstymas, aktyvumo kalendorius, karščiausios dienos, sesijų juosta |
| 2 | **League of Legends** | Pataisų istorija (akordeonas su buff/nerf/adjust ženklais), pataisos poveikio žiedas, Emerald+ didžiausio winrate čempionai, kilėjai ir kritėjai, winrate × pickrate sklaida, pilna rikiuojama čempionų lentelė su paieška, meta judėjimas per 6 pataisas |
| 3 | **Projektai** | Dėmesio pasiskirstymas per laiką (sukrauti stulpeliai), rikiuojama projektų lentelė, kalbų pasiskirstymas, vieno projekto kreivė |
| 4 | **Modeliai ir kaštai** | Kaštai per laiką pagal modelį, kaupiamieji kaštai, modelių palyginimo lentelė, naudojami tarifai, žetonų tipai pagal modelį |
| 5 | **Aktyvumas** | Savaitės diena × valanda šilumos matrica, savaitės dienų suvestinė, paros kreivė, aktyvumo kalendorius, serijos ir pertraukos, dienos intensyvumo sklaida |
| 6 | **Nustatymai** | Tema, numatytasis laikotarpis, pradinis skirtukas, kainų tarifai, duomenų šaltinių instrukcijos, CSV/JSON eksportas |

---

## Duomenys

> **Svarbu: šiuo metu rodomi demo duomenys.**
>
> Claude statistika generuojama vietoje determinuotu sėkliniu generatoriumi
> (`assets/js/data/claude-data.js`), o LoL pataisos ir winrate skaičiai yra
> ranka sudėtas pavyzdinis rinkinys (`assets/js/data/lol-data.js`).
> Jie **nėra** gyva Riot ar Claude statistika. Taip padaryta tam, kad skydas
> veiktų be jokio serverio ir be API raktų.

Kainos taip pat yra **prielaida**: skydas nežino tavo tikrų įkainių, todėl
skaičiuoja pagal „Nustatymuose" įrašytus tarifus. Pakeitus juos, visi kaštai
persiskaičiuoja.

### Realių duomenų prijungimas

Visi rodiniai skaito tik `Data` ir `LoL` API, todėl pakanka pakeisti po vieną
funkciją — nė vienos kortelės perrašinėti nereikia.

```js
// Claude statistika — masyvas, viena eilutė per dieną
Data.load(fetch('/mano-statistika.json').then(r => r.json()))
    .then(() => App.rerender());

// LoL — { patches: [...], champions: [...] }
LoL.load(fetch('/lol.json').then(r => r.json()))
   .then(() => App.rerender());
```

Tikslios laukų struktūros parodytos „Nustatymų" skirtuke.

Čempionų paveikslėliai imami iš Riot Data Dragon CDN. Jei jie neužsikrauna
(nėra interneto, blokuoja tinklas), lieka inicialų plytelės — svetainė
nesulūžta.

---

## Kodo struktūra

```
index.html                     karkasas: šoninė juosta, viršutinė juosta, turinio vieta
assets/css/app.css             dizaino sistema: žetonai, komponentės, adaptyvumas
assets/js/util.js              formatavimas (lt-LT), datos, sėklinis RNG, localStorage
assets/js/charts.js            SVG grafikų biblioteka + patarimų burbulai + lentelių dvyniai
assets/js/data/claude-data.js  Claude duomenų sluoksnis ir užklausos
assets/js/data/lol-data.js     LoL pataisos ir čempionų statistika
assets/js/views/shared.js      bendri rodinių blokai (plytelės, antraštės, filtrai)
assets/js/views/*.js           po vieną failą kiekvienam skirtukui
assets/js/app.js               maršrutizavimas (#/hash), būsena, tema
.github/workflows/pages.yml    automatinis publikavimas į GitHub Pages
.nojekyll                      išjungia Jekyll apdorojimą Pages'e
```

Naujas skirtukas pridedamas taip: sukuriamas `Views.vardas = { title, sub,
needsRange, render(state) }`, failas įtraukiamas į `index.html`, o `vardas`
įrašomas į `ORDER` masyvą `app.js` faile.

---

## Dizaino taisyklės

Grafikai laikosi kelių griežtų taisyklių, kad niekada nemeluotų:

- **Viena y ašis.** Jokių dvigubų skalių — jos išgalvoja koreliaciją.
- **Stulpeliai auga nuo nulio.** Kur svarbus nuokrypis (pvz., winrate prieš
  50 %), naudojama diverguojanti forma su tikra nuline baze, o ne nukirpta ašis.
  Priartinta ašis leidžiama tik tendencijų linijoms ir tai pasakoma antraštėje.
- **Spalva seka objektą, ne reitingą.** Filtruojant likusieji nepersidažo.
- **Daugiausiai 8 kategorinės spalvos**, uodega suvyniojama į pilką „Kita";
  devinta spalva niekada negeneruojama.
- **Būsenos spalva niekada viena.** Buff / nerf / adjust visada turi ir ženklą.
- **Kiekvienas grafikas turi lentelės dvynį** — mygtukas „Lentelė" kortelės
  kampe parodo tas pačias reikšmes tekstu.
- **Plonos žymos:** 2 px linijos, ≤24 px stulpeliai, 4 px apvalintas duomenų
  galas, 2 px paviršiaus tarpas tarp segmentų (ne apvadas), plaukų linijos
  tinklelis.

Paletė patikrinta spalvų aklumo (CVD) ir kontrasto testais tamsiam paviršiui
`#16161a` ir šviesiam `#fcfcfb`.

---

## Klaviatūra ir prieinamumas

- `1`–`6` — greitas šuolis tarp skirtukų
- `Esc` — uždaro meniu ir patarimų burbulą
- Praleidimo nuoroda į turinį, `aria-current`, `aria-sort`, `role="switch"`
- Gerbiamas `prefers-reduced-motion`
- Veikia be pelės: kiekviena reikšmė pasiekiama ir per lentelės rodinį
