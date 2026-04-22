# Loep — Vlaams nieuws- en dataoverzicht

> Eén tabblad, één oogopslag: het belangrijkste Vlaamse nieuws plus een reeks publieke databronnen die journalisten (en nieuwsgierige burgers) graag in de gaten houden.

**Live:** [loep.info](https://loep.info)

Loep bundelt Vlaamse nieuwskoppen, Google Trends, files, beurs, vliegtuigen boven België, luchtkwaliteit, energiemix, treinstoringen en live-TV in één overzichtelijk dashboard. Alles draait in je browser — er is geen server, geen account en geen tracking.

---

## Waarvoor is dit bedoeld?

Redacties en onderzoeksjournalisten schakelen de hele dag tussen tien tabbladen: de homepage van VRT NWS, de filemeter, een aandelenticker, Flightradar, een trein-app, een luchtkwaliteitskaart... Loep legt die losse signalen naast elkaar, zodat je met één blik ziet wat er leeft — en of er ergens iets ongewoons gebeurt.

Geen persoonlijke feed, geen algoritme dat voor jou kiest. Gewoon de publieke stromen, rauw en naast elkaar.

---

## Wat zie je in één blik?

**Bovenaan (pagina 1) — het nieuws**

- Koppen van zes Vlaamse bronnen: VRT NWS, Het Laatste Nieuws, De Morgen, De Tijd, De Standaard en Het Nieuwsblad
- Loep herkent automatisch wanneer meerdere kranten hetzelfde Belga-bericht brengen en groepeert ze onder één kop ("+3 bronnen")
- Een lijst van terugkerende woorden van het uur (trending)
- Google Trends Vlaanderen — wat zoekt Vlaanderen nú
- Filezwaarte op de Vlaamse wegen, rechtstreeks van het Verkeerscentrum
- De BEL20-beursindex met een mini-grafiek van de dag
- Een zoekveld dat door alle titels en samenvattingen gaat

**Eronder (pagina 2) — de data**

- Alle twintig aandelen van de BEL20, gesorteerd op wie het meest beweegt vandaag
- Een live kaart van alle vliegtuigen boven België en de buurlanden, met kleurcode per type (lijnvlucht, cargo, militair, helikopter, privé) en de vlag van het registratieland
- Een laag fijnstofmetingen (PM2.5) over diezelfde kaart, met de officiële kleurschaal van IRCEL
- De Belgische elektriciteitsmix van dit moment: hoeveel kern, gas, wind, zon, water, import en export
- De status van het spoornet: aantal ritten, gemiddelde vertraging, actieve storingen

**Onderaan, altijd zichtbaar**

Een balkje met acht livestreams — CBS News, Al Jazeera, Euronews, HLN, LN24, BX1, ATV en TVL — gedempt tot je op één klikt, dan opent hij groot met geluid.

---

## Hoe vers is de data?

Loep haalt alles live op bij de bron, op verschillende tempo's:

| Wat | Hoe vaak ververst |
|-----|-------------------|
| RSS-nieuwsfeeds | elke 5 minuten |
| Google Trends | elke 5 minuten |
| Verkeerscentrum | elke 5 minuten |
| BEL20 (index en aandelen) | elke 2 minuten |
| Vluchten (ADS-B) | elke 12 seconden |
| Fijnstof (IRCEL) | elke 5 minuten (bron werkt uurlijks) |
| Energiemix (Elia) | elke 5 minuten |
| NMBS / iRail | elke 2 minuten |

Een paar eerlijkheden:

- De BEL20-data komt van Yahoo Finance en heeft ongeveer **15 minuten vertraging** op de echte Euronext-koers. Dat is zo bij alle gratis bronnen.
- De Elia-energiedata loopt **15 à 30 minuten** achter op real time.
- De fijnstofmetingen worden **maar één keer per uur** bijgewerkt door IRCEL zelf.
- De vluchtdata is zo goed als live (ADS-B-ontvangers uit de ADSB.lol-community).

Artikelen ouder dan **24 uur** worden niet getoond. Loep is een hier-en-nu-dashboard, geen archief.

---

## Waarom sommige bronnen ontbreken

Een paar bronnen die je misschien verwacht, zitten er niet in — meestal om technische redenen buiten mijn macht:

- **VTM NWS, VRT 1, Canvas, Ketnet:** de livestreams zijn DRM-beveiligd (Widevine), wat wil zeggen dat ze alleen afspelen via officiële spelers.
- **De Standaard en Het Nieuwsblad:** beide Mediahuis-kranten hebben wél RSS-feeds, maar die worden afgeschermd door Cloudflare. Als tijdelijke oplossing haalt Loep hun koppen via Google News. Nadeel: de volgorde is niet strikt chronologisch en je klikt door via een Google-tussenstap. Deze twee staan daarom standaard **uit** — klik de toggles in de kop aan om ze te activeren.
- **CNN, VTM Live, RTL TVI:** technische blokkades (versleutelde streams, offline servers, of gewoon testbeeld buiten uitzenduren).

---

## Privacy

- Geen cookies
- Geen trackingpixels, geen analytics die je over het web volgen
- Geen account nodig
- Je leesgeschiedenis blijft in je eigen browser (alleen een cache van de laatste feed, zodat het dashboard ook werkt als je even offline bent)

De site gebruikt [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) voor eenvoudige bezoekersaantallen — zonder cookies en zonder individuele profielen. Meer details: [Privacyverklaring](https://loep.info/privacy.html).

---

## Hoe is Loep gebouwd?

Voor wie nieuwsgierig is naar de techniek — in mensentaal:

Loep is één enkel HTML-bestand. Geen app-store, geen server, geen database. Als je de pagina opent, downloadt je browser dat ene bestand en doet vanaf dan zélf alle werk: koppen ophalen, filteren, groeperen, tekenen. Alles gebeurt in jouw tabblad.

Dat heeft voordelen én beperkingen:

- **Snel en privé** — niemand zit tussen jou en de bronnen in, dus niemand kan meelezen wat je bekijkt.
- **Werkt offline** — eens geladen onthoudt Loep de laatste nieuwskoppen in je browser, zodat je iets te zien hebt zelfs als je even geen internet hebt.
- **Geen magie** — Loep kan niet méér dan wat de publieke bronnen zélf aanbieden. Als de VRT hun RSS-feed stillegt, verdwijnen hun koppen hier ook.

De enige tussenpersoon is een klein "doorgeefluikje" (een Cloudflare Worker) dat sommige feeds omzeilt die weigeren rechtstreeks met een browser te praten. Dat doorgeefluik slaat niets op en heeft geen toegang tot wat je leest.

De volledige broncode staat hier op GitHub. De technische documentatie voor wie wil meesleutelen zit in [CLAUDE.md](CLAUDE.md).

---

## Kan ik meekijken of bijdragen?

Ja. Loep is open source. Een paar manieren:

- **Fouten melden of ideeën delen:** open een [issue op GitHub](https://github.com/brechtneven/loep-dashboard/issues)
- **Zelf prutsen:** clone de repo, open `index.html` in een browser of start een eenvoudige lokale server (`python3 -m http.server 8081`) en pas de code aan
- **Een eigen bron voorstellen:** elke toevoeging moet een publieke feed zijn zonder login

---

## Voor journalisten: praktische tips

- Loep is bedoeld als **signaaldetector**, niet als eindbron. Zie je iets opvallends op de vluchtkaart of een sprong op de filemeter? Check altijd bij de originele bron voor je publiceert.
- De dedup-functie ("+3 bronnen") is handig om snel te zien welke redacties een Belga-bericht overnemen — en welke een eigen verhaal brengen.
- De trendingwoorden zijn rauw en automatisch — eigennamen worden herkend via beginhoofdletter, dus een naam die alleen in kleine letters opduikt, wordt gemist.
- Koppelingen naar De Standaard en Het Nieuwsblad lopen (tijdelijk) via Google News. Voor citaten of referenties: klik door en controleer de originele URL.

---

## Licentie

Loep is vrije software onder de **[GNU General Public License v3.0](LICENSE)** (GPL-3.0).

In het kort: je mag Loep vrij gebruiken, bestuderen, aanpassen en verspreiden — op voorwaarde dat eventuele aangepaste versies óók onder dezelfde GPL-3.0-licentie worden gedeeld, met broncode. Het is geen "doe ermee wat je wilt"-licentie zoals MIT: wie Loep forkt en publiceert, moet de afgeleide versie ook openhouden. Zo blijft het project een gemeenschappelijk goed.

De volledige licentietekst staat in [LICENSE](LICENSE).

### Gebruikte bibliotheken van derden

Deze zitten als CDN-verwijzing in de pagina en behouden hun eigen licentie:

- **[hls.js](https://github.com/video-dev/hls.js)** — Apache License 2.0
- **[Leaflet](https://leafletjs.com)** — BSD 2-Clause
- **[CartoDB Dark Matter basemap](https://carto.com/attributions)** — Creative Commons BY 3.0 (attributie verplicht)
- **[OpenStreetMap-data](https://www.openstreetmap.org/copyright)** — Open Database License (ODbL)
- **[stopwords-iso/stopwords-nl](https://github.com/stopwords-iso/stopwords-nl)** — MIT
- **Google Fonts** (Source Serif 4, Inter) — SIL Open Font License 1.1

De data zelf (RSS-feeds, API-responses van VRT, HLN, Elia, iRail, IRCEL, Verkeerscentrum, ADSB.lol, Yahoo Finance, Google Trends) blijft eigendom van de respectievelijke bronnen en valt niet onder de GPL. Loep toont die data alleen — hij herverspreidt ze niet.

---

## Dankjewel

Dit project zou niet bestaan zonder de open data van:

- [ADSB.lol](https://adsb.lol) — community-netwerk van ADS-B-ontvangers
- [IRCEL-CELINE](https://irceline.be) — Belgisch Interregionaal Milieu­agentschap
- [Elia Open Data](https://opendata.elia.be) — Belgische hoogspanningsnetbeheerder
- [iRail](https://irail.be) — open spoorgegevens (vrijwilligers)
- [Verkeerscentrum Vlaanderen](https://verkeerscentrum.be) — realtime wegverkeer
- De RSS-feeds van VRT NWS, HLN, De Morgen en De Tijd
- [stopwords-iso/stopwords-nl](https://github.com/stopwords-iso/stopwords-nl) — Nederlandse stopwoordenlijst

Gebouwd door [Brecht Neven](https://github.com/brechtneven). Vragen, tips of suggesties? [brecht.neven@gmail.com](mailto:brecht.neven@gmail.com).
