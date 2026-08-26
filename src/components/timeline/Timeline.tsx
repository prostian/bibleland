import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { BibleEvent } from '@/types';
import { periods } from '@/lib/dataset';
import {
  LANE_HEIGHT,
  MARKER_GAP,
  MARKER_SIZE,
  YEAR_AXIS,
  chapterAxis,
  chooseTickStep,
  createScale,
  generateTicks,
  hiddenCount,
  laneCount,
  packEvents,
  panRange,
  visibleSlice,
  zoomRange,
  type EventSpan,
} from '@/lib/timelineScale';
import {
  buildSegments,
  chooseChapterStep,
  generateChapterTicks,
  scopeBounds,
} from '@/lib/readingPath';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useFilteredEvents, useReadingEntries } from '@/hooks/useVisibleEvents';
import { useElementSize } from '@/hooks/useElementSize';
import TimelineAxis from '@/components/timeline/TimelineAxis';
import TimelineEraBands from '@/components/timeline/TimelineEraBands';
import ReadingBands from '@/components/timeline/ReadingBands';
import TimelineEvent from '@/components/timeline/TimelineEvent';
import ZoomControls from '@/components/timeline/ZoomControls';
import TimelineMinimap from '@/components/timeline/TimelineMinimap';
import AxisModeControl from '@/components/timeline/AxisModeControl';

/**
 * Der Kopfbereich über den Ereigniszeilen: erst die Bänder, darunter die
 * Beschriftung. Die beiden dürfen sich nicht überlagern — in einer früheren
 * Fassung lagen die Zahlen über den Bändern und waren dort kaum lesbar.
 */
const ERA_BAND_HEIGHT = 16;
const AXIS_LABEL_TOP = ERA_BAND_HEIGHT + 2;
const HEADER_HEIGHT = AXIS_LABEL_TOP + 15;
const LANE_AREA_PADDING = 6;

interface TimelineProps {
  onSelectEvent: (eventId: string) => void;
}

/**
 * Der Zeitstrahl — wahlweise nach Jahren oder nach Kapiteln geordnet.
 *
 * Er rendert immer genau den sichtbaren Ausschnitt über die volle Breite; es
 * gibt keinen eigenen Scrollbereich. Zoomen und Verschieben ändern
 * ausschließlich diesen Ausschnitt im Store, wodurch die Karte automatisch
 * mitzieht.
 *
 * **Zwei Achsen, eine Bedienung.** Im Lesemodus wird nur die Achse
 * ausgetauscht: Statt Jahren stehen dort die Kapitel des gewählten Buchs, und
 * statt der Epochenbänder liegen Ortsbänder im Hintergrund. Zoom, Ziehen,
 * Zeilenpackung und Markerverhalten bleiben identisch — deshalb gibt es hier
 * auch keine zweite Codebahn, sondern nur eine andere `AxisSpec`.
 *
 * Die Ereignisse werden über den **gesamten** gefilterten Bestand in Zeilen
 * gepackt, nicht nur über die sichtbaren. Sonst würde ein Ereignis beim
 * Verschieben die Zeile wechseln, sobald links etwas aus dem Bild läuft —
 * das Bild würde bei jeder Mausbewegung zappeln.
 */
