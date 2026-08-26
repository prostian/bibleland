import { describe, expect, it } from 'vitest';

import { bookById } from '@/lib/dataset';
import {
  buildSegments,
  canonicalPosition,
  eventsInReadingOrder,
  generateChapterTicks,
  positionToRef,
  scopeBounds,
  segmentAtChapter,
  segmentLabel,
  segmentsInChapter,
  toJourney,
} from '@/lib/readingPath';

const GENESIS = { kind: 'buch', id: 'gen' } as const;
const PENTATEUCH = { kind: 'abschnitt', id: 'pentateuch' } as const;

describe('canonicalPosition', () => {
  it('beginnt den Kanon bei 1', () => {
    expect(canonicalPosition('gen', 1)).toBe(1);
  });

  it('zählt über Buchgrenzen hinweg weiter — 1. Mose 50 liegt vor 2. Mose 1', () => {
    expect(canonicalPosition('gen', 50)).toBeLessThan(canonicalPosition('ex', 1));
    expect(canonicalPosition('ex', 1)).toBe(51);
  });

  it('ordnet innerhalb eines Kapitels nach dem Vers', () => {
    expect(canonicalPosition('gen', 12, 1)).toBeLessThan(canonicalPosition('gen', 12, 9));
    // Der Vers darf die ganzzahlige Kapitelposition nicht verschieben.
    expect(Math.floor(canonicalPosition('gen', 12, 999))).toBe(12);
  });

  it('ist umkehrbar', () => {
    for (const [bookId, chapter] of [
      ['gen', 1],
      ['gen', 50],
      ['ex', 1],
      ['offb', 22],
    ] as const) {
      expect(positionToRef(canonicalPosition(bookId, chapter))).toEqual({ bookId, chapter });
    }
  });
});

describe('scopeBounds', () => {
  it('umfasst bei einem Buch genau dessen Kapitel', () => {
    expect(scopeBounds(GENESIS)).toEqual({ min: 1, max: 50 });
  });

  it('läuft bei einem Abschnitt durchgehend vom ersten bis zum letzten Buch', () => {
    const bounds = scopeBounds(PENTATEUCH);
    expect(bounds.min).toBe(canonicalPosition('gen', 1));
    expect(bounds.max).toBe(canonicalPosition('dtn', bookById.get('dtn')!.chapters));
  });
});

