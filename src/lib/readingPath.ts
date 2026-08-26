import type { BibleEvent, BibleRef, Journey, Section } from '@/types';
import { books, bookById, eventsByBook } from '@/lib/dataset';
import type { Tick } from '@/lib/timelineScale';

/**
 * Der Lesemodus: die biblische Geschichte in der Reihenfolge, in der man sie
 * liest, statt in der Reihenfolge, in der sie geschah.
 *
 * Der Zeitstrahl ordnet nach Jahren. Wer mit einer aufgeschlagenen Bibel
 * danebensitzt, braucht die andere Ordnung — 1. Mose 1 bis 50, egal wie die
 * Datierungen liegen. Dieses Modul liefert die Positionen dafür und, wichtiger,
 * die **Ortsabschnitte**.
 *
 * Der Kerngedanke: Ein Ort gilt nicht nur im Kapitel seines Ereignisses,
 * sondern **bis zum nächsten Ortswechsel**. Von 46 Ereignissen in 1. Mose
 * liegen zehn Kapitel ohne eigenes Ereignis dazwischen — wer Kapitel 17 liest,
 * bekommt trotzdem Hebron angezeigt, weil sich seit Kapitel 13 nichts bewegt
 * hat. Ohne diese Fortschreibung wäre der Lesemodus eine löchrige Punktwolke
 * statt einer durchgehenden Wegbeschreibung.
 */

/* ------------------------------------------------------------------ *
 * Kanonische Positionen
 * ------------------------------------------------------------------ */

/** Wie viele Kapitel vor diesem Buch liegen. */
const chapterOffset: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  let running = 0;
  for (const book of books) {
    map.set(book.id, running);
    running += book.chapters;
  }
  return map;
})();

/** Gesamtzahl der Kapitel im Kanon — die Obergrenze der Achse. */
export const TOTAL_CHAPTERS = books.reduce((sum, book) => sum + book.chapters, 0);

/**
 * Fortlaufende Position eines Kapitels über den ganzen Kanon hinweg.
 *
 * 1. Mose 1 = 1, 1. Mose 50 = 50, 2. Mose 1 = 51 … So lässt sich ein ganzer
 * Abschnitt wie der Pentateuch als eine durchgehende Achse zeichnen, ohne dass
 * die Buchgrenze einen Sprung erzeugt.
 *
 * Der Vers landet als Nachkommastelle in der Position. Damit steht innerhalb
 * eines Kapitels alles in Lesereihenfolge, ohne dass die ganzzahlige
 * Kapitelposition verloren geht.
 */
export function canonicalPosition(bookId: string, chapter: number, verse = 0): number {
  const offset = chapterOffset.get(bookId);
  if (offset === undefined) return 0;
  return offset + chapter + Math.min(Math.max(verse, 0), 999) / 1000;
}

/** Position → Buch und Kapitel. Für Achsenbeschriftung und Sprungmarken. */
export function positionToRef(position: number): { bookId: string; chapter: number } | null {
  const target = Math.max(1, Math.floor(position));
  for (const book of books) {
    const offset = chapterOffset.get(book.id) ?? 0;
    if (target > offset && target <= offset + book.chapters) {
      return { bookId: book.id, chapter: target - offset };
    }
  }
  return null;
}

/** Anzeigename einer Position: „1. Mose 12". */
export function positionLabel(position: number): string {
  const ref = positionToRef(position);
  if (!ref) return '';
  return `${bookById.get(ref.bookId)?.name ?? ref.bookId} ${ref.chapter}`;
}

/** Erster Vers einer Stellenangabe — für die Reihenfolge innerhalb eines Kapitels. */
function firstVerse(ref: BibleRef): number {
  const match = ref.verses?.match(/^(\d+)/);
  return match?.[1] ? Number(match[1]) : 0;
}

/* ------------------------------------------------------------------ *
 * Lesebereich
 * ------------------------------------------------------------------ */

export type ReadingScope =
  | { kind: 'buch'; id: string }
  | { kind: 'abschnitt'; id: Section };

/** Die Bücher eines Lesebereichs, in Kanonreihenfolge. */
export function booksInScope(scope: ReadingScope) {
  if (scope.kind === 'buch') {
    const book = bookById.get(scope.id);
    return book ? [book] : [];
  }
  return books.filter((book) => book.section === scope.id);
}

