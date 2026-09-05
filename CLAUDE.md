# Hinweise für Claude Code

[README.md](README.md) ist die Architekturdokumentation und ausführlich — bei Fragen zu
Aufbau, Datenmodell, Kartenebenen oder Mobilansicht dort nachlesen, nicht raten. Diese Datei
sagt nur, was dort *nicht* steht: wie hier gearbeitet wird.

## Woher die Arbeit kommt

User Stories liegen als GitHub Issues in `prostian/bibleland`. `gh issue list` zeigt sie,
`gh issue view <N>` die einzelne Story. Der „Fertig, wenn"-Teil im Issue ist die Abnahme —
was dort nicht steht, ist nicht gefordert.

## Ablauf

Direkt auf `dev` committen, keine PRs. Das Projekt hat einen Entwickler, und der
Kontrollpunkt existiert bereits als Staging-Deployment.

```
dev   → dev.biblego.info   (Staging, nach jedem Push)
main  → biblego.info       (Produktion, nur was Markus bewusst mergt)
```

Vor jedem Commit müssen beide durchlaufen:

```bash
npm run check   # TypeScript strict + Datenvalidierung
npm test        # Vitest
```

Die letzte Zeile der Commit-Nachricht verweist auf das Issue: `Closes #<N>`. Das greift erst
auf `main`, das Issue schließt sich also genau dann, wenn die Story produktiv ist — richtig so.

`dev` nach `main` mergen ist **nicht** deine Entscheidung. Das ist ein Produktions-Deployment
und bleibt bei Markus.

## Konventionen aus dem Bestand

- **Commit-Nachrichten deutsch, ohne Umlaute** (`ae/oe/ue`) — siehe `git log`. Im Quelltext,
  in Kommentaren und im README sind Umlaute dagegen normal.
- **Kommentare erklären das *Warum*, nicht das *Was*.** Die vorhandenen sind teils lang und
  begründen eine Entscheidung, die sonst wie ein Fehler aussähe — etwa die verschachtelten
  `IfModule` in [public/.htaccess](public/.htaccess) oder `detectRetina: false` auf der Karte.
  Schreib in diesem Stil weiter; ein Kommentar, der nur wiederholt was der Code tut, ist Ballast.
- **Kein neuer Kommentar zu unverändertem Code**, nur weil du gerade in der Datei bist.

## Fallen

- **`resolveJsonModule` ist aus.** Ändert sich die Struktur einer Datei unter `src/data/`,
  muss [src/types/data.d.ts](src/types/data.d.ts) mitgezogen werden — sonst typisiert
  TypeScript ins Leere, ohne zu meckern.
- **`scripts/validate-data.mjs` ist streng und das mit Absicht.** Es erzwingt referentielle
  Integrität, die Kopplung von `extrabiblical` an fehlende Bibelstelle/-abschnitt und
  überlappungsfreie Epochen in `territories.json`. Wenn es bricht, sind die Daten falsch,
  nicht der Validator.
- **`src/data/verses/verses.de.local.json` ist lizenzierter Text und gitignoriert.** Niemals
  committen, niemals in `verses.de.public.json` übertragen, niemals Inhalte daraus in eine
  andere Datei kopieren.
- **Die Workflows unter `.github/workflows/` gehören IONOS Deploy Now.**
  [biblego-build.yaml](.github/workflows/biblego-build.yaml) darf angepasst werden — dort
  stehen die Build-Schritte. Die beiden anderen nicht: Deploy Now überschreibt sie und
  benennt sie bei einem Projekt-Rename um (deshalb heißen sie `biblego-*` und nicht mehr
  `bibleland-*`).
