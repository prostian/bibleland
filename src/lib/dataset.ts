import booksJson from '@/data/books.json';
import periodsJson from '@/data/periods.json';
import placesJson from '@/data/places.json';
import personsJson from '@/data/persons.json';
import eventsJson from '@/data/events.json';
import journeysJson from '@/data/journeys.json';

import type { BibleBook, BibleEvent, BibleRef, Journey, Period, Person, Place } from '@/types';
import { toContinuous } from '@/lib/year';

/**
 * Zentraler Datenzugriff.
 *
 * Alle JSON-Dateien werden einmalig beim Modulimport geladen und in Maps
 * überführt. Danach ist jeder Zugriff über eine Kennung O(1) — nötig, weil
 * Karte, Zeitstrahl und Graph bei jedem Filterwechsel über den gesamten
 * Datenbestand laufen.
 *
 * Die referentielle Integrität dieser Daten prüft `scripts/validate-data.mjs`
 * vor dem Build; hier wird sie vorausgesetzt.
 */

/* ------------------------------------------------------------------ *
 * Rohdaten, nach Anzeigereihenfolge sortiert
 * ------------------------------------------------------------------ */

export const books: readonly BibleBook[] = [...booksJson].sort((a, b) => a.order - b.order);
export const periods: readonly Period[] = [...periodsJson].sort((a, b) => a.yearStart - b.yearStart);
export const places: readonly Place[] = [...placesJson].sort((a, b) => a.name.localeCompare(b.name, 'de'));
export const persons: readonly Person[] = [...personsJson].sort((a, b) => a.name.localeCompare(b.name, 'de'));
export const journeys: readonly Journey[] = journeysJson;

/** Ereignisse chronologisch — die Grundordnung für Zeitstrahl und Listen. */
export const events: readonly BibleEvent[] = [...eventsJson].sort((a, b) => {
  const diff = toContinuous(a.year) - toContinuous(b.year);
  return diff !== 0 ? diff : a.title.localeCompare(b.title, 'de');
});

/* ------------------------------------------------------------------ *
 * Primärindizes
 * ------------------------------------------------------------------ */

export const bookById: ReadonlyMap<string, BibleBook> = new Map(books.map((b) => [b.id, b]));
export const periodById: ReadonlyMap<string, Period> = new Map(periods.map((p) => [p.id, p]));
export const placeById: ReadonlyMap<string, Place> = new Map(places.map((p) => [p.id, p]));
export const personById: ReadonlyMap<string, Person> = new Map(persons.map((p) => [p.id, p]));
export const eventById: ReadonlyMap<string, BibleEvent> = new Map(events.map((e) => [e.id, e]));
export const journeyById: ReadonlyMap<string, Journey> = new Map(journeys.map((j) => [j.id, j]));

/* ------------------------------------------------------------------ *
 * Sekundärindizes: Ereignisse nach Bezugsgröße
 * ------------------------------------------------------------------ */