/** Der Lesebereich als Achsenausschnitt, passend zu `YearRange`. */
export function scopeRange(scope: ReadingScope): { from: number; to: number } {
  const bounds = scopeBounds(scope);
  return { from: bounds.min, to: bounds.max };
}

/** Erste und letzte Kapitelposition eines Lesebereichs. */
export function scopeBounds(scope: ReadingScope): { min: number; max: number } {
  const inScope = booksInScope(scope);
  const first = inScope[0];
  const last = inScope[inScope.length - 1];
  if (!first || !last) return { min: 1, max: 1 };
  return {
    min: canonicalPosition(first.id, 1),
    max: canonicalPosition(last.id, last.chapters),
  };
}

/**
 * Die Stelle, die zu einem der Bücher des Bereichs gehört.
 *
 * Nötig, weil `eventsByBook` ein Ereignis auch über eine Parallelstelle
 * einsortiert: Ein Ereignis aus 2. Könige mit Chronik-Parallele taucht unter
 * beiden Büchern auf, hat dort aber verschiedene Kapitelnummern.
 */
export function refInScope(event: BibleEvent, bookIds: ReadonlySet<string>): BibleRef | undefined {
  if (event.ref && bookIds.has(event.ref.bookId)) return event.ref;
  return event.parallelRefs?.find((ref) => bookIds.has(ref.bookId));
}

export interface ReadingEntry {
  event: BibleEvent;
  ref: BibleRef;
  position: number;
}

/**
 * Die Ereignisse eines Lesebereichs in **kanonischer** Reihenfolge.
 *
 * Der Index `eventsByBook` erbt die chronologische Sortierung aus
 * `dataset.ts` — hier wird umsortiert, nicht neu gesammelt.
 */
export function eventsInReadingOrder(scope: ReadingScope): ReadingEntry[] {
  const inScope = booksInScope(scope);
  const bookIds = new Set(inScope.map((book) => book.id));

  const entries = new Map<string, ReadingEntry>();
  for (const book of inScope) {
    for (const event of eventsByBook.get(book.id) ?? []) {
      if (entries.has(event.id)) continue;
      const ref = refInScope(event, bookIds);
      if (!ref) continue;
      entries.set(event.id, {
        event,
        ref,
        position: canonicalPosition(ref.bookId, ref.chapter, firstVerse(ref)),
      });
    }
  }

  return [...entries.values()].sort((a, b) => {
    const diff = a.position - b.position;
    return diff !== 0 ? diff : a.event.id.localeCompare(b.event.id);
  });
}

/* ------------------------------------------------------------------ *
 * Ortsabschnitte
 * ------------------------------------------------------------------ */

export interface ReadingSegment {
  /** 1…n — die Nummer auf der Karte. */
  order: number;
  placeId: string | null;
  /**
   * Beginn, **einschließlich**. Ganzzahlig, wenn der Abschnitt das Kapitel
   * eröffnet; mit Versanteil, wenn der Ort mitten im Kapitel wechselt.
   */
  fromPosition: number;
  /**
   * Ende, **ausschließlich** — genau die Position, an der der nächste
   * Abschnitt beginnt.
   *
   * Halbseitig offen, weil ein Kapitel mehrere Orte enthalten kann: 1. Mose 12
   * beginnt in Haran (Vers 1) und endet in Sichem (Vers 6). Mit beidseitig
   * geschlossenen Grenzen überlappten sich die beiden Abschnitte im selben
   * Kapitel, und die Frage „wo bin ich?" hätte zwei Antworten.
   */
  toPosition: number;
  events: BibleEvent[];
  /**
   * Wahr, wenn der Abschnitt über Kapitel reicht, in denen gar kein Ereignis
   * erfasst ist. Solche Abschnitte werden blasser gezeichnet: Dass sich der
   * Ort dort nicht ändert, ist eine Annahme des Datensatzes, keine Aussage
   * des Textes.
   */
  extended: boolean;
}

/**
 * Baut die Ortsabschnitte eines Lesebereichs.
 *
 * Ereignisse **ohne** Ort brechen einen Abschnitt nicht auf — sie hängen sich
 * an den laufenden an. Genau das setzt die Regel „derselbe Ort bis zum
 * nächsten Wechsel" um: Ein ortloses Ereignis wie eine Rede oder ein Gleichnis
 * bedeutet nicht, dass die Erzählung den Schauplatz verlassen hat.
 */
