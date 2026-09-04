# Bibleland

Die biblische Geschichte als **Karte**, **Zeitstrahl** und **Wissensnetz** — drei Sichten
auf denselben Datenbestand, in Echtzeit miteinander verbunden. Frontend-only: kein Server,
keine Datenbank, alle Sachdaten als JSON im Repository.

```bash
npm install
npm run dev
```

---

## Was drin ist

| | |
|---|---|
| Ereignisse | **322**, von 2200 v. Chr. bis 95 n. Chr. |
| Orte | **175** mit echten WGS84-Koordinaten |
| Personen | **178** mit Verwandtschafts- und Wirkungsbeziehungen |
| Reisen | **11** (Abraham, Exodus, Josua, Exil, Rückkehr, Jesus, Paulus 1–3, Romfahrt …) |
| Bücher | alle **66** mit Kanon-Metadaten |
| Epochen | **14** Zeitbänder |
| Verse | **143** deutsche Schlüsselverse, **63** griechische |

---

## Die drei Sichten

**Karte** — Leaflet über OpenStreetMap. Ein Marker steht für einen *Ort*, nicht für ein
Ereignis: In Jerusalem spielen Dutzende, als einzelne Pins lägen sie exakt übereinander.
Die Zahl am Pin zeigt, wie viel dahintersteckt. Reisen erscheinen als Linienzug mit
nummerierten Etappen — gestrichelt, wo die Route Rekonstruktion ist.

**Zeitstrahl** — 2200 v. Chr. bis 100 n. Chr., stufenlos zoombar (Jahrhunderte → Jahrzehnte
→ Einzeljahre). Mit dem Rad zoomen, mit gedrückter Maustaste ziehen, mit den Pfeiltasten
bedienen. Der Griff zwischen Karte und Zeitstrahl lässt sich hochziehen; die Höhe wird
gemerkt.

**Wissensnetz** — Ereignisse, Personen, Orte, Bücher und Reisen als Graph. Standardmäßig
der Umkreis um eine gewählte Entität, nicht das ganze Netz auf einmal — das wäre ein
unlesbares Knäuel.

Alle drei zeigen immer dieselbe gefilterte Menge. Ein Klick auf einen Zeitstrahl-Marker
lässt die Karte zum Ort fliegen, öffnet den Detailbereich und setzt die URL auf
`/ereignis/<id>` — jeder Zustand ist teilbar.

## Suche (`Strg`/`⌘` + `K`)

Ein Feld für alles. Ein Parser erkennt Strukturen, eine unscharfe Suche fängt den Rest ab:

```
Genesis 12      1. Mose 12      Mt 5,3      Psalm 23
Moses           Abram           Jerusalem   Jebus
1000 v. Chr.    8. Jahrhundert v. Chr.
Paulus zweite Missionsreise
```

---

## Redlichkeit der Daten

Die App zeigt Jahreszahlen auf einem Zeitstrahl. Damit das nicht mehr Sicherheit
vortäuscht, als die Quellen hergeben, sind drei Dinge fest eingebaut:

**Datierungssicherheit.** Jedes Ereignis trägt `certainty`. Unsichere Daten erscheinen mit
„ca.", blasser und mit gestricheltem Markerrand. Die Urgeschichte ist `symbolisch`
gekennzeichnet — sie bekommt einen Platz auf dem Zeitstrahl, damit sie darstellbar ist,
nicht weil sich ein Jahr angeben ließe.

**Keine erfundenen Bibelstellen.** Außerbiblische Ereignisse — die Septuaginta, Pompejus,
die Zerstörung des Tempels im Jahr 70 — tragen **keine** Stelle und **keinen**
Bibelabschnitt. Sie erscheinen neutral grau, und der Detailbereich sagt ausdrücklich, dass
die Bibel dieses Ereignis nicht erzählt. Der Validator erzwingt diese Kopplung: Stelle,
Abschnitt und das Kennzeichen `extrabiblical` müssen zusammenpassen.

**Unsichere Orte.** Berg Sinai, Kadesch-Barnea, Ai, Sodom, Emmaus — wo die Lokalisierung
umstritten ist, steht das auf der Ortsseite.

Die Chronologie folgt einem konservativ-mittleren Ansatz: Exodus ~1446 v. Chr., Tempelweihe
966, Reichsteilung 931, Fall Samarias 722, Zerstörung Jerusalems 586, Kreuzigung 30 n. Chr.
Ein Spätdatum des Exodus im 13. Jahrhundert ist fachlich ebenso vertretbar und würde große
Teile des Alten Testaments um zwei Jahrhunderte verschieben.

---

## Bibeltexte und Urheberrecht

Zwei deutsche Quellen, bewusst getrennt:

| Datei | Inhalt | Im Repository? |
|---|---|---|
| `verses.de.public.json` | Elberfelder 1905 — **gemeinfrei** | ja |
| `verses.de.local.json` | die lizenzierte Wunschübersetzung | **nein**, per `.gitignore` ausgeschlossen |
| `verses.grc.json` | SBLGNT, griechisches NT — CC BY 4.0 | ja |

