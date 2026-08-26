import type { BibleEvent } from '@/types';
import { MAX_YEAR, MIN_YEAR, fromContinuous, toContinuous } from '@/lib/year';

/**
 * Die Rechenlogik hinter dem Zeitstrahl: Umrechnung Wert ↔ Pixel, Erzeugung
 * der Achsenmarken und die Verteilung kollidierender Ereignisse auf Zeilen.
 *
 * Bewusst frei von React und DOM — so lässt sich das Heikle (Jahr Null,
 * Zoomgrenzen, Überlappungen) für sich testen, statt es aus einer gerenderten
 * Komponente herauszukitzeln.
 *
 * Der Strahl kennt **zwei Achsen**: Jahre für die chronologische Ansicht und
 * Kapitel für den Lesemodus. Was sie unterscheidet, steckt vollständig in
 * einer `AxisSpec`; Zoom, Verschiebung und Zeilenpackung wissen davon nichts
 * und funktionieren für beide unverändert.
 */

/* ------------------------------------------------------------------ *
 * Achsen
 * ------------------------------------------------------------------ */

/**
 * Was eine Achse ausmacht: wie ein Datenwert auf eine lückenlose
 * Rechenposition abgebildet wird, und wo ihre Grenzen liegen.
 *
 * Für Jahre ist die Abbildung nicht die Identität — es gibt kein Jahr 0, und
 * ohne die Korrektur klaffte an der Zeitenwende eine Lücke von einem Jahr.
 * Für Kapitel ist sie es, weil Kapitel lückenlos durchgezählt sind.
 */
export interface AxisSpec {
  toPosition: (value: number) => number;
  fromPosition: (position: number) => number;
  /** Grenzen in Datenwerten. */
  min: number;
  max: number;
  /** Kleinste sinnvolle Spanne, in Positionen. */
  minSpan: number;
}

/** Kleinster darstellbarer Ausschnitt der Zeitachse. Weniger als fünf Jahre ist sinnlos. */
export const MIN_SPAN_YEARS = 5;
/** Der gesamte Zeitraum der Anwendung. */
export const MAX_SPAN_YEARS = toContinuous(MAX_YEAR) - toContinuous(MIN_YEAR);

export const YEAR_AXIS: AxisSpec = {
  toPosition: toContinuous,
  fromPosition: fromContinuous,
  min: MIN_YEAR,
  max: MAX_YEAR,
  minSpan: MIN_SPAN_YEARS,
};

/**
 * Achse für den Lesemodus: fortlaufende Kapitelpositionen über den Kanon.
 *
 * Die Grenzen kommen vom gewählten Lesebereich — bei einem einzelnen Buch
 * dessen erstes und letztes Kapitel, bei einem Abschnitt die Spanne über
 * alle seine Bücher.
 */
export function chapterAxis(min: number, max: number): AxisSpec {
  return {
    toPosition: (value) => value,
    fromPosition: (position) => Math.round(position),
    min,
    max,
    // Unter zwei Kapiteln wird der Ausschnitt sinnlos.
    minSpan: 2,
  };
}

export type ZoomLevel = 'jahrhundert' | 'jahrzehnt' | 'jahr';

/* ------------------------------------------------------------------ *
 * Markergeometrie
 *
 * Steht hier und nicht bei der Komponente, weil die Packung dieselben Maße
 * braucht: Nur wenn Abstand und Trefferrand zusammenpassen, überschneiden
 * sich die anklickbaren Flächen benachbarter Marker nicht.
 * ------------------------------------------------------------------ */

/** Durchmesser des sichtbaren Punktes. */
export const MARKER_SIZE = 10;

/**
 * Unsichtbarer Rand um den Punkt, der mitklickbar ist. Ohne ihn wäre die
 * Trefferfläche exakt zehn mal zehn Pixel groß — mit der Maus kaum zu
 * treffen, mit dem Finger gar nicht.
 */
export const HIT_PADDING = 4;

/** Höhe einer Zeile: genau die Höhe einer Trefferfläche, also überlappungsfrei. */
export const LANE_HEIGHT = MARKER_SIZE + HIT_PADDING * 2;

/** Mindestabstand zweier Marker derselben Zeile — passend zum Trefferrand. */
export const MARKER_GAP = HIT_PADDING * 2;

/* ------------------------------------------------------------------ *
 * Skala
 * ------------------------------------------------------------------ */

