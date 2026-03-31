# OSINT Nieuwsdashboard

Modulair OSINT-nieuwsdashboard voor Vlaamse onderzoeksjournalisten. Eén enkel HTML-bestand, geen build-stap, geen backend.

## Architectuur

```
index.html          Volledige applicatie (HTML + CSS + JS)
.claude/
  launch.json       Dev-serverconfiguratie (python3 http.server :8081)
```

Het project draait als **single-file applicatie**. Alle logica zit in `<script>` en `<style>` blokken in `index.html`. Dit is een bewuste keuze: het bestand moet offline werken na eerste load en direct deelbaar zijn zonder tooling.

## Dataflow

```
RSS feeds (VRT, HLN, De Morgen, DT, DS*, HNB*)
        │
        ▼
corsproxy.io (CORS proxy, geeft ruwe XML terug — geen caching)
        │
        ▼
parseXMLFeed() — DOMParser verwerkt RSS 2.0 én Atom
        │
        ▼
fetchFeed() per bron → genormaliseerde article-objecten
        │
        ▼
fetchAllFeeds() → Promise.allSettled → samengevoegd array
        │
        ├──▶ localStorage cache (osint_feed_cache)
        │
        ▼
render() pipeline:
  0. Tijdfilter (artikelen ouder dan 24 uur worden weggegooid)
  1. Filter (actieve bronnen, zoekquery)
  2. Sorteer (nieuwste eerst)
  3. Deduplicatie (woordoverlap-groepering)
  4. HTML-generatie (string concatenation, innerHTML)
  5. Sidebar-updates (trending, betrouwbaarheid)

Google Trends RSS (trends.google.com/trending/rss?geo=BE-VLG)
        │
        ▼
allorigins.win (primair) / rss2json.com (fallback)
        │
        ▼
fetchGoogleTrends() → top 10 trending topics + verkeersindicator
        │
        ▼
Sidebar sectie "Google Trends Vlaanderen", verversing elke 5 min

Verkeerscentrum.be DATEX II (verkeerscentrum.be/uitwisseling/datex2v3)
        │
        ▼
Direct fetch (geen proxy nodig — CORS open)
        │
        ▼
fetchVerkeer() → XML parsing → incidenten + totale filezwaarte
        │
        ▼
Sidebar sectie "Verkeer Vlaanderen", verversing elke 5 min

ADSB.lol API (luchtverkeer boven België)
        │
        ▼
fetchFlights() — direct fetch, fallback via corsproxy.io
        │
        ▼
renderFlights() → Leaflet markers (divIcon SVG-pijltjes, roteren op track)
        │
        ▼
Kaart onderaan tweede pagina (onder BEL20-aandelen), verversing elke 12s

Yahoo Finance API (BEL20 / ^BFX)
        │
        ▼
corsproxy.io → JSON (intraday 5m intervallen)
        │
        ▼
fetchBel20() → stats strip (waarde + %) + drawBel20Sparkline() → sidebar canvas

HLS livestreams (CONFIG.streams[])
        │
        ▼
hls.js (CDN) → <video> elementen in stream bar
        │
        ├──▶ Stream bar: gedempt, autoplay, 8 kanalen naast elkaar
        │
        ▼
Klik → modal overlay met grotere player + geluid aan
```

## Kernalgoritmen

### Deduplicatie (regels ~633–671)

Vlaamse media nemen vaak hetzelfde Belga-bericht over met kleine titelvariaties. Het systeem groepeert deze artikelen zodat de feed niet vol duplicaten staat.

**Hoe het werkt:**

1. **`normalizeText(text)`** — lowercase, strip leestekens, behoud diakritische tekens (é, ë, etc.)
2. **`similarity(a, b)`** — Jaccard-achtige set-overlap:
   - Splits beide koppen in woordsets
   - Tel overlappende woorden
   - Score = `|A ∩ B| / max(|A|, |B|)`
   - Gebruik `max` i.p.v. `union` (standaard Jaccard) om korte koppen niet te benadelen