function groupEvents(keysOf: (event: BibleEvent) => readonly string[]): ReadonlyMap<string, BibleEvent[]> {
  const map = new Map<string, BibleEvent[]>();
  for (const event of events) {
    for (const key of keysOf(event)) {
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
  }
  return map;
}

export const eventsByPlace = groupEvents((e) => (e.placeId ? [e.placeId] : []));
export const eventsByPerson = groupEvents((e) => e.personIds);
export const eventsByJourney = groupEvents((e) => (e.journeyId ? [e.journeyId] : []));
export const eventsByPeriod = groupEvents((e) => [e.periodId]);

/**
 * Ein Ereignis zählt zu jedem Buch, das es belegt — Haupt- wie
 * Parallelstelle. Außerbiblische Ereignisse haben keine Stelle und tauchen
 * folglich unter keinem Buch auf.
 */
export const eventsByBook = groupEvents((e) => {
  const ids = new Set<string>();
  if (e.ref) ids.add(e.ref.bookId);
  for (const ref of e.parallelRefs ?? []) ids.add(ref.bookId);
  return [...ids];
});

/** Orte, an denen überhaupt etwas stattfindet — nur diese kommen auf die Karte. */
export const placesWithEvents: readonly Place[] = places.filter((p) => eventsByPlace.has(p.id));

/* ------------------------------------------------------------------ *
 * Zugriffshelfer
 *
 * Bewusst `undefined`-tolerant: Aufrufe kommen häufig aus Routen-Parametern,
 * die der Nutzer frei eintippen kann.
 * ------------------------------------------------------------------ */

export function getEvent(id: string | undefined): BibleEvent | undefined {
  return id ? eventById.get(id) : undefined;
}

export function getPlace(id: string | null | undefined): Place | undefined {
  return id ? placeById.get(id) : undefined;
}

export function getPerson(id: string | undefined): Person | undefined {
  return id ? personById.get(id) : undefined;
}

export function getBook(id: string | undefined): BibleBook | undefined {
  return id ? bookById.get(id) : undefined;
}

export function getJourney(id: string | undefined): Journey | undefined {
  return id ? journeyById.get(id) : undefined;
}

export function getPeriod(id: string | undefined): Period | undefined {
  return id ? periodById.get(id) : undefined;
}

export function eventsAtPlace(placeId: string): readonly BibleEvent[] {
  return eventsByPlace.get(placeId) ?? [];
}

export function eventsOfPerson(personId: string): readonly BibleEvent[] {
  return eventsByPerson.get(personId) ?? [];
}

export function eventsInBook(bookId: string): readonly BibleEvent[] {
  return eventsByBook.get(bookId) ?? [];
}

export function eventsOfJourney(journeyId: string): readonly BibleEvent[] {
  return eventsByJourney.get(journeyId) ?? [];
}

/** Personen eines Ereignisses, aufgelöst und in der angegebenen Reihenfolge. */
export function personsOf(event: BibleEvent): Person[] {
  return event.personIds.map((id) => personById.get(id)).filter((p): p is Person => p !== undefined);
}

/** Reisen, an denen eine Person beteiligt ist. */
export function journeysOfPerson(personId: string): Journey[] {
  return journeys.filter((j) => j.personIds.includes(personId));
}

/** Reisen, die einen Ort berühren. */
export function journeysAtPlace(placeId: string): Journey[] {
  return journeys.filter((j) => j.legs.some((leg) => leg.placeId === placeId));
}

/** Die Epoche, in die ein Jahr fällt. */
export function periodAtYear(year: number): Period | undefined {
  const y = toContinuous(year);
  return periods.find((p) => y >= toContinuous(p.yearStart) && y <= toContinuous(p.yearEnd));
}

/* ------------------------------------------------------------------ *
 * Bibelstellen
 * ------------------------------------------------------------------ */

/**
 * Stellenangabe in deutscher Schreibweise: „1. Mose 12,1-9".
 * Im Deutschen trennt ein Komma Kapitel und Vers, kein Doppelpunkt.
 */
export function formatRef(ref: BibleRef, options: { abbreviated?: boolean } = {}): string {
  const book = bookById.get(ref.bookId);
  const name = options.abbreviated ? (book?.abbrev ?? ref.bookId) : (book?.name ?? ref.bookId);

  if (ref.endChapter && ref.endChapter !== ref.chapter) {
    return `${name} ${ref.chapter}–${ref.endChapter}`;
  }
  if (ref.verses) {
    return `${name} ${ref.chapter},${ref.verses}`;
  }
  return `${name} ${ref.chapter}`;
}

/**
 * Stellenangabe eines Ereignisses für Listen, Tooltips und Untertitel.
 *
 * Außerbiblische Ereignisse haben keine Stelle. Statt einer Lücke steht dort
 * ein Wort, das den Unterschied benennt — sonst sähe es nach fehlenden Daten
 * aus statt nach einer Aussage über die Quellenlage.
 */
export function eventRefLabel(
  event: BibleEvent,
  options: { abbreviated?: boolean } = {},
): string {
  if (!event.ref) return 'außerbiblisch';
  return formatRef(event.ref, options);
}

/** Punkt-Referenz auf einen einzelnen Vers, z. B. 'gen.12.1'. */
export function verseKey(bookId: string, chapter: number, verse: number): string {
  return `${bookId}.${chapter}.${verse}`;
}

/** Zerlegt eine Punkt-Referenz wieder in ihre Teile. */
export function parseVerseKey(key: string): { bookId: string; chapter: number; verse: number } | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  const [bookId, chapterRaw, verseRaw] = parts;
  const chapter = Number(chapterRaw);
  const verse = Number(verseRaw);
  if (!bookId || !Number.isInteger(chapter) || !Number.isInteger(verse)) return null;
  return { bookId, chapter, verse };
}

/* ------------------------------------------------------------------ *
 * Kennzahlen — für die Info-Seite und leere Zustände
 * ------------------------------------------------------------------ */

export const datasetStats = {
  events: events.length,
  places: places.length,
  persons: persons.length,
  journeys: journeys.length,
  books: books.length,
  periods: periods.length,
  yearFrom: events.reduce((min, e) => Math.min(min, e.year), Number.POSITIVE_INFINITY),
  yearTo: events.reduce((max, e) => Math.max(max, e.yearEnd ?? e.year), Number.NEGATIVE_INFINITY),
} as const;