export interface TimelineScale {
  from: number;
  to: number;
  width: number;
  axis: AxisSpec;
  /** Pixel pro Einheit — Jahr oder Kapitel, je nach Achse. Der Zoomfaktor. */
  pixelsPerUnit: number;
  valueToX: (value: number) => number;
  xToValue: (x: number) => number;
}

export function createScale(
  from: number,
  to: number,
  width: number,
  axis: AxisSpec = YEAR_AXIS,
): TimelineScale {
  const p0 = axis.toPosition(from);
  const p1 = axis.toPosition(to);
  const span = Math.max(p1 - p0, axis.minSpan);
  const pixelsPerUnit = width / span;

  return {
    from,
    to,
    width,
    axis,
    pixelsPerUnit,
    valueToX: (value) => (axis.toPosition(value) - p0) * pixelsPerUnit,
    xToValue: (x) => axis.fromPosition(p0 + x / pixelsPerUnit),
  };
}

/**
 * Die Zoomstufe folgt aus der Auflösung, nicht aus einem Zähler. So passt
 * die Achsenbeschriftung immer zum tatsächlich Sichtbaren — egal ob der
 * Nutzer gescrollt, gezogen oder das Fenster verkleinert hat.
 */
export function zoomLevelOf(pixelsPerYear: number): ZoomLevel {
  if (pixelsPerYear < 0.4) return 'jahrhundert';
  if (pixelsPerYear < 4) return 'jahrzehnt';
  return 'jahr';
}

export const ZOOM_LEVEL_LABEL: Record<ZoomLevel, string> = {
  jahrhundert: 'Jahrhunderte',
  jahrzehnt: 'Jahrzehnte',
  jahr: 'Einzeljahre',
};

/**
 * Abstufungen, in denen Achsenmarken sitzen dürfen — aufsteigend, weil
 * `chooseTickStep` die *feinste* noch lesbare Abstufung sucht.
 */
const TICK_STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000] as const;

/** Angestrebter Mindestabstand zweier beschrifteter Marken in Pixeln. */
const MIN_TICK_SPACING = 88;

/**
 * Die kleinste Schrittweite, bei der zwei Marken noch weit genug
 * auseinanderliegen. Von fein nach grob durchgehen ist wesentlich: Andersherum
 * wäre die Bedingung schon beim ersten, gröbsten Schritt erfüllt, und die
 * Achse zeigte auch bei starkem Hineinzoomen noch Jahrtausendmarken.
 */
export function chooseTickStep(pixelsPerYear: number): number {
  for (const step of TICK_STEPS) {
    if (step * pixelsPerYear >= MIN_TICK_SPACING) return step;
  }
  // Selbst die gröbste Abstufung ist noch zu eng — dann bleibt es bei ihr.
  return 1000;
}

export interface Tick {
  /** Der Wert auf der Achse — Jahr oder Kapitelposition. */
  year: number;
  /** Wird hervorgehoben: die Zeitenwende, im Lesemodus ein Buchwechsel. */
  epochBoundary: boolean;
  /** Abweichende Beschriftung; sonst wird der Wert formatiert. */
  label?: string;
}

/**
 * Achsenmarken für einen Ausschnitt der **Zeitachse**.
 *
 * Die Marken sitzen auf runden **historischen** Jahren, nicht auf runden
 * Werten der internen Skala — sonst stünde an der Achse „101 v. Chr." statt
 * „100 v. Chr.". Die Zeitenwende bekommt eine eigene Marke im Jahr 1, weil
 * es kein Jahr 0 gibt, an dem sie sitzen könnte.
 */
export function generateTicks(from: number, to: number, step: number): Tick[] {
  const ticks: Tick[] = [];
  const seen = new Set<number>();

  const push = (year: number, epochBoundary = false) => {
    if (year < from || year > to || seen.has(year)) return;
    seen.add(year);
    ticks.push({ year, epochBoundary });
  };

  // Vor Christus: von der größten Jahreszahl abwärts, damit -2200, -2100 …
  // herauskommt und nicht -2153, -2053 …
  if (from < 0) {
    const startMagnitude = Math.ceil(Math.abs(from) / step) * step;
    for (let magnitude = startMagnitude; magnitude >= step; magnitude -= step) {
      push(-magnitude);
    }
  }

  push(1, true);

  for (let year = step; year <= to; year += step) push(year);

  ticks.sort((a, b) => toContinuous(a.year) - toContinuous(b.year));
  return ticks;
}

