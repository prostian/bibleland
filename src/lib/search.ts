import Fuse, { type IFuseOptions } from 'fuse.js';

import type { ParsedQuery, SearchResult, SearchResultKind } from '@/types';
import { books, events, eventRefLabel, journeys, persons, places } from '@/lib/dataset';
import { SECTION_LABEL, EVENT_TYPE_LABEL, PLACE_TYPE_LABEL, sectionLabelOf } from '@/lib/labels';
import { formatEventDate, formatYearRange, parseYear, parseYearRange, toContinuous } from '@/lib/year';

/**
 * Suche über den gesamten Datenbestand.
 *
 * Zwei Wege laufen nebeneinander:
 *
 * 1. Ein **Parser** erkennt Strukturen — „Genesis 12", „1. Mose 12,1",
 *    „1000 v. Chr.", „8. Jahrhundert v. Chr.". Solche Eingaben sind eindeutig
 *    gemeint und dürfen nicht in einem Fuzzy-Ranking untergehen.
 * 2. Eine **unscharfe Suche** über Titel, Beschreibungen, Namensvarianten und
 *    Schlagwörter fängt alles andere ab und verzeiht Tippfehler.
 *
 * Die Ergebnisse beider Wege landen in einer gemeinsamen Liste; strukturierte
 * Treffer bekommen einen künstlich besseren Rang.
 */

interface SearchDoc {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  /** Zusätzliche Begriffe, unter denen der Eintrag gefunden werden soll. */
  keywords: string;
  /** Für die Sortierung gleichwertiger Treffer. */
  year?: number;
}

/** Vergleichsform für Buchnamen: ohne Punkte, Leerzeichen und Groß-/Kleinschreibung. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss')
    .replace(/[.\s]/g, '');
}

/**
 * Alle Schreibweisen eines Buches → seine Kennung, längste zuerst.
 *
 * `bibleserver` steuert die im Deutschen gebräuchliche Kurzform bei, die von
 * der Kanonbezeichnung abweichen kann: „Psalm 23" schreibt jeder so, das
 * Buch heißt aber „Psalmen".
 */
const BOOK_LOOKUP: { key: string; bookId: string }[] = books
  .flatMap((book) => {
    const names = [
      book.name,
      book.abbrev,
      book.id,
      book.bibleserver,
      ...(book.altName ? [book.altName] : []),
    ];
    return names.map((name) => ({ key: normalize(name), bookId: book.id }));
  })
  .sort((a, b) => b.key.length - a.key.length);

/**
 * Zerlegt die Eingabe in erkannte Strukturen und den verbleibenden Freitext.
 *
 * Beispiele: „Genesis 12" → Buch + Kapitel · „Mt 5,3" → Buch, Kapitel, Vers ·
 * „1000 v. Chr." → Jahr · „Paulus" → nur Freitext.
 */
export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  const result: ParsedQuery = { raw, text: trimmed };
  if (!trimmed) return result;

  // Zuerst die Stellenangabe: ein führender Buchname mit Zahl dahinter.
  //
  // Ein Präfixtreffer allein genügt nicht — „ps" steckt auch in „psalm",
  // und „Psalm 23" würde dann als Buch „Ps" mit dem Rest „alm23" gelesen.
  // Angenommen wird ein Kandidat nur, wenn danach entweder nichts mehr folgt
  // oder eine Zahl beginnt.
  const normalized = normalize(trimmed);
  const match = BOOK_LOOKUP.find((entry) => {
    if (!normalized.startsWith(entry.key)) return false;
    const rest = normalized.slice(entry.key.length);
    return rest === '' || /^\d/.test(rest);
  });

  if (match) {
    result.bookId = match.bookId;
    const rest = normalized.slice(match.key.length);
    const numbers = rest.match(/^(\d{1,3})(?:[,:](\d{1,3}))?/);
    if (numbers?.[1]) {
      result.chapter = Number(numbers[1]);
      if (numbers[2]) result.verse = Number(numbers[2]);
      // Der Buchname ist abgehandelt und stört die unscharfe Suche nur noch.
      result.text = rest.replace(/^\d{1,3}(?:[,:]\d{1,3})?/, '').trim();
    }
    // Ohne Kapitelangabe bleibt der volle Text stehen: „Amos" soll neben dem
    // Buch auch den Propheten finden.
    return result;
  }

  const range = parseYearRange(trimmed);
  if (range) {
    result.yearRange = range;
    return result;
  }

  // Nur als Jahr deuten, wenn die Eingabe im Wesentlichen aus der Zahl
  // besteht — „Genesis 12" ist keine Jahresangabe, und „Psalm 23" erst recht
  // nicht.
  if (/^\d{1,4}\s*(v\.?\s*chr\.?|n\.?\s*chr\.?|bc|ad)?\.?$/i.test(trimmed)) {
    const year = parseYear(trimmed);
    if (year !== null) result.year = year;
  }

  return result;
}

/* ------------------------------------------------------------------ *
 * Unscharfer Index
 * ------------------------------------------------------------------ */