export default function Timeline({ onSelectEvent }: TimelineProps) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const trackRef = useRef<HTMLDivElement>(null);

  const axisMode = useAtlasStore((s) => s.axisMode);
  const readingScope = useAtlasStore((s) => s.readingScope);
  const viewRange = useAtlasStore((s) => s.viewRange);
  const chapterRange = useAtlasStore((s) => s.chapterRange);
  const setViewRange = useAtlasStore((s) => s.setViewRange);
  const setChapterRange = useAtlasStore((s) => s.setChapterRange);
  const selectedEventId = useAtlasStore((s) => s.selectedEventId);
  const hoveredEntityId = useAtlasStore((s) => s.hoveredEntityId);
  const hoverEntity = useAtlasStore((s) => s.hoverEntity);

  const isReading = axisMode === 'kapitel';
  const events = useFilteredEvents();
  const entries = useReadingEntries();

  const range = isReading ? chapterRange : viewRange;
  const setRange = isReading ? setChapterRange : setViewRange;

  const axis = useMemo(() => {
    if (!isReading) return YEAR_AXIS;
    const bounds = scopeBounds(readingScope);
    // Die Obergrenze ist ausschließlich, damit auch das letzte Kapitel eine
    // volle Breite bekommt statt nur einen Strich.
    return chapterAxis(bounds.min, bounds.max + 1);
  }, [isReading, readingScope]);

  const segments = useMemo(
    () => (isReading ? buildSegments(readingScope) : []),
    [isReading, readingScope],
  );

  const width = Math.max(size.width, 1);
  const laneAreaHeight = Math.max(size.height - HEADER_HEIGHT - LANE_AREA_PADDING, LANE_HEIGHT);
  const maxLanes = Math.max(1, Math.floor(laneAreaHeight / LANE_HEIGHT));

  const scale = useMemo(
    () => createScale(range.from, range.to, width, axis),
    [range.from, range.to, width, axis],
  );

  const ticks = useMemo(
    () =>
      isReading
        ? generateChapterTicks(range.from, range.to, chooseChapterStep(scale.pixelsPerUnit))
        : generateTicks(range.from, range.to, chooseTickStep(scale.pixelsPerUnit)),
    [isReading, range.from, range.to, scale.pixelsPerUnit],
  );

  /**
   * Wo ein Ereignis auf der aktiven Achse liegt.
   *
   * Im Lesemodus kommt die Position aus der Lesereihenfolge, sonst aus dem
   * Jahr. Dass die Packung das nicht selbst weiß, ist der ganze Trick — sie
   * funktioniert dadurch für beide Achsen unverändert.
   */
  const positionOf = useMemo((): ((event: BibleEvent) => EventSpan) | undefined => {
    if (!entries) return undefined;
    const byId = new Map(entries.map((entry) => [entry.event.id, entry.position]));
    return (event) => {
      const position = byId.get(event.id) ?? 0;
      return { start: position, end: position };
    };
  }, [entries]);

  const packed = useMemo(
    () =>
      packEvents(events, scale, {
        maxLanes,
        markerWidth: MARKER_SIZE,
        gap: MARKER_GAP,
        ...(positionOf ? { positionOf } : {}),
      }),
    [events, scale, maxLanes, positionOf],
  );

  // Nur zeichnen, was eine Zeile bekommen hat; der Rest wird gezählt.
  const visible = useMemo(
    () => visibleSlice(packed, width, 0, 0.25).filter((item) => item.lane >= 0),
    [packed, width],
  );
  const usedLanes = laneCount(packed);
  const hidden = hiddenCount(packed);

  /* -------------------------------------------------------------- *
   * Zoomen mit dem Mausrad
   *
   * Als nicht-passiver Listener registriert, weil `preventDefault` sonst
   * wirkungslos bleibt und die ganze Seite mitscrollt.
   * -------------------------------------------------------------- */
  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchor = scale.xToValue(e.clientX - rect.left);
      // Schrittweite an die Rollmenge koppeln, aber begrenzen — sonst
      // springt ein Trackpad-Wisch über den halben Zeitraum.
      const intensity = Math.min(Math.abs(e.deltaY), 60) / 60;
      const factor = e.deltaY > 0 ? 1 + 0.5 * intensity : 1 / (1 + 0.5 * intensity);
      const state = useAtlasStore.getState();
      const current = state.axisMode === 'kapitel' ? state.chapterRange : state.viewRange;
      setRange(zoomRange(current, factor, anchor, axis));
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [scale, setRange, axis]);

  /* -------------------------------------------------------------- *
   * Verschieben durch Ziehen
   * -------------------------------------------------------------- */
  const dragState = useRef<{ pointerId: number; lastX: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Nur auf leerem Grund ziehen — sonst ließe sich kein Marker mehr klicken.
    if ((e.target as HTMLElement).closest('button')) return;
    dragState.current = { pointerId: e.pointerId, lastX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const deltaPx = e.clientX - drag.lastX;
      if (deltaPx === 0) return;
      drag.lastX = e.clientX;
      // Nach links ziehen heißt vorwärts gehen.
      const state = useAtlasStore.getState();
      const current = state.axisMode === 'kapitel' ? state.chapterRange : state.viewRange;
      setRange(panRange(current, -deltaPx / scale.pixelsPerUnit, axis));
    },
    [scale.pixelsPerUnit, setRange, axis],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId !== e.pointerId) return;
    dragState.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  /* -------------------------------------------------------------- *
   * Tastatur
   * -------------------------------------------------------------- */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const state = useAtlasStore.getState();
      const current = state.axisMode === 'kapitel' ? state.chapterRange : state.viewRange;
      const toPos = axis.toPosition;
      const span = toPos(current.to) - toPos(current.from);
      const step = Math.max(1, Math.round(span * 0.12));
      const centerPosition = (toPos(current.from) + toPos(current.to)) / 2;
      const center = axis.fromPosition(centerPosition);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setRange(panRange(current, -step, axis));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setRange(panRange(current, step, axis));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setRange(zoomRange(current, 0.7, center, axis));
          break;
        case '-':
          e.preventDefault();
          setRange(zoomRange(current, 1.4, center, axis));
          break;
        default:
          break;
      }
    },
    [setRange, axis],
  );

  return (
    <section className="relative flex h-full flex-col bg-surface" aria-label="Zeitstrahl">
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={trackRef}
          role="application"
          aria-label={
            isReading
              ? 'Lesestrahl nach Kapiteln — mit den Pfeiltasten verschieben, mit Plus und Minus zoomen'
              : 'Zeitstrahl — mit den Pfeiltasten verschieben, mit Plus und Minus zoomen'
          }
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        >
          {isReading ? (
            <ReadingBands segments={segments} scale={scale} height={ERA_BAND_HEIGHT} />
          ) : (
            <TimelineEraBands periods={periods} scale={scale} height={ERA_BAND_HEIGHT} />
          )}
          <TimelineAxis ticks={ticks} scale={scale} labelTop={AXIS_LABEL_TOP} />

          {/* Über der Achse, damit die Marker die Klicks bekommen und nicht
              die darunterliegenden Gitterlinien. */}
          <div
            className="absolute inset-x-0 z-10"
            style={{ top: `${HEADER_HEIGHT}px`, height: `${usedLanes * LANE_HEIGHT}px` }}
          >
            {visible.map((item) => (
              <TimelineEvent
                key={item.event.id}
                item={item}
                selected={item.event.id === selectedEventId}
                hovered={item.event.id === hoveredEntityId}
                onSelect={onSelectEvent}
                onHover={hoverEntity}
              />
            ))}
          </div>

          {events.length === 0 ? (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink-subtle">
              {isReading
                ? 'Für dieses Buch ist kein Ereignis erfasst. Lehr- und Gesetzbücher erzählen keine Handlung an Orten.'
                : 'Keine Ereignisse für die aktuelle Auswahl.'}
            </p>
          ) : null}

          {/*
            Ehrlicher Hinweis statt stummen Weglassens: Bei dichter Belegung
            passen nicht alle Marker in die sichtbare Höhe. Beide genannten
            Auswege — höher ziehen oder hineinzoomen — helfen tatsächlich.
          */}
          {hidden > 0 ? (
            <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-line bg-overlay px-2 py-0.5 text-[10px] text-ink-subtle backdrop-blur-sm">
              {hidden} weitere passen nicht — Zeitstrahl höher ziehen oder hineinzoomen
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-line px-3 py-1.5">
        <AxisModeControl />
        {isReading ? null : <TimelineMinimap />}
        <ZoomControls
          range={range}
          setRange={setRange}
          axis={axis}
          isReading={isReading}
          pixelsPerUnit={scale.pixelsPerUnit}
          visibleCount={visible.length}
        />
      </div>
    </section>
  );
}
