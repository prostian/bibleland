import { describe, expect, it } from 'vitest';

import type { BibleEvent } from '@/types';
import {
  HIT_PADDING,
  LANE_HEIGHT,
  MARKER_GAP,
  MARKER_SIZE,
  MAX_SPAN_YEARS,
  MIN_SPAN_YEARS,
  centerOn,
  chooseTickStep,
  createScale,
  generateTicks,
  hiddenCount,
  laneCount,
  packEvents,
  panRange,
  rangeAround,
  visibleSlice,
  zoomLevelOf,
  zoomRange,
} from '@/lib/timelineScale';
import { MAX_YEAR, MIN_YEAR } from '@/lib/year';

/** Minimales Ereignis — nur die Felder, die der Zeitstrahl anfasst. */
function ev(id: string, year: number, yearEnd?: number): BibleEvent {
  return {
    id,
    title: id,
    year,
    ...(yearEnd !== undefined ? { yearEnd } : {}),
    certainty: 'hoch',
    section: 'pentateuch',
    eventType: 'lehre',
    ref: { bookId: 'gen', chapter: 1 },
    placeId: null,
    personIds: [],
    periodId: 'urgeschichte',
    description: '',
    tags: [],
  };
}

describe('createScale', () => {
  it('bildet Anfang und Ende auf 0 und die volle Breite ab', () => {
    const scale = createScale(-1000, -900, 1000);
    expect(scale.valueToX(-1000)).toBeCloseTo(0);
    expect(scale.valueToX(-900)).toBeCloseTo(1000);
  });

  it('ist umkehrbar', () => {
    const scale = createScale(-2200, 100, 2300);
    for (const year of [-2000, -586, -1, 1, 33]) {
      expect(scale.xToValue(scale.valueToX(year))).toBe(year);
    }
  });

  it('überspringt an der Zeitenwende kein Jahr — 1 v. Chr. und 1 n. Chr. liegen genau ein Jahr auseinander', () => {
    const scale = createScale(-10, 10, 200);
    const abstand = scale.valueToX(1) - scale.valueToX(-1);
    expect(abstand).toBeCloseTo(scale.pixelsPerUnit);
  });

  it('zählt von 10 v. Chr. bis 10 n. Chr. neunzehn Jahre, nicht zwanzig', () => {
    // Weil es kein Jahr 0 gibt. Genau hier läge sonst ein Jahr Fehler.
    const scale = createScale(-10, 10, 190);
    expect(scale.pixelsPerUnit).toBeCloseTo(10);
  });

  it('verhindert Division durch null bei entarteter Spanne', () => {
    const scale = createScale(-500, -500, 800);
    expect(Number.isFinite(scale.pixelsPerUnit)).toBe(true);
    expect(scale.pixelsPerUnit).toBeGreaterThan(0);
  });
});

describe('zoomLevelOf', () => {
  it('zeigt Jahrhunderte, wenn wenig Platz pro Jahr bleibt', () => {
    expect(zoomLevelOf(0.2)).toBe('jahrhundert');
  });

  it('zeigt Jahrzehnte im mittleren Bereich', () => {
    expect(zoomLevelOf(1)).toBe('jahrzehnt');
  });

  it('zeigt Einzeljahre, wenn genug Platz ist', () => {
    expect(zoomLevelOf(12)).toBe('jahr');
  });
});

describe('chooseTickStep', () => {
  it('wählt bei starkem Herauszoomen große Schritte', () => {
    expect(chooseTickStep(2300 / 2300)).toBeGreaterThanOrEqual(100);
  });

  it('wählt bei starkem Hineinzoomen den Einzeljahrschritt', () => {
    expect(chooseTickStep(200)).toBe(1);
  });

  it('liefert immer einen Schritt aus der erlaubten Menge', () => {
    const erlaubt = new Set([1000, 500, 250, 100, 50, 25, 10, 5, 1]);
    for (const ppy of [0.01, 0.1, 0.5, 1, 3, 9, 40, 500]) {
      expect(erlaubt.has(chooseTickStep(ppy))).toBe(true);
    }
  });
});

describe('generateTicks', () => {
  it('setzt Marken auf runde historische Jahre vor Christus', () => {
    const jahre = generateTicks(-2200, -1900, 100).map((t) => t.year);
    expect(jahre).toEqual([-2200, -2100, -2000, -1900]);
  });

  it('erzeugt kein Jahr 0, sondern eine Marke im Jahr 1', () => {
    const jahre = generateTicks(-200, 200, 100).map((t) => t.year);
    expect(jahre).not.toContain(0);
    expect(jahre).toContain(1);
  });

  it('kennzeichnet die Zeitenwende', () => {
    const wende = generateTicks(-100, 100, 50).find((t) => t.epochBoundary);
    expect(wende?.year).toBe(1);
  });

  it('liefert die Marken chronologisch aufsteigend', () => {
    const jahre = generateTicks(-2200, 100, 500).map((t) => t.year);
    const sortiert = [...jahre].sort((a, b) => a - b);
    expect(jahre).toEqual(sortiert);
  });

  it('bleibt innerhalb des angefragten Ausschnitts', () => {
    for (const tick of generateTicks(-850, -430, 50)) {
      expect(tick.year).toBeGreaterThanOrEqual(-850);
      expect(tick.year).toBeLessThanOrEqual(-430);
    }
  });

  it('kommt mit einem Ausschnitt ganz nach Christus zurecht', () => {
    const jahre = generateTicks(30, 100, 25).map((t) => t.year);
    expect(jahre).toEqual([50, 75, 100]);
  });
});

