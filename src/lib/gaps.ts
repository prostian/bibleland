import type { BibleBook, BibleEvent, Certainty, Journey, Period, Person, Place, Section } from '@/types';

/**
 * Wo ist der Datenbestand dünn?
 *
 * `scripts/validate-data.mjs` beantwortet die Frage, ob die Daten in sich
 * stimmen; diese Datei die andere: was fehlt. Eine Lücke ist kein Fehler,
 * deshalb steht sie nicht dort und bricht auch keinen Build.
 *
 * Das Modul kommt bewusst ohne Laufzeit-Importe aus — nur `import type`, das
 * beim Laden verschwindet. Dadurch kann `scripts/report-gaps.mjs` es direkt
 * importieren, obwohl Node weder den `@/`-Alias noch TypeScript kennt. Die
 * Alternative wäre eine zweite Implementierung für die Konsole gewesen, und
 * damit zwei Zahlenreihen, die sich früher oder später widersprechen.
 */

/** Ab wann ist eine Beschreibung mehr als eine halbe Zeile auf der Detailseite? */
export const SHORT_DESCRIPTION_CHARS = 80;

export interface GapsInput {
  books: readonly BibleBook[];
  periods: readonly Period[];
  places: readonly Place[];
  persons: readonly Person[];
  events: readonly BibleEvent[];
  journeys: readonly Journey[];
}

export interface NamedGap {
  id: string;
  name: string;
}

export interface BookGap extends NamedGap {
  section: Section;
  /** Bücher mit Abfassungszeit können auch ohne Ereignis auf den Zeitstrahl. */
  hasWrittenYear: boolean;
}

export interface ShortDescriptionGap extends NamedGap {
  length: number;
}

export interface CertaintyShare {
  certainty: Certainty;
  count: number;
  /** Anteil an allen Ereignissen in Prozent, auf eine Stelle gerundet. */
  share: number;
}

export interface CountByKey extends NamedGap {
  count: number;
}

export interface JourneyGap extends NamedGap {
  legs: number;
  legsWithoutEvent: number;
}

export interface GapsReport {
  totals: {
    books: number;
    periods: number;
    places: number;
    persons: number;
    events: number;
    journeys: number;
  };
  booksWithoutEvents: BookGap[];
  placesWithoutEvents: NamedGap[];
  personsWithoutEvents: NamedGap[];
  personsWithoutRelations: NamedGap[];
  shortDescriptions: {
    places: ShortDescriptionGap[];
    persons: ShortDescriptionGap[];
    events: ShortDescriptionGap[];
  };
  keyVerses: {
    /** Ereignisse, die eine Bibelstelle haben — nur für sie ist ein Schlüsselvers möglich. */
    biblical: number;
    withKeyVerse: number;
    withoutKeyVerse: number;
  };
  certainty: CertaintyShare[];
  eventsByPeriod: CountByKey[];
  eventsBySection: CountByKey[];
  extrabiblicalEvents: number;
  placesWithoutModernName: number;
  journeysWithLegsWithoutEvent: JourneyGap[];
}

const byName = (a: NamedGap, b: NamedGap) => a.name.localeCompare(b.name, 'de');