3. **`deduplicateArticles(articles)`** — greedy single-pass groepering:
   - Loop chronologisch door de gesorteerde lijst
   - Vergelijk elke niet-toegewezen kop met alle volgende
   - Score ≥ `CONFIG.dedupThreshold` (0.55) → zelfde groep
   - Eerste artikel (recentste) wordt primair getoond
   - Overige bronnen zichtbaar via "+N bronnen" klik

**Bekende beperkingen:**
- Geen synoniemherkenning ("belooft" vs. "zegt" telt niet als match)
- Greedy toewijzing: artikel wordt aan de eerste match toegewezen, niet aan de beste
- O(n²) complexiteit — acceptabel voor de ~30 artikelen die RSS-feeds opleveren

**Drempel afstemmen:** `CONFIG.dedupThreshold` in het CONFIG-object. Lager (bv. 0.40) = agressiever samenvoegen, meer false positives. Hoger (bv. 0.70) = conservatiever, meer losse duplicaten.

### Trending-extractie (regels ~673–712)

Signaleert terugkerende onderwerpen in de recentste 50 artikelen, volledig client-side.

1. Combineer titel + samenvatting per artikel
2. Splits op witruimte en leestekens
3. Filter: woorden < 3 tekens, Nederlandse stopwoorden (`CONFIG.stopWords`), pure cijfers
   - Stopwoordenlijst gebaseerd op [stopwords-iso/stopwords-nl](https://github.com/stopwords-iso/stopwords-nl) (MIT) — ~545 woorden. Geen eigen aanvullingen.
4. Detecteer eigennamen via beginhoofdletter (heuristisch)
5. Merge hoofdletter-/kleine-lettervarianten, behoud de gekapitaliseerde versie als weergave
6. Sorteer op frequentie, toon top 20 met minimum 2 voorkomens

### Google Trends Vlaanderen

Toont de top 10 trending zoekterms op Google in de Vlaamse regio, met een visuele verkeers­indicator per trend.

**Databron:** Google Trends RSS feed (`trends.google.com/trending/rss?geo=BE-VLG`).

**Proxy-strategie:** Primair via allorigins.win (geeft traffic-data mee), fallback naar rss2json.com (alleen titels). De proxy is nodig voor CORS.

**Weergave:** Sidebar sectie "Google Trends Vlaanderen" — elke trending term op een rij met een horizontale balk die de relatieve populariteit weergeeft (schaal 0–max van de set).

**Verversing:** elke 5 minuten, gekoppeld aan de RSS-refresh.

### Verkeer Vlaanderen (DATEX II)

Toont de actuele filedruk op Vlaamse wegen via het officiële DATEX II-protocol van het Verkeerscentrum.

**Databron:** `https://www.verkeerscentrum.be/uitwisseling/datex2v3` — publieke XML-feed, geen API key nodig, geen CORS-blokkade.

**Verwerking:** `fetchVerkeer()` parsed de XML rechtstreeks met DOMParser. Extraheert incidenten (type, locatie, beschrijving) en totaliseert de filelengte in kilometers.

**Weergave:** Sidebar sectie "Verkeer Vlaanderen":
- Totale filezwaarte in km op een balk (schaal 0–300 km, verzadigt op 100%)
- Aantal actieve incidenten
- Filenaam en locatie per incident

**Verversing:** elke 5 minuten.

### BEL20-beursdata

Toont de huidige BEL20-indexwaarde, dagwijziging (%) en een intraday sparkline-grafiek.

**Databron:** Yahoo Finance chart API (`/v8/finance/chart/%5EBFX?interval=5m&range=1d`) via corsproxy.io. Cache-buster (`_cb=timestamp`) voorkomt gecachte proxy-responses. Geeft JSON terug met intraday koersen (5-minuutintervallen) en metadata (regularMarketPrice, chartPreviousClose).

**Bekende vertraging:** Yahoo Finance gratis tier levert Euronext-data met ~15 minuten delay. Dit is niet te verbeteren zonder betaalde real-time datafeed.

**Weergave:**
- **Stats strip** (rechts, `margin-left: auto`): BEL20 label + huidige waarde + wijzigingspercentage met pijltje (▲/▼). Kleur: `--sage` bij stijging, `--coral` bij daling. Linkt naar Google Finance (`/finance/quote/BEL20:INDEXEURO`).
- **Sidebar** (bovenste sectie "BEL20 Intraday"): canvas sparkline over volle breedte. Lijn + gradient-fill, kleur volgt stijging/daling. Getekend via `drawBel20Sparkline()` op een `<canvas>` element dat dynamisch schaalt naar de containerbreedte (via `getBoundingClientRect()`). HiDPI-ondersteuning via `devicePixelRatio`.

**Verversing:** eigen interval van 2 minuten (losgekoppeld van de 5-minuten RSS-refresh).

### BEL20 Aandelen (tweede pagina)

Toont alle 20 componenten van de BEL20-index op de tweede pagina, gesorteerd op absolute dagwijziging (hoogste volatiliteit eerst).

**Databron:** Yahoo Finance spark API (`/v8/finance/spark?symbols=...&interval=5m&range=1d`) via corsproxy.io. Alle 20 symbolen worden in één request opgehaald.

**Samenstelling BEL20 (geverifieerd 2026-03-27):** AB InBev, Ageas, Aperam, arGEN-X, Cofinimmo, Colruyt, D'Ieteren, Elia, Galapagos, GBL, KBC, Proximus, Sofina, Solvay, Syensqo, Umicore, UCB, VGP, WDP, Warehouses De Pauw.

**Weergave:** Grid-layout, elke cel toont ticker, naam, huidige koers, dagwijziging (%), en een mini-sparkline. Rood bij daling, groen bij stijging.

**Verversing:** elke 2 minuten, samen met BEL20-index.

### Vluchtkaart (ADSB.lol)

Live kaart van België met alle vliegtuigen die er op dat moment overvliegen. Gepositioneerd onderaan de tweede pagina (onder BEL20-aandelen), gecentreerd op max-width 900px.

**Technologie:** Leaflet 1.9.4 (via `cdn.jsdelivr.net`) met CartoDB Dark Matter tiles. Vliegtuigen worden weergegeven als SVG-pijltjes (`divIcon`) in `--teal` kleur die roteren op basis van het `track`-veld (koers in graden). Hover-tooltip toont callsign · vliegtuigtype · hoogte in ft · snelheid in kts.

**Databron:** ADSB.lol community ADS-B aggregator — gratis, geen API key.
```
https://api.adsb.lol/v2/lat/50.85/lon/4.35/dist/150
```
150 nautische mijl radius rond Brussel — dekt heel België plus directe buurlanden.

**CORS-aanpak:** De API stuurt geen `access-control-allow-origin` header vanuit de browser. `fetchFlights()` probeert eerst direct, valt bij fout terug op corsproxy.io. Beide paden leveren hetzelfde JSON-formaat.

**Lazy initialisatie:** De Leaflet-kaart wordt pas aangemaakt op het eerste scroll-event (`applyOffset()`), niet bij `init()`. Dit voorkomt dat Leaflet initialiseert met een container die nog buiten het `overflow:hidden` viewport valt (en dan een grootte van 0×0 zou rapporteren). Na initialisatie volgt onmiddellijk een `requestAnimationFrame` met `invalidateSize()` zodat tiles correct laden.

**Verversing:** eigen interval van 12 seconden. Vliegtuigen die verdwijnen uit de API-response worden direct van de kaart verwijderd.

**Relevante velden per vliegtuig (ADSB.lol JSON):**

| Veld | Betekenis |
|------|-----------|
| `lat`, `lon` | Positie |
| `track` | Koers in graden (0 = noord) — gebruikt voor rotatie icon |
| `alt_baro` / `alt_geom` | Hoogte in feet |
| `gs` | Grondsnelheid in knots |
| `flight` | Callsign (bijv. `BAW123`) |
| `t` | ICAO vliegtuigtype (bijv. `A320`) |
| `hex` | ICAO hex-adres — gebruikt als marker-ID |

### Livestream bar

Vaste balk (140px) onderaan het scherm met live TV-streams, OSINT-dashboardstijl.

**Technologie:** hls.js (via CDN `cdn.jsdelivr.net/npm/hls.js@latest`) voor HLS-playback in alle browsers. Safari gebruikt native HLS als fallback. Streams worden afgespeeld via `<video>` elementen (geen iframes).

**Gedrag:**
- Streams starten automatisch **gedempt** (`muted=true, autoplay=true, playsInline=true`)
- Klik op een kanaal → modal overlay met grotere player, **geluid aan**, native browser controls
- Modal sluit via "Sluiten" knop, klik buiten de modal, of Escape-toets
- hls.js config: `maxBufferLength: 10, maxMaxBufferLength: 20` voor lager geheugengebruik
- AES-128 key requests worden via corsproxy.io geproxied (`xhrSetup`) voor streams die CORS-beperkingen op keys hebben

**Streams** (geconfigureerd in `CONFIG.streams[]`, volgorde: internationaal → nationaal → regionaal):

| Kanaal | HLS URL | Type |
|--------|---------|------|
| CBS News | `cbsn-us.cbsnstream.cbsnews.com/.../master.m3u8` | Internationaal |
| Al Jazeera | `live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8` | Internationaal |
| Euronews | `dash4.antik.sk/live/test_euronews/playlist.m3u8` | Internationaal |
| HLN Live | `live-streaming.dpgmedia.net/hln-live-.../index_720.m3u8` | Belgisch-nationaal |
| LN24 | `live-ln24.digiteka.com/1911668011/index.m3u8` | Belgisch-nationaal |
| BX1 | `59959724487e3.streamlock.net/stream/live/playlist.m3u8` | Belgisch-nationaal |
| ATV | `live.zendzend.com/cmaf/29375_107244/master.m3u8` | Vlaams-regionaal (Antwerpen) |
| TVL | `live.zendzend.com/cmaf/29375_395474/master.m3u8` | Vlaams-regionaal (Limburg) |

**Stream toevoegen:** voeg een object toe aan `CONFIG.streams[]` met `name`, `hlsUrl`, en `siteUrl`. Vereisten: publieke HLS-stream (m3u8), open CORS (`access-control-allow-origin: *`), geen DRM/AES-encryptie (of keys bereikbaar via CORS proxy).

**Onderzochte maar niet-werkende streams (2026-03-26):**
- VRT1/Canvas/Ketnet — DRM-beveiligd (Vualto/Widevine), tokens vereist
- CNN — AES-128 keys CORS-beperkt tot `streamfare.com`, proxy geblokkeerd door Akamai
- VTM/VTM NWS — medialaancdn.be streams offline
- HLN Live — dpg-eventstreams 400 error
- RTL TVI — stream werkt technisch maar toont testbeeld buiten uitzenduren

### Breaking-detectie (uitgeschakeld)

Voorlopig uitgeschakeld (2026-03-26). Was: simpele tijdcontrole `Date.now() - article.timestamp < CONFIG.breakingThreshold` (30 min) → rode badge + border. Uitgeschakeld omdat Google News-feeds onbetrouwbare timestamps hebben, waardoor bijna alle artikelen als "breaking" geclassificeerd werden. CSS-klassen (`.breaking-tag`, `.breaking-article`) bestaan nog maar worden niet meer toegepast. Kan later opnieuw geactiveerd worden.

## RSS-bronnen en proxy

| Bron | URL | Formaat | Proxy |
|------|-----|---------|-------|
| VRT NWS | `vrt.be/vrtnws/nl.rss.articles.xml` | Atom | corsproxy.io |
| HLN | `hln.be/rss.xml` | RSS 2.0 | corsproxy.io |
| De Morgen | `demorgen.be/rss.xml` | RSS 2.0 | corsproxy.io |
| De Tijd | `tijd.be/rss/nieuws.xml` | RSS 2.0 | corsproxy.io |
| De Standaard | `news.google.com/rss/search?q=site:standaard.be&hl=nl&gl=BE&ceid=BE:nl` | RSS 2.0 | corsproxy.io (tijdelijke workaround via Google News) |
| Het Nieuwsblad | `news.google.com/rss/search?q=site:nieuwsblad.be&hl=nl&gl=BE&ceid=BE:nl` | RSS 2.0 | corsproxy.io (tijdelijke workaround via Google News) |

**Waarom corsproxy.io:** geeft feeds direct door zonder caching, zodat altijd de meest actuele artikelen getoond worden. De ruwe XML wordt client-side geparsed via `parseXMLFeed()` (DOMParser), die zowel RSS 2.0 als Atom aankan.

**Waarom niet rss2json.com:** cachet feeds tot ~1 uur, waardoor recente artikelen vertraagd binnenkomen. Vervangen op 2026-03-26.

**Waarom niet allorigins.win:** bleek onbetrouwbaar — lege responses, timeouts.

**De Tijd** heeft een werkende directe RSS-feed (`tijd.be/rss/nieuws.xml`, RSS 2.0) en is standaard ingeschakeld. Kleur: `--navy` (#5a6e8a).

**Google News RSS als tijdelijke workaround (2026-03-26):** De Standaard en Het Nieuwsblad zijn niet rechtstreeks bereikbaar (Cloudflare-blokkade — zie hieronder). Als workaround worden Google News RSS-feeds gebruikt (`site:standaard.be` / `site:nieuwsblad.be`). Titels worden opgeschoond (suffix " - De Standaard" / " - Nieuwsblad" verwijderd in `fetchFeed()`). Links gaan via Google News redirects — niet rechtstreeks naar de bron. Sortering is niet strikt chronologisch maar op Google News-relevantie. Kleuren: `--slate` (#6878a0) voor DS, `--bronze` (#a07858) voor HNB. **Standaard uitgeschakeld** — gebruiker moet DS/HNB handmatig activeren via de toggles in de header. Bij activatie verschijnt een toast-waarschuwing dat deze bronnen niet chronologisch zijn.

### De Standaard & Het Nieuwsblad — Cloudflare-blokkade (onderzocht 2026-03-26)

Beide kranten hebben **actieve RSS-feeds** op het nieuwe Mediahuis-platform:

| Krant | RSS-URL | Formaat | Generator |
|-------|---------|---------|-----------|
| De Standaard | `https://www.standaard.be/rss/` | RSS 2.0 | `mhbe-ds-online` |
| Het Nieuwsblad | `https://www.nieuwsblad.be/rss/` | RSS 2.0 | `mhbe-nb-online` |

De oude GUID-gebaseerde URL's (bv. `/rss/section/1f2838d4-...`) redirecten (302) naar de nieuwe `/rss/` URL. Het zijn "alle nieuws"-feeds, niet per sectie opgesplitst.

**Het probleem:** Cloudflare gebruikt een **harde WAF-blokkade** ("Attention Required!") — geen simpele JS-challenge maar een managed challenge / CAPTCHA. Zelfs headless browsers met stealth-maatregelen worden geblokkeerd.

**Geteste en gefaalde benaderingen:**

| Methode | Resultaat |
|---------|-----------|
| corsproxy.io | Geblokkeerd (403) |
| rss2json.com | "Cannot download this RSS feed" |
| allorigins.win | Geblokkeerd |
| Cloudflare Worker (simpele fetch) | 403 — harde WAF-blokkade |
| Cloudflare Browser Rendering (Puppeteer) | "Attention Required!" — harde blokkade, zelfs met stealth |
| Cloudflare Browser Rendering (Puppeteer + stealth) | Zelfde harde blokkade — webdriver-hiding, fake UA, plugins-spoofing helpen niet |
| Cloudflare Browser Rendering (REST API) | Endpoint niet beschikbaar via browser binding |
| Feedly API | Geen gratis API-toegang; vereist API-key in client-code |
| Feedspot API | Geen proxy-functie; API alleen voor eigen account-beheer |
| Open RSS | Zelfde Cloudflare-probleem (gedocumenteerd op openrss.org) |
| RSS-Bridge | Geen ingebouwde Cloudflare-bypass |
| morss.it | Geblokkeerd als proxy |
| RSSHub | Geen route voor DS/HNB; zelfde proxy-probleem |
| Google News RSS | Niet chronologisch genoeg voor real-time monitoring |

**Enige resterende oplossing:**

**Mediahuis aanschrijven** — vragen om Cloudflare Bot Fight Mode uit te schakelen voor `/rss/` paden. Eén WAF-regel. Dit is de enige realistische piste; alle technische workarounds zijn uitgeput.

**Nieuwe bron toevoegen:** voeg een entry toe aan `CONFIG.sources` met `name`, `url`, `reliability` (0–100), en `label`. Voeg een CSS-variabele en `.source-badge`/`.source-toggle`-regels toe voor de kleur. Voeg een toggle-knop toe in de HTML header.

## Persistentie (localStorage)

| Key | Inhoud |
|-----|--------|
| `osint_feed_cache` | `{ timestamp, articles[] }` — volledige feed-cache voor offline gebruik |

Artikel-ID's worden gegenereerd via een simpele string-hash (`hashString()`) van `sourceKey + title + link`.

## UI-structuur

```
┌───────────────────────────────────────────────────────────────────┐
│  HEADER: titel (Source Serif 4), status, zoekbalk, brontoggles   │
├───────────────────────────────────────────────────────────────────┤
│  STATS BAR: big-number callouts + BEL20 koers (rechts uitgelijnd) │
├──────────────────────────────────────────┬────────────────────────┤
│                                          │  SIDEBAR (sticky)      │
│  FEED (max-width 720px)                  │  - BEL20 Intraday      │
│  Artikelen gescheiden door witruimte     │  - Google Trends VL    │
│  en dunne horizontale lijnen             │  - Verkeer Vlaanderen  │
│                                          │  - Trending            │
│                                          │  - Bronbetrouwbaarheid │
├──────────────────────────────────────────┴────────────────────────┤
│  STREAM BAR (fixed bottom, 140px): LIVE label + 8 videostreams   │
└───────────────────────────────────────────────────────────────────┘
  ▲ progress bar (2px teal, fixed top)

── TWEEDE PAGINA (scrollen via stream bar of stocks) ───────────────
┌───────────────────────────────────────────────────────────────────┐
│  BEL20 AANDELEN: grid met alle 20 BEL20-componenten              │
├───────────────────────────────────────────────────────────────────┤
│  VLUCHTKAART (gecentreerd, max-width 900px, 480px hoog)          │
│  Leaflet + CartoDB Dark Matter · ADSB.lol · verversing 12s       │
└───────────────────────────────────────────────────────────────────┘
```

## Designsysteem

Datajournalistieke editorial stijl, geïnspireerd op The Pudding / FT / NYT.

### Typografie
- **Koppen:** Source Serif 4 (serif) via Google Fonts — `var(--font-title)`
- **Lopende tekst:** Georgia (serif) — `var(--font-body)`
- **Labels, data, UI:** Inter (sans-serif), system-ui als fallback — `var(--font-ui)`
- Sterke hiërarchie met genereus witruimte

### Kleurenpalet (gedempt/desaturated)
| Token | Hex | Toepassing |
|-------|-----|------------|
| `--coral` | #c0695e | VRT NWS badge |
| `--ochre` | #c4a35a | HLN badge |
| `--teal` | #457b7e | De Morgen badge, links, progress bar |
| `--sage` | #6b8f71 | Live-status dot, hoge betrouwbaarheid |
| `--slate` | #6878a0 | De Standaard badge |
| `--bronze` | #a07858 | Het Nieuwsblad badge |
| `--navy` | #5a6e8a | De Tijd badge |
| `--teal-dark` | #1e4d52 | Beschikbaar voor uitbreidingen |
| `--teal-light` | #7ab5b8 | Beschikbaar voor uitbreidingen |

### Achtergrond & tekst
- Achtergrond: off-white `#FAF9F6`
- Koppen: donkergrijs `#2B2B2B`
- Subtekst: `#555`
- Metadata/dim: `#888`
- Rasterlijnen: `#E0E0E0`

### Layout
- Content max-width: 900px (grafieken), feed max-width: 720px (leescomfort)
- Grid: `1fr 240px`
- Layout hoogte: `calc(100vh - 70px - 140px)` (ruimte voor header + stream bar)
- Geen card-achtergronden of borders rond secties — witruimte als scheiding
- Dunne bottom-border alleen op sidebar sectietitels (h3)

### Speciale elementen
- **Big-number callouts:** grote statistieken bovenaan (Source Serif 4, 36px)
- **Progress bar:** 2px teal, fixed top, scroll-gebaseerd
- **Scroll-reveal:** `.article` begint met `opacity:0; translateY(12px)`, krijgt `.reveal` via IntersectionObserver
- **Toast:** donkere achtergrond `rgba(43,43,43,0.90)`, geen border-radius
- **Zoekresultaat highlight:** `<mark>` met ochre achtergrond (25% opacity)

### Visuele hiërarchie per artikel
bronbadge → tijd → dedup-count → betrouwbaarheid% → kop (Source Serif) → samenvatting (Georgia)

## Configureerbare waarden (CONFIG-object)

| Sleutel | Standaard | Doel |
|---------|-----------|------|
| `refreshInterval` | 300000 (5 min) | Auto-refresh interval in ms |
| `dedupThreshold` | 0.55 | Minimale woordoverlap-score voor deduplicatie |
| `sources.*.reliability` | per bron | Betrouwbaarheidsscore (0–100) voor de sidebar |

**24-uur filter (hardcoded):** Artikelen ouder dan 24 uur worden vóór de render-stap gefilterd (`cutoff = Date.now() - 24 * 60 * 60 * 1000`). Dit is geen CONFIG-waarde maar een vaste drempel — toegevoegd omdat oudere artikelen de feed vervuilden bij bronnen die historische items in hun RSS bewaren.

## Uitgeschakelde features (2026-03-26)

- **Breaking-detectie** — uitgeschakeld wegens onbetrouwbare timestamps van Google News-feeds. CSS blijft aanwezig.
- **Markeren (flaggen) van artikelen** — volledig verwijderd (UI-knoppen, sidebar-sectie, localStorage `osint_flagged`, JS-functies `toggleFlag`, `toggleFlaggedFilter`, `renderFlagged`). Kan later opnieuw geïmplementeerd worden.
- **Exporteer-functie** — volledig verwijderd (`exportFlagged()`). Was gekoppeld aan de markeerfunctie.

## Conventies

- UI-taal is **Nederlands** (Vlaams)
- Geen externe JS-bibliotheken — alles vanilla (Google Fonts, hls.js en Leaflet.js als enige externe resources)
- HTML wordt opgebouwd via string-arrays (`html.push()`) en `innerHTML` — geen virtuele DOM
- Event handlers via inline `onclick` attributen voor eenvoud in een single-file context
- CSS custom properties voor alle kleuren en fonts — thema-aanpassing via `:root`
- Geen schaduwen, geen decoratie, geen border-radius — "less is more"