describe('zoomRange', () => {
  it('verkleinert die Spanne beim Hineinzoomen', () => {
    const vorher = { from: -2200, to: 100 };
    const nachher = zoomRange(vorher, 0.5, -1000);
    expect(nachher.to - nachher.from).toBeLessThan(vorher.to - vorher.from);
  });

  it('hält den Ankerpunkt an derselben relativen Stelle', () => {
    const vorher = { from: -1000, to: -800 };
    const anteilVorher = (-900 - vorher.from) / (vorher.to - vorher.from);
    const nachher = zoomRange(vorher, 0.5, -900);
    const anteilNachher = (-900 - nachher.from) / (nachher.to - nachher.from);
    expect(anteilNachher).toBeCloseTo(anteilVorher, 1);
  });

  it('zoomt nicht über den Gesamtzeitraum hinaus', () => {
    const nachher = zoomRange({ from: -2200, to: 100 }, 10, -1000);
    expect(nachher.from).toBeGreaterThanOrEqual(MIN_YEAR);
    expect(nachher.to).toBeLessThanOrEqual(MAX_YEAR);
    expect(nachher.to - nachher.from).toBeLessThanOrEqual(MAX_SPAN_YEARS + 1);
  });

  it('zoomt nicht unter die Mindestspanne', () => {
    let range = { from: -1000, to: -900 };
    for (let i = 0; i < 20; i++) range = zoomRange(range, 0.5, -950);
    expect(range.to - range.from).toBeGreaterThanOrEqual(MIN_SPAN_YEARS - 1);
  });
});

describe('panRange', () => {
  it('verschiebt den Ausschnitt um die angegebene Anzahl Jahre', () => {
    const nachher = panRange({ from: -1000, to: -900 }, 50);
    expect(nachher.from).toBe(-950);
    expect(nachher.to).toBe(-850);
  });

  it('legt am linken Rand an, statt darüber hinauszulaufen', () => {
    const nachher = panRange({ from: -2200, to: -2000 }, -500);
    expect(nachher.from).toBe(MIN_YEAR);
    expect(nachher.to - nachher.from).toBe(200);
  });

  it('legt am rechten Rand an', () => {
    const nachher = panRange({ from: -100, to: 100 }, 500);
    expect(nachher.to).toBe(MAX_YEAR);
  });
});

describe('centerOn und rangeAround', () => {
  it('zentriert ein Jahr unter Beibehaltung der Spanne', () => {
    const vorher = { from: -1000, to: -800 };
    const nachher = centerOn(vorher, -500);
    expect(nachher.to - nachher.from).toBe(vorher.to - vorher.from);
    expect((nachher.from + nachher.to) / 2).toBeCloseTo(-500, 0);
  });

  it('umschließt einen Zeitraum mit Luft an beiden Seiten', () => {
    const nachher = rangeAround(49, 52);
    expect(nachher.from).toBeLessThan(49);
    expect(nachher.to).toBeGreaterThan(52);
  });
});