export function buildSegments(scope: ReadingScope): ReadingSegment[] {
  const entries = eventsInReadingOrder(scope);
  if (entries.length === 0) return [];

  const bounds = scopeBounds(scope);
  const segments: ReadingSegment[] = [];
  let current: ReadingSegment | null = null;
  /** Höchstes Kapitel je Abschnitt, in dem wirklich ein Ereignis liegt. */
  const lastEventChapter: number[] = [];

  const noteEvent = (chapter: number) => {
    const index = segments.length - 1;
    lastEventChapter[index] = Math.max(lastEventChapter[index] ?? chapter, chapter);
  };

  for (const entry of entries) {
    const chapter = Math.floor(entry.position);

    // Ereignisse ohne Ort und Ereignisse am gleichen Ort hängen sich an den
    // laufenden Abschnitt, statt ihn aufzubrechen.
    const sameSegment =
      current !== null && (entry.event.placeId === null || current.placeId === entry.event.placeId);

    if (sameSegment) {
      current!.events.push(entry.event);
      noteEvent(chapter);
      continue;
    }

    // Ortswechsel. Eröffnet der Abschnitt sein Kapitel, beginnt er glatt bei
    // der Kapitelposition; wechselt der Ort mitten im Kapitel, zählt der Vers.
    const opensChapter: boolean =
      current === null || Math.floor(current.fromPosition) < chapter;

    current = {
      order: segments.length + 1,
      placeId: entry.event.placeId,
      fromPosition: opensChapter ? chapter : entry.position,
      toPosition: chapter + 1,
      events: [entry.event],
      extended: false,
    };
    segments.push(current);
    lastEventChapter.push(chapter);
  }

  // Jeder Abschnitt reicht bis genau dorthin, wo der nächste beginnt; der
  // letzte bis ans Ende des Lesebereichs.
  const scopeEnd = Math.floor(bounds.max) + 1;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const next = segments[i + 1];
    segment.toPosition = next ? next.fromPosition : scopeEnd;

    // Fortgeschrieben ist ein Abschnitt, wenn er über das letzte Kapitel mit
    // eigenem Ereignis hinausreicht.
    const lastChapter = lastEventChapter[i] ?? Math.floor(segment.fromPosition);
    segment.extended = Math.ceil(segment.toPosition) - 1 > lastChapter;
  }

  // Der erste Abschnitt beginnt am Anfang des Bereichs, damit vorangehende
  // Kapitel ohne Ereignis nicht ins Leere zeigen.
  const first = segments[0];
  if (first && first.fromPosition > bounds.min) {
    first.extended = true;
    first.fromPosition = bounds.min;
  }

  return segments;
}

/**
 * Der Abschnitt, der eine Position enthält.
 *
 * Halbseitig offen: `from <= position < to`. So gehört jede Position zu genau
 * einem Abschnitt, auch dort, wo zwei Orte sich ein Kapitel teilen.
 */
export function segmentAtPosition(
  segments: readonly ReadingSegment[],
  position: number,
): ReadingSegment | undefined {
  return segments.find(
    (segment) => position >= segment.fromPosition && position < segment.toPosition,
  );
}

/**
 * Der Abschnitt, in dem ein Kapitel **beginnt**.
 *
 * Wechselt der Ort mitten im Kapitel, liefert `segmentsInChapter` das
 * vollständige Bild.
 */
export function segmentAtChapter(
  segments: readonly ReadingSegment[],
  bookId: string,
  chapter: number,
): ReadingSegment | undefined {
  return segmentAtPosition(segments, canonicalPosition(bookId, chapter));
}

/**
 * Alle Abschnitte, die ein Kapitel berührt — meist einer, bei einem
 * Ortswechsel innerhalb des Kapitels mehrere.
 */
export function segmentsInChapter(
  segments: readonly ReadingSegment[],
  bookId: string,
  chapter: number,
): ReadingSegment[] {
  const start = canonicalPosition(bookId, chapter);
  const end = start + 1;
  return segments.filter(
    (segment) => segment.fromPosition < end && segment.toPosition > start,
  );
}