describe('eventsInReadingOrder', () => {
  it('sortiert kanonisch, nicht chronologisch', () => {
    const entries = eventsInReadingOrder(GENESIS);
    const positions = entries.map((e) => e.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('setzt die Urgeschichte an den Anfang, obwohl sie symbolisch datiert ist', () => {
    const entries = eventsInReadingOrder(GENESIS);
    expect(entries[0]?.event.id).toBe('schoepfung');
  });

  it('führt jedes Ereignis nur einmal', () => {
    const ids = eventsInReadingOrder(PENTATEUCH).map((e) => e.event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('erfasst im Abschnitt mehr als in einem einzelnen Buch daraus', () => {
    expect(eventsInReadingOrder(PENTATEUCH).length).toBeGreaterThan(
      eventsInReadingOrder(GENESIS).length,
    );
  });
});

describe('buildSegments', () => {
  const segments = buildSegments(GENESIS);

  it('liefert für 1. Mose mehrere Ortsabschnitte', () => {
    expect(segments.length).toBeGreaterThan(5);
  });

  it('nummeriert lückenlos ab 1', () => {
    expect(segments.map((s) => s.order)).toEqual(segments.map((_, i) => i + 1));
  });

  it('beginnt am ersten Kapitel des Bereichs', () => {
    expect(segments[0]?.fromPosition).toBe(1);
  });

  it('reicht mit dem letzten Abschnitt bis hinter das Schlusskapitel', () => {
    // `toPosition` ist ausschließlich, also 51 für ein Buch mit 50 Kapiteln.
    expect(segments[segments.length - 1]?.toPosition).toBe(51);
  });

  it('lückt nicht — jeder Kapitelanfang fällt in genau einen Abschnitt', () => {
    for (let chapter = 1; chapter <= 50; chapter++) {
      const position = canonicalPosition('gen', chapter);
      const treffer = segments.filter(
        (s) => position >= s.fromPosition && position < s.toPosition,
      );
      expect(treffer, `Kapitel ${chapter}`).toHaveLength(1);
    }
  });

  it('kachelt die Achse lückenlos und überlappungsfrei', () => {
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.fromPosition).toBe(segments[i - 1]!.toPosition);
    }
  });

  it('fasst aufeinanderfolgende Ereignisse am selben Ort zu einem Abschnitt zusammen', () => {
    for (let i = 1; i < segments.length; i++) {
      const vorher = segments[i - 1]!.placeId;
      const jetzt = segments[i]!.placeId;
      if (vorher !== null && jetzt !== null) expect(jetzt).not.toBe(vorher);
    }
  });

  it('schreibt den Ort über Kapitel ohne eigenes Ereignis fort', () => {
    // Genau das ist der Kern: Es muss Abschnitte geben, die länger sind als
    // das Kapitel ihres Ereignisses.
    expect(segments.some((s) => s.extended)).toBe(true);
    expect(segments.some((s) => s.toPosition > s.fromPosition)).toBe(true);
  });

  it('gibt bei einem Buch ohne Ereignisse nichts zurück', () => {
    // 3. Mose erzählt keine Handlung an Orten.
    expect(buildSegments({ kind: 'buch', id: 'lev' })).toEqual([]);
  });

  it('läuft auch über einen ganzen Abschnitt durch', () => {
    const pentateuch = buildSegments(PENTATEUCH);
    expect(pentateuch.length).toBeGreaterThan(segments.length);
    expect(pentateuch[pentateuch.length - 1]?.toPosition).toBe(
      canonicalPosition('dtn', bookById.get('dtn')!.chapters) + 1,
    );
  });
});

describe('Ereignisse ohne Ort', () => {
  it('brechen einen Abschnitt nicht auf', () => {
    // Kein Abschnitt darf einen Ort haben und dennoch nur aus ortlosen
    // Ereignissen bestehen — und ortlose Ereignisse dürfen keinen eigenen
    // Abschnitt mitten in der Erzählung erzwingen.
    const segments = buildSegments(GENESIS);
    const ortlose = segments.filter((s) => s.placeId === null);
    // In 1. Mose steht die ortlose Schöpfung am Anfang; danach darf kein
    // weiterer ortloser Abschnitt mehr auftauchen.
    expect(ortlose.length).toBeLessThanOrEqual(1);
  });

  it('hängen sich an den laufenden Abschnitt', () => {
    const segments = buildSegments(GENESIS);
    const mitOrt = segments.filter((s) => s.placeId !== null);
    const ortloseEreignisse = mitOrt.flatMap((s) =>
      s.events.filter((e) => e.placeId === null),
    );
    // „Die Völkertafel" und ähnliche ortlose Ereignisse landen in einem
    // Abschnitt mit Ort, statt einen eigenen zu erzeugen.
    expect(ortloseEreignisse.length).toBeGreaterThan(0);
  });
});

describe('segmentAtChapter', () => {
  const segments = buildSegments(GENESIS);

  it('findet für ein Kapitel mit Ereignis den passenden Abschnitt', () => {
    const segment = segmentAtChapter(segments, 'gen', 40);
    expect(segment).toBeDefined();
    expect(segment!.events.length).toBeGreaterThan(0);
  });

  it('liefert bei einem Ortswechsel im Kapitel alle beteiligten Abschnitte', () => {
    // 1. Mose 12 beginnt in Haran (Vers 1: der Ruf an Abram) und endet in
    // Sichem (Vers 6: Ankunft in Kanaan). Beides gehört zu Kapitel 12.
    const imKapitel = segmentsInChapter(segments, 'gen', 12);
    expect(imKapitel.length).toBeGreaterThan(1);

    const ereignisse = imKapitel.flatMap((s) => s.events.map((e) => e.id));
    expect(ereignisse).toContain('abraham-berufung');
    expect(ereignisse).toContain('abraham-kanaan');
  });

  it('findet auch für ein Kapitel ohne eigenes Ereignis einen Abschnitt', () => {
    // Der eigentliche Nutzen: „Ich lese Kapitel 17 — wo bin ich?"
    for (const chapter of [17, 24, 31, 44]) {
      expect(segmentAtChapter(segments, 'gen', chapter), `Kapitel ${chapter}`).toBeDefined();
    }
  });

  it('gibt für ein Kapitel außerhalb des Bereichs nichts zurück', () => {
    expect(segmentAtChapter(segments, 'ex', 3)).toBeUndefined();
  });
});

describe('segmentLabel', () => {
  const seg = (fromPosition: number, toPosition: number) => ({
    order: 1,
    placeId: null,
    fromPosition,
    toPosition,
    events: [],
    extended: false,
  });

  it('nennt ein einzelnes Kapitel beim Namen', () => {
    expect(segmentLabel(seg(12, 13))).toBe('1. Mose 12');
  });

  it('schreibt eine Spanne als Bereich', () => {
    expect(segmentLabel(seg(14, 21))).toBe('1. Mose 14–20');
  });

  it('nennt bei einem Buchwechsel beide Bücher', () => {
    expect(segmentLabel(seg(49, 53))).toBe('1. Mose 49 – 2. Mose 2');
  });
});

describe('toJourney', () => {
  it('erzeugt aus den Abschnitten eine Route mit lückenloser Nummerierung', () => {
    const journey = toJourney(buildSegments(GENESIS), GENESIS, 'pentateuch');
    expect(journey).not.toBeNull();
    expect(journey!.legs.map((l) => l.order)).toEqual(journey!.legs.map((_, i) => i + 1));
  });

  it('lässt ortlose Abschnitte aus der Route heraus', () => {
    const journey = toJourney(buildSegments(GENESIS), GENESIS, 'pentateuch');
    expect(journey!.legs.every((leg) => leg.placeId)).toBe(true);
  });

  it('gibt nichts zurück, wenn es keine zwei Orte gibt', () => {
    expect(toJourney([], GENESIS, 'pentateuch')).toBeNull();
  });
});

describe('generateChapterTicks', () => {
  it('hebt den Buchanfang hervor', () => {
    const ticks = generateChapterTicks(1, 50, 10);
    expect(ticks[0]?.epochBoundary).toBe(true);
    expect(ticks[0]?.label).toBe('1. Mose 1');
  });

  it('beschriftet die übrigen Marken mit der Kapitelzahl im Buch', () => {
    const ticks = generateChapterTicks(1, 50, 10);
    expect(ticks.map((t) => t.label)).toContain('20');
  });

  it('markiert bei einem Abschnitt jeden Buchwechsel', () => {
    const bis = canonicalPosition('lev', 1);
    const grenzen = generateChapterTicks(1, bis, 25).filter((t) => t.epochBoundary);
    expect(grenzen.map((t) => t.label)).toEqual(['1. Mose 1', '2. Mose 1', '3. Mose 1']);
  });

  it('bleibt innerhalb des angefragten Ausschnitts', () => {
    for (const tick of generateChapterTicks(10, 30, 5)) {
      expect(tick.year).toBeGreaterThanOrEqual(10);
      expect(tick.year).toBeLessThanOrEqual(30);
    }
  });
});