/* ------------------------------------------------------------------ *
 * Zoom und Verschiebung
 * ------------------------------------------------------------------ */

export interface Range {
  from: number;
  to: number;
}

function clampSpan(p0: number, p1: number, axis: AxisSpec): { p0: number; p1: number } {
  const limitLow = axis.toPosition(axis.min);
  const limitHigh = axis.toPosition(axis.max);
  const maxSpan = limitHigh - limitLow;
  let span = Math.min(Math.max(p1 - p0, axis.minSpan), maxSpan);

  let start = p0;
  // Nicht über die Ränder hinausziehen, sondern am Rand anlegen.
  if (start < limitLow) start = limitLow;
  if (start + span > limitHigh) start = limitHigh - span;
  if (start < limitLow) {
    start = limitLow;
    span = maxSpan;
  }
  return { p0: start, p1: start + span };
}

/**
 * Um einen Ankerpunkt zoomen. `factor` < 1 vergrößert (näher heran),
 * > 1 verkleinert. Der Anker bleibt dabei unter dem Mauszeiger stehen —
 * ohne das fühlt sich Rad-Zoom nach Verrutschen an.
 */
export function zoomRange(
  range: Range,
  factor: number,
  anchorValue: number,
  axis: AxisSpec = YEAR_AXIS,
): Range {
  const p0 = axis.toPosition(range.from);
  const p1 = axis.toPosition(range.to);
  const anchor = Math.min(Math.max(axis.toPosition(anchorValue), p0), p1);
  const ratio = p1 === p0 ? 0.5 : (anchor - p0) / (p1 - p0);

  const maxSpan = axis.toPosition(axis.max) - axis.toPosition(axis.min);
  const newSpan = Math.min(Math.max((p1 - p0) * factor, axis.minSpan), maxSpan);
  const clamped = clampSpan(anchor - newSpan * ratio, anchor - newSpan * ratio + newSpan, axis);

  return { from: axis.fromPosition(clamped.p0), to: axis.fromPosition(clamped.p1) };
}

/** Ausschnitt um eine Anzahl Einheiten verschieben. */
export function panRange(range: Range, delta: number, axis: AxisSpec = YEAR_AXIS): Range {
  const clamped = clampSpan(
    axis.toPosition(range.from) + delta,
    axis.toPosition(range.to) + delta,
    axis,
  );
  return { from: axis.fromPosition(clamped.p0), to: axis.fromPosition(clamped.p1) };
}

/** Ausschnitt so setzen, dass ein Wert zentriert erscheint. */
export function centerOn(range: Range, value: number, axis: AxisSpec = YEAR_AXIS): Range {
  const span = axis.toPosition(range.to) - axis.toPosition(range.from);
  const center = axis.toPosition(value);
  const clamped = clampSpan(center - span / 2, center + span / 2, axis);
  return { from: axis.fromPosition(clamped.p0), to: axis.fromPosition(clamped.p1) };
}

/** Ausschnitt, der einen Bereich mit etwas Luft umschließt. */
export function rangeAround(
  from: number,
  to: number,
  paddingRatio = 0.15,
  axis: AxisSpec = YEAR_AXIS,
): Range {
  const p0 = axis.toPosition(from);
  const p1 = axis.toPosition(to);
  const span = Math.max(p1 - p0, axis.minSpan);
  const pad = span * paddingRatio;
  const clamped = clampSpan(p0 - pad, p1 + pad, axis);
  return { from: axis.fromPosition(clamped.p0), to: axis.fromPosition(clamped.p1) };
}

/* ------------------------------------------------------------------ *
 * Zeilenverteilung
 * ------------------------------------------------------------------ */

export interface PackedEvent {
  event: BibleEvent;
  /** Linke Kante in Pixeln. */
  x: number;
  /** Breite in Pixeln — bei Spannen die Ausdehnung, sonst die Markerbreite. */
  width: number;
  /**
   * Zeile, beginnend bei 0. **-1** bedeutet: Das Ereignis hat in der
   * verfügbaren Höhe keinen Platz gefunden.
   *
   * Solche Ereignisse werden nicht gezeichnet. Sie in die unterste Zeile zu
   * quetschen — wie es eine frühere Fassung tat — erzeugt einen Klumpen
   * übereinanderliegender Punkte, von denen sich keiner mehr anklicken
   * lässt. Ein ehrlicher Hinweis „N passen nicht" ist brauchbarer als ein
   * unbedienbarer Haufen.
   */
  lane: number;
}