describe('packEvents', () => {
  const scale = createScale(-100, 100, 2000); // 10 px pro Jahr

  it('legt weit auseinanderliegende Ereignisse alle in die erste Zeile', () => {
    const packed = packEvents([ev('a', -100), ev('b', -50), ev('c', 50)], scale);
    expect(packed.every((p) => p.lane === 0)).toBe(true);
  });

  it('schiebt kollidierende Ereignisse in weitere Zeilen', () => {
    const packed = packEvents([ev('a', 1), ev('b', 1), ev('c', 1)], scale);
    expect(new Set(packed.map((p) => p.lane)).size).toBe(3);
  });

  it('überlappt innerhalb einer Zeile nie', () => {
    const events = Array.from({ length: 60 }, (_, i) => ev(`e${i}`, -100 + Math.floor(i / 3)));
    const packed = packEvents(events, scale, { markerWidth: 12, gap: 4 }).filter((p) => p.lane >= 0);

    const byLane = new Map<number, typeof packed>();
    for (const item of packed) {
      const bucket = byLane.get(item.lane) ?? [];
      bucket.push(item);
      byLane.set(item.lane, bucket);
    }
    for (const bucket of byLane.values()) {
      bucket.sort((a, b) => a.x - b.x);
      for (let i = 1; i < bucket.length; i++) {
        const prev = bucket[i - 1]!;
        const cur = bucket[i]!;
        expect(cur.x).toBeGreaterThanOrEqual(prev.x + prev.width);
      }
    }
  });

  it('gibt Zeiträumen eine Breite, die ihrer Dauer entspricht', () => {
    const packed = packEvents([ev('lang', 1, 51)], scale);
    expect(packed[0]!.width).toBeCloseTo(50 * scale.pixelsPerUnit, 6);
  });

  it('gibt punktförmigen Ereignissen die Mindestbreite', () => {
    const packed = packEvents([ev('punkt', 1)], scale, { markerWidth: 12 });
    expect(packed[0]!.width).toBe(12);
  });

  it('überschreitet die Zeilenobergrenze nicht', () => {
    const events = Array.from({ length: 100 }, (_, i) => ev(`e${i}`, 1));
    const packed = packEvents(events, scale, { maxLanes: 5 });
    expect(laneCount(packed)).toBeLessThanOrEqual(5);
  });

  it('stapelt überzählige Ereignisse nicht, sondern meldet sie als verborgen', () => {
    const events = Array.from({ length: 100 }, (_, i) => ev(`e${i}`, 1));
    const packed = packEvents(events, scale, { maxLanes: 5 });

    // Fünf finden Platz, der Rest bekommt lane -1 und wird nicht gezeichnet.
    expect(packed.filter((p) => p.lane >= 0)).toHaveLength(5);
    expect(hiddenCount(packed)).toBe(95);
  });

  it('meldet nichts als verborgen, wenn alles Platz hat', () => {
    const packed = packEvents([ev('a', -100), ev('b', -50), ev('c', 50)], scale);
    expect(hiddenCount(packed)).toBe(0);
  });

  it('hält die anklickbaren Flächen benachbarter Marker auseinander', () => {
    // Die Trefferfläche ragt links und rechts um HIT_PADDING über den Punkt
    // hinaus. Überlappten sich zwei davon, träfe ein Klick am Rand das
    // falsche Ereignis — genau der Grund, warum MARKER_GAP an HIT_PADDING
    // gekoppelt ist.
    const events = Array.from({ length: 40 }, (_, i) => ev(`e${i}`, -100 + Math.floor(i / 4)));
    const packed = packEvents(events, scale, {
      markerWidth: MARKER_SIZE,
      gap: MARKER_GAP,
    }).filter((p) => p.lane >= 0);

    const byLane = new Map<number, typeof packed>();
    for (const item of packed) {
      const bucket = byLane.get(item.lane) ?? [];
      bucket.push(item);
      byLane.set(item.lane, bucket);
    }

    for (const bucket of byLane.values()) {
      bucket.sort((a, b) => a.x - b.x);
      for (let i = 1; i < bucket.length; i++) {
        const links = bucket[i - 1]!;
        const rechts = bucket[i]!;
        const rechteKanteLinks = links.x + links.width + HIT_PADDING;
        const linkeKanteRechts = rechts.x - HIT_PADDING;
        expect(linkeKanteRechts).toBeGreaterThanOrEqual(rechteKanteLinks);
      }
    }
  });

  it('macht die Zeilenhöhe so groß wie die Trefferfläche', () => {
    // Sonst überlappen sich die Flächen übereinanderliegender Zeilen.
    expect(LANE_HEIGHT).toBe(MARKER_SIZE + HIT_PADDING * 2);
  });

  it('ist stabil — gleiche Eingabe ergibt gleiche Zeilen, unabhängig von der Reihenfolge', () => {
    const events = [ev('c', 10), ev('a', 1), ev('b', 5)];
    const ersteZuweisung = packEvents(events, scale);
    const zweiteZuweisung = packEvents([...events].reverse(), scale);
    const alsPaare = (p: typeof ersteZuweisung) =>
      p.map((i) => `${i.event.id}:${i.lane}`).sort();
    expect(alsPaare(ersteZuweisung)).toEqual(alsPaare(zweiteZuweisung));
  });
});

describe('visibleSlice', () => {
  const scale = createScale(-2200, 100, 23000);
  const events = Array.from({ length: 200 }, (_, i) => ev(`e${i}`, -2200 + i * 11));
  const packed = packEvents(events, scale);

  it('liefert nur, was im Ausschnitt liegt', () => {
    const sichtbar = visibleSlice(packed, 1000, 0, 0);
    expect(sichtbar.length).toBeGreaterThan(0);
    expect(sichtbar.length).toBeLessThan(packed.length);
    for (const item of sichtbar) expect(item.x).toBeLessThanOrEqual(1000);
  });

  it('nimmt mit Überhang mehr mit als ohne', () => {
    expect(visibleSlice(packed, 1000, 500, 0.5).length).toBeGreaterThanOrEqual(
      visibleSlice(packed, 1000, 500, 0).length,
    );
  });
});