function short(id: string, name: string, description: string | undefined): ShortDescriptionGap | null {
  const length = (description ?? '').trim().length;
  return length < SHORT_DESCRIPTION_CHARS ? { id, name, length } : null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

export function computeGaps(data: GapsInput): GapsReport {
  const { books, periods, places, persons, events, journeys } = data;

  /*
   * Ein Buch gilt als erschlossen, sobald es irgendein Ereignis belegt — auch
   * als Parallelstelle. Das ist dieselbe Zuordnung, die `eventsByBook` für die
   * Buchseite benutzt: Was dort erscheint, darf hier nicht als Lücke zählen.
   */
  const booksWithEvents = new Set<string>();
  for (const event of events) {
    if (event.ref) booksWithEvents.add(event.ref.bookId);
    for (const ref of event.parallelRefs ?? []) booksWithEvents.add(ref.bookId);
  }

  const placesWithEvents = new Set<string>();
  const personsWithEvents = new Set<string>();
  const eventsPerPeriod = new Map<string, number>();
  const eventsPerSection = new Map<string, number>();
  const certaintyCounts = new Map<Certainty, number>();

  let biblical = 0;
  let withKeyVerse = 0;
  let extrabiblicalEvents = 0;

  for (const event of events) {
    if (event.placeId) placesWithEvents.add(event.placeId);
    for (const personId of event.personIds) personsWithEvents.add(personId);

    eventsPerPeriod.set(event.periodId, (eventsPerPeriod.get(event.periodId) ?? 0) + 1);
    if (event.section) {
      eventsPerSection.set(event.section, (eventsPerSection.get(event.section) ?? 0) + 1);
    }
    certaintyCounts.set(event.certainty, (certaintyCounts.get(event.certainty) ?? 0) + 1);

    if (event.extrabiblical === true) {
      extrabiblicalEvents += 1;
    } else {
      biblical += 1;
      if (event.keyVerseRef) withKeyVerse += 1;
    }
  }

  // Die Abschnittsreihenfolge steht nirgends als Liste zur Verfügung, ohne
  // einen Laufzeit-Import zu erzwingen — die Bücher tragen sie in ihrer
  // Kanonordnung ohnehin bei sich.
  const sectionOrder: Section[] = [];
  for (const book of [...books].sort((a, b) => a.order - b.order)) {
    if (!sectionOrder.includes(book.section)) sectionOrder.push(book.section);
  }

  const certaintyOrder: Certainty[] = ['hoch', 'mittel', 'niedrig', 'symbolisch'];

  return {
    totals: {
      books: books.length,
      periods: periods.length,
      places: places.length,
      persons: persons.length,
      events: events.length,
      journeys: journeys.length,
    },

    booksWithoutEvents: books
      .filter((book) => !booksWithEvents.has(book.id))
      .sort((a, b) => a.order - b.order)
      .map((book) => ({
        id: book.id,
        name: book.name,
        section: book.section,
        hasWrittenYear: book.writtenYear !== undefined,
      })),

    placesWithoutEvents: places
      .filter((place) => !placesWithEvents.has(place.id))
      .map((place) => ({ id: place.id, name: place.name }))
      .sort(byName),

    personsWithoutEvents: persons
      .filter((person) => !personsWithEvents.has(person.id))
      .map((person) => ({ id: person.id, name: person.name }))
      .sort(byName),

    personsWithoutRelations: persons
      .filter((person) => person.relations.length === 0)
      .map((person) => ({ id: person.id, name: person.name }))
      .sort(byName),

    shortDescriptions: {
      places: places.map((p) => short(p.id, p.name, p.description)).filter(isPresent).sort(byName),
      persons: persons.map((p) => short(p.id, p.name, p.description)).filter(isPresent).sort(byName),
      events: events.map((e) => short(e.id, e.title, e.description)).filter(isPresent).sort(byName),
    },

    keyVerses: {
      biblical,
      withKeyVerse,
      withoutKeyVerse: biblical - withKeyVerse,
    },

    certainty: certaintyOrder.map((certainty) => {
      const count = certaintyCounts.get(certainty) ?? 0;
      return {
        certainty,
        count,
        share: events.length === 0 ? 0 : Math.round((count / events.length) * 1000) / 10,
      };
    }),

    eventsByPeriod: [...periods]
      .sort((a, b) => a.yearStart - b.yearStart)
      .map((period) => ({
        id: period.id,
        name: period.name,
        count: eventsPerPeriod.get(period.id) ?? 0,
      })),

    eventsBySection: sectionOrder.map((section) => ({
      id: section,
      name: section,
      count: eventsPerSection.get(section) ?? 0,
    })),

    extrabiblicalEvents,

    placesWithoutModernName: places.filter((place) => !place.modernName).length,

    journeysWithLegsWithoutEvent: journeys
      .map((journey) => ({
        id: journey.id,
        name: journey.title,
        legs: journey.legs.length,
        legsWithoutEvent: journey.legs.filter((leg) => !leg.eventId).length,
      }))
      .filter((journey) => journey.legsWithoutEvent > 0),
  };
}