/** Beschriftung eines Abschnitts: „1. Mose 12" oder „1. Mose 14–20". */
export function segmentLabel(segment: ReadingSegment): string {
  const from = positionToRef(segment.fromPosition);
  // `toPosition` ist ausschließlich — das letzte enthaltene Kapitel liegt davor.
  const to = positionToRef(Math.ceil(segment.toPosition) - 1);
  if (!from || !to) return '';

  const fromBook = bookById.get(from.bookId)?.name ?? from.bookId;
  if (from.bookId === to.bookId) {
    return from.chapter === to.chapter
      ? `${fromBook} ${from.chapter}`
      : `${fromBook} ${from.chapter}–${to.chapter}`;
  }
  const toBook = bookById.get(to.bookId)?.name ?? to.bookId;
  return `${fromBook} ${from.chapter} – ${toBook} ${to.chapter}`;
}

/* ------------------------------------------------------------------ *
 * Karte
 * ------------------------------------------------------------------ */

/**
 * Die Abschnitte als `Journey` verpackt.
 *
 * `JourneyRoutes` zeichnet bereits genau das, was der Lesepfad braucht:
 * nummerierte Etappen mit Verbindungslinie. Statt eine zweite Komponente mit
 * demselben Verhalten zu bauen, bekommt sie hier eine synthetische Reise.
 */
export function toJourney(
  segments: readonly ReadingSegment[],
  scope: ReadingScope,
  colorToken: Section,
): Journey | null {
  const withPlace = segments.filter((segment) => segment.placeId !== null);
  if (withPlace.length < 2) return null;

  const years = segments.flatMap((segment) => segment.events.map((event) => event.year));

  return {
    id: `lesepfad-${scope.kind}-${scope.id}`,
    title: scope.kind === 'buch' ? (bookById.get(scope.id)?.name ?? scope.id) : scope.id,
    personIds: [],
    yearStart: years.length ? Math.min(...years) : 0,
    yearEnd: years.length ? Math.max(...years) : 0,
    colorToken,
    description: '',
    // Nach dem Aussortieren ortloser Abschnitte neu durchnummerieren, damit
    // die Etappen auf der Karte lückenlos 1…n zählen.
    legs: withPlace.map((segment, index) => ({
      placeId: segment.placeId!,
      order: index + 1,
      ...(segment.events[0] ? { eventId: segment.events[0].id } : {}),
      note: segmentLabel(segment),
    })),
    routeCertainty: 'hoch',
  };
}

/* ------------------------------------------------------------------ *
 * Achsenmarken
 * ------------------------------------------------------------------ */

/** Abstufungen für Kapitelmarken. */
const CHAPTER_STEPS = [1, 2, 5, 10, 25, 50, 100] as const;

export function chooseChapterStep(pixelsPerChapter: number): number {
  for (const step of CHAPTER_STEPS) {
    if (step * pixelsPerChapter >= 72) return step;
  }
  return 100;
}

/**
 * Marken für die Kapitelachse.
 *
 * Anders als bei Jahren sitzen sie auf runden Kapitelzahlen **innerhalb**
 * jedes Buchs — die fortlaufende Position ist eine Rechengröße, niemand denkt
 * in „Kapitel 137 des Kanons". Buchanfänge bekommen eine hervorgehobene Marke,
 * wie die Zeitenwende auf der Jahresachse.
 */
export function generateChapterTicks(from: number, to: number, step: number): Tick[] {
  const ticks: Tick[] = [];
  const seen = new Set<number>();

  const push = (position: number, epochBoundary: boolean, label: string) => {
    const rounded = Math.round(position);
    if (rounded < from || rounded > to || seen.has(rounded)) return;
    seen.add(rounded);
    ticks.push({ year: rounded, epochBoundary, label });
  };

  for (const book of books) {
    const offset = chapterOffset.get(book.id) ?? 0;
    const bookStart = offset + 1;
    const bookEnd = offset + book.chapters;
    if (bookEnd < from || bookStart > to) continue;

    // Der Buchanfang immer, unabhängig von der Schrittweite.
    push(bookStart, true, `${book.name} 1`);

    for (let chapter = step; chapter <= book.chapters; chapter += step) {
      if (chapter === 1) continue;
      push(offset + chapter, false, String(chapter));
    }
  }

  ticks.sort((a, b) => a.year - b.year);
  return ticks;
}