/** Wo ein Ereignis auf der aktuellen Achse beginnt und endet. */
export interface EventSpan {
  start: number;
  end: number;
}

export interface PackOptions {
  /** Grundbreite eines punktförmigen Ereignisses. */
  markerWidth?: number;
  /** Mindestabstand zwischen zwei Markern derselben Zeile. */
  gap?: number;
  /** Mehr Zeilen werden nicht vergeben; Überzählige bekommen lane -1. */
  maxLanes?: number;
  /**
   * Wo das Ereignis auf der Achse liegt.
   *
   * Der Ersatzwert liest Jahr und Endjahr. Im Lesemodus wird stattdessen die
   * Kapitelposition geliefert — dadurch funktioniert dieselbe Packung für
   * beide Achsen, ohne dass sie etwas über Jahre oder Kapitel wissen muss.
   */
  positionOf?: (event: BibleEvent) => EventSpan;
}

const YEAR_SPAN = (event: BibleEvent): EventSpan => ({
  start: event.year,
  end: event.yearEnd ?? event.year,
});

/**
 * Verteilt Ereignisse so auf Zeilen, dass sich in einer Zeile nichts
 * überlappt.
 *
 * Greedy von links nach rechts: Jedes Ereignis kommt in die oberste Zeile,
 * die rechts noch frei ist. Das ist nicht die theoretisch dichteste
 * Packung, aber es hält die Ordnung von links nach rechts intakt und ist
 * stabil — dieselbe Eingabe ergibt immer dasselbe Bild, was beim Zoomen
 * wichtiger ist als ein paar gesparte Zeilen.
 */
export function packEvents(
  events: readonly BibleEvent[],
  scale: TimelineScale,
  options: PackOptions = {},
): PackedEvent[] {
  const { markerWidth = 12, gap = 4, maxLanes = 14, positionOf = YEAR_SPAN } = options;

  const sorted = [...events].sort((a, b) => {
    const diff =
      scale.axis.toPosition(positionOf(a).start) - scale.axis.toPosition(positionOf(b).start);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  // Rechte Kante der letzten Belegung je Zeile.
  const laneEnds: number[] = [];
  const packed: PackedEvent[] = [];

  for (const event of sorted) {
    const span = positionOf(event);
    const x = scale.valueToX(span.start);
    const spanEnd = scale.valueToX(span.end);
    const width = Math.max(markerWidth, spanEnd - x);

    let lane = laneEnds.findIndex((end) => x >= end + gap);
    if (lane === -1) {
      if (laneEnds.length < maxLanes) {
        lane = laneEnds.length;
        laneEnds.push(0);
      } else {
        // Kein Platz mehr. Das Ereignis wird ausgelassen und gezählt statt
        // in die unterste Zeile gestapelt.
        packed.push({ event, x, width, lane: -1 });
        continue;
      }
    }

    laneEnds[lane] = x + width;
    packed.push({ event, x, width, lane });
  }

  return packed;
}

/** Wie viele Zeilen belegt eine Packung? */
export function laneCount(packed: readonly PackedEvent[]): number {
  return packed.reduce((max, item) => Math.max(max, item.lane + 1), 0);
}

/** Wie viele Ereignisse haben keinen Platz gefunden? */
export function hiddenCount(packed: readonly PackedEvent[]): number {
  return packed.reduce((sum, item) => sum + (item.lane < 0 ? 1 : 0), 0);
}

/**
 * Nur zeichnen, was sichtbar ist — plus etwas Rand, damit beim Ziehen
 * nichts hereinspringt. Bei wenigen hundert Ereignissen ist das noch nicht
 * kritisch, bei mehreren tausend schon.
 */
export function visibleSlice(
  packed: readonly PackedEvent[],
  viewportWidth: number,
  scrollX = 0,
  overscan = 0.2,
): PackedEvent[] {
  const margin = viewportWidth * overscan;
  const left = scrollX - margin;
  const right = scrollX + viewportWidth + margin;
  return packed.filter((item) => item.x + item.width >= left && item.x <= right);
}