const documents: SearchDoc[] = [
  ...events.map((event) => ({
    kind: 'ereignis' as const,
    id: event.id,
    title: event.title,
    subtitle: `${formatEventDate(event)} · ${eventRefLabel(event)}`,
    keywords: [
      event.description,
      event.tags.join(' '),
      sectionLabelOf(event.section),
      EVENT_TYPE_LABEL[event.eventType],
    ].join(' '),
    year: event.year,
  })),
  ...persons.map((person) => ({
    kind: 'person' as const,
    id: person.id,
    title: person.name,
    subtitle: person.role,
    keywords: [person.aliases.join(' '), person.description, person.greekName, person.hebrewName]
      .filter(Boolean)
      .join(' '),
    ...(person.birthYear !== undefined ? { year: person.birthYear } : {}),
  })),
  ...places.map((place) => ({
    kind: 'ort' as const,
    id: place.id,
    title: place.name,
    subtitle: `${PLACE_TYPE_LABEL[place.type]} · ${place.region}`,
    keywords: [place.aliases.join(' '), place.modernName, place.greekName, place.description]
      .filter(Boolean)
      .join(' '),
  })),
  ...books.map((book) => ({
    kind: 'buch' as const,
    id: book.id,
    title: book.name,
    subtitle: `${SECTION_LABEL[book.section]} · ${book.chapters} Kapitel`,
    keywords: [book.altName, book.abbrev, book.description].filter(Boolean).join(' '),
  })),
  ...journeys.map((journey) => ({
    kind: 'reise' as const,
    id: journey.id,
    title: journey.title,
    subtitle: formatYearRange(journey.yearStart, journey.yearEnd),
    keywords: journey.description,
    year: journey.yearStart,
  })),
];

const FUSE_OPTIONS: IFuseOptions<SearchDoc> = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.38,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 3 },
    { name: 'subtitle', weight: 1 },
    { name: 'keywords', weight: 0.6 },
  ],
};

const fuse = new Fuse(documents, FUSE_OPTIONS);

/* ------------------------------------------------------------------ *
 * Suche
 * ------------------------------------------------------------------ */

/** Rang für strukturierte Treffer — besser als jeder Fuzzy-Score. */
const EXACT_SCORE = -1;

export function search(raw: string, limit = 40): SearchResult[] {
  const query = parseQuery(raw);
  if (!query.raw.trim()) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const add = (result: SearchResult) => {
    const key = `${result.kind}:${result.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(result);
  };

  /* --- Weg 1: Stellenangabe ------------------------------------- */
  if (query.bookId) {
    const book = books.find((b) => b.id === query.bookId);
    if (book) {
      add({
        kind: 'buch',
        id: book.id,
        title: book.name,
        subtitle: `${SECTION_LABEL[book.section]} · ${book.chapters} Kapitel`,
        score: EXACT_SCORE,
      });

      // Ereignisse des Buches, bei Kapitelangabe auf dieses eingeengt.
      // Außerbiblische Ereignisse haben keine Stelle und können hier nicht
      // treffen — sie sind nur über die unscharfe Suche erreichbar.
      const matching = events.filter((event) => {
        const refs = [event.ref, ...(event.parallelRefs ?? [])].filter((r) => r !== undefined);
        return refs.some((ref) => {
          if (ref.bookId !== query.bookId) return false;
          if (query.chapter === undefined) return true;
          const last = ref.endChapter ?? ref.chapter;
          return query.chapter >= ref.chapter && query.chapter <= last;
        });
      });

      for (const event of matching) {
        add({
          kind: 'ereignis',
          id: event.id,
          title: event.title,
          subtitle: `${formatEventDate(event)} · ${eventRefLabel(event)}`,
          score: EXACT_SCORE,
        });
      }
    }
  }

  /* --- Weg 2: Jahr oder Zeitraum -------------------------------- */
  const window = query.yearRange ?? (query.year !== undefined ? { from: query.year - 25, to: query.year + 25 } : null);
  if (window) {
    const inWindow = events
      .filter((event) => {
        const start = toContinuous(event.year);
        const end = toContinuous(event.yearEnd ?? event.year);
        return end >= toContinuous(window.from) && start <= toContinuous(window.to);
      })
      .sort((a, b) => {
        // Näher an der Mitte des gesuchten Fensters zuerst.
        const center = (toContinuous(window.from) + toContinuous(window.to)) / 2;
        return Math.abs(toContinuous(a.year) - center) - Math.abs(toContinuous(b.year) - center);
      });

    for (const event of inWindow) {
      add({
        kind: 'ereignis',
        id: event.id,
        title: event.title,
        subtitle: `${formatEventDate(event)} · ${eventRefLabel(event)}`,
        score: EXACT_SCORE,
        yearRange: window,
      });
    }
  }

  /* --- Weg 3: unscharfe Suche ----------------------------------- */
  //
  // Bei einer eindeutigen Stellen- oder Jahresangabe wäre eine zusätzliche
  // unscharfe Runde nur Rauschen. Ein bloßer Buchname ohne Kapitel dagegen
  // ist mehrdeutig — „Amos" meint das Buch oder den Propheten —, also läuft
  // die Suche dort weiter.
  const structuralOnly = query.chapter !== undefined || window !== null;
  const text = structuralOnly ? query.text.trim() : query.text.trim() || query.raw.trim();
  if (text.length >= 2) {
    for (const hit of fuse.search(text, { limit })) {
      add({
        kind: hit.item.kind,
        id: hit.item.id,
        title: hit.item.title,
        subtitle: hit.item.subtitle,
        score: hit.score ?? 1,
      });
    }
  }

  return results.slice(0, limit);
}

/** Gruppiert Ergebnisse nach Art — die Suchseite zeigt sie in Blöcken. */
export function groupResults(results: readonly SearchResult[]): Map<SearchResultKind, SearchResult[]> {
  const grouped = new Map<SearchResultKind, SearchResult[]>();
  for (const result of results) {
    const bucket = grouped.get(result.kind);
    if (bucket) bucket.push(result);
    else grouped.set(result.kind, [result]);
  }
  return grouped;
}