Liegt die lokale Datei vor, hat sie Vorrang; fehlt sie, greift lautlos der gemeinfreie Text.
Geladen wird sie über `import.meta.glob`, damit ein frischer Klon ohne sie baut.

```bash
npm run fetch:verses                # Elberfelder 1905 + griechisches NT
npm run fetch:verses -- --de=s00    # Schlachter 2000 → nur in die lokale Datei
npm run fetch:verses -- --de=lut1912
```

**Schlachter 2000 und die Einheitsübersetzung sind urheberrechtlich geschützt.** Eine
Privatkopie für den eigenen Gebrauch ist zulässig (§ 53 UrhG), eine Weitergabe nicht.
Das Skript schreibt geschützten Text ausschließlich in die gitignorierte Datei und weigert
sich, ihn in die öffentliche zu schreiben. Für alle anderen Übersetzungen verlinkt die App
nach außen auf ERF Bibleserver, statt Text einzubetten.

Der griechische Text deckt nur das **Neue Testament** ab — das SBLGNT ist ein NT.
Alttestamentliche Ereignisse zeigen darum keinen Originaltext.

---

## Kartenhintergrund

Die Standardkacheln von OpenStreetMap beschriften jeden Ort in seiner Landessprache — in
Ägypten und Israel also auf Arabisch und Hebräisch. Für einen deutschsprachigen Atlas
unbrauchbar, deshalb zwei Alternativen, umschaltbar unten links auf der Karte:

- **Deutsch** (Standard) — `tile.openstreetmap.de`, deutsche Namen wo getaggt, sonst
  lateinische Umschrift. Kein dunkler Kachelsatz, daher im Dunkelmodus per CSS invertiert.
- **Neutral** — CARTO Voyager / Dark Matter. Lateinische Schrift, zurückhaltend gezeichnet,
  mit echten dunklen Kacheln.

Die Kacheln sind die einzige Netzverbindung zur Laufzeit; alle Sachdaten liegen im Bundle.

**Ortsnamen setzt die App selbst.** Ab Zoomstufe 9 — dort, wo das Clustering endet — steht
der biblische Name aus `places.json` unter dem Pin, in lesbarer Größe und mit hellem Rand
gegen den Kartengrund. Die Kacheln beschriften den *heutigen* Ort in der Schriftgröße einer
Übersichtskarte; auf einer Bibelkarte sucht man „Kapernaum", nicht „Kfar Nahum".
Aus demselben Grund ist `detectRetina` abgeschaltet: Die Option lädt auf hochauflösenden
Bildschirmen die Kacheln der nächsthöheren Zoomstufe und zeigt sie auf halber Fläche —
die Schrift wird dadurch halb so groß.

---

## Historische Grenzen

Der Kartenhintergrund zeigt heutige Staaten, und die erklären an einer Bibelkarte nichts:
„Israel" auf den Kacheln ist nicht das Nordreich Israel, und dass Paulus nach Galatien
schreibt, wird vor einer Türkeikarte nicht verständlicher. Deshalb legt die App auf Wunsch
das Gebietsbild der jeweiligen Zeit darüber — elf Kartenbilder von der Bronzezeit bis zu
den römischen Provinzen, in `src/data/territories.json`.

Umschaltbar unten links: **aus**, **automatisch** — folgt dem, was man gerade betrachtet
(ausgewähltes Ereignis, sonst der Median der sichtbaren Ereignisse) — oder eine **fest
eingestellte Epoche**, um beim Wandern durch den Zeitstrahl dasselbe Bild zu behalten.

Zwei Dinge sind dabei Absicht:

- **Die Umrisse sind schematisch, und man sieht es.** Antike Herrschaft endete an
  Einflusszonen, nicht an Katasterlinien; für viele Grenzen ist der Verlauf umstritten.
  Alle Ränder sind deshalb gestrichelt, tributpflichtige Gebiete (`einfluss`) zusätzlich
  blasser. Die Ebene zeigt Größenverhältnisse und Nachbarschaften — mehr behauptet sie nicht.
- **Die Epochen überlappen sich nicht.** Zu jedem Jahr gehört genau ein Kartenbild, sonst
  müsste die Automatik raten. `validate-data.mjs` prüft das.

---

## Auf dem Handy

Karte, Zeitstrahl und Detailbereich nebeneinander setzen einen breiten Bildschirm voraus. Auf
375 Pixeln bliebe für jedes ein Streifen übrig, auf dem nichts zu erkennen ist. Deshalb ist die
Oberfläche unterhalb von 768 Pixeln anders aufgebaut — nicht kleiner, sondern anders:

- **Eine Ansicht zur Zeit.** Karte *oder* Zeitstrahl füllt den Bildschirm, umgeschaltet über die
  untere Leiste. Beide bleiben dabei montiert und werden nur ausgeblendet: Leaflet verlöre sonst
  bei jedem Wechsel Ausschnitt und Zoomstufe. `MapAutoResize` meldet ihm die neue Größe, sobald
  die Karte wieder sichtbar ist.
- **Bedienung unten.** Die Bereichsleiste sitzt im Daumenbereich; oben bleiben nur Name und Lupe.
  Die Reiter der Kopfleiste erscheinen erst ab `md`, der Knopf für die Filterspalte ab `lg` —
  dort, wo es diese Spalte überhaupt gibt.
- **Details als Blatt von unten.** Es kommt zur Hälfte hoch, sodass der Ort auf der Karte
  sichtbar bleibt, und lässt sich aufziehen oder wegwischen. Gezogen wird nur am Griff, damit der
  Text darin scrollbar bleibt. Die Karte fliegt ihr Ziel entsprechend versetzt an, sonst läge der
  Marker unter dem Blatt.
- **Filter als Schublade** mit Wischgeste, Hintergrundklick und Escape.
- **Trefferflächen ab 44 Pixeln** (`tap`-Utility, nur bei `pointer: coarse`) — der Wert, auf den
  sich Apple und Google unabhängig voneinander festgelegt haben. Die Zeitstrahl-Marker wachsen
  dabei nur unsichtbar über ein Pseudoelement: Ihre Trefferfläche bestimmt die Zeilenhöhe, größere
  Knöpfe hießen also weniger sichtbare Ereignisse.
- **Zwei Finger zoomen den Zeitstrahl.** Am Telefon gibt es kein Mausrad; ohne die Geste bliebe er
  auf der Zoomstufe stehen, mit der er geöffnet wurde.
- **`100dvh` statt `100%`,** dazu `env(safe-area-inset-*)`: Sonst verschwindet die unterste Zeile
  hinter der ein- und ausfahrenden Browserleiste bzw. dem Home-Indikator.
- **Eingabefelder 16 Pixel.** Bei kleinerer Schrift zoomt iOS beim Antippen in das Feld hinein und
  lässt die Oberfläche verschoben stehen.

Ab `md` bzw. `lg` ist die Ansicht unverändert die bisherige: Karte über Zeitstrahl mit Ziehgriff,
Filter als feste Spalte, Details als Spalte rechts.

---

## Aufbau

```
src/
  data/          JSON — events, places, persons, journeys, periods, books,
                 territories (historische Grenzen), verses/
  types/         Datenmodell; data.d.ts typisiert die JSON-Dateien
  lib/           dataset · year · timelineScale · search · graph · verses
                 markerIcons · tileStyles · territories · labels
  store/         useAtlasStore (Sync) · useUiStore (Layout) · useThemeStore · useMapStyleStore
  components/    layout/ · map/ · timeline/ · detail/ · graph/ · search/ · filters/ · ui/
  pages/         Atlas · EventPanel · Person · Ort · Buch · Reise · Graph · Suche · Info
scripts/
  validate-data.mjs   referentielle Integrität — läuft in `npm run check`
  fetch-verses.mjs    Verse beschaffen
```

Ein paar Entscheidungen, die beim Lesen sonst überraschen:

- **`resolveJsonModule` ist aus.** Bei 322 Ereignissen leitete TypeScript sonst einen
  riesigen Literaltyp ab. Stattdessen typisiert `src/types/data.d.ts` jede Datei exakt —
  und `validate-data.mjs` prüft, dass die Daten dem auch entsprechen.
- **Es gibt kein Jahr 0.** `lib/year.ts` rechnet für Abstände auf eine lückenlose Skala um;
  ohne das wäre 1 v. Chr. bis 1 n. Chr. zwei Jahre statt einem.
- **`AtlasPage` ist eine pfadlose Layoutroute.** `/` und `/ereignis/:id` teilen sich eine
  Instanz, damit Leaflet beim Öffnen eines Ereignisses nicht neu aufgebaut wird.
- **Marker-Icons beziehen ihre Farbe über CSS-Variablen**, nicht über Hexwerte — dadurch
  färben sie sich beim Theme-Wechsel selbst um, ohne Rerender.
- **Der Zeitstrahl rendert DOM, kein Canvas.** Jeder Marker ist ein echter Button:
  fokussierbar, vorlesbar. Ereignisse ohne Platz werden weggelassen und gezählt, statt
  übereinandergestapelt.

## Befehle

```bash
npm run dev        # Entwicklungsserver
npm run check      # TypeScript strict + Datenvalidierung
npm test           # Vitest (89 Tests)
npm run build      # Produktionsbuild
npm run validate   # nur die Datenprüfung
```

---

## Grenzen

Kein Ersatz für einen wissenschaftlichen Bibelatlas und keine vollständige Erfassung. Der
Datensatz ist eine kuratierte Auswahl der großen Erzählbögen; 14 Bücher haben noch kein
Ereignis. Wo etwas fehlt, heißt das nicht, dass dort nichts steht — nur, dass es hier nicht
erfasst ist.
