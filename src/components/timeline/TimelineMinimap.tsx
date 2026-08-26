import { useCallback, useMemo, useRef } from 'react';

import { events as allEvents, periods } from '@/lib/dataset';
import { MAX_YEAR, MIN_YEAR, formatYearRange, fromContinuous, toContinuous } from '@/lib/year';
import { centerOn } from '@/lib/timelineScale';
import { eventColorVar, sectionColorVar } from '@/lib/labels';
import { useAtlasStore } from '@/store/useAtlasStore';

const TOTAL_FROM = toContinuous(MIN_YEAR);
const TOTAL_SPAN = toContinuous(MAX_YEAR) - TOTAL_FROM;

/**
 * Übersichtsleiste über den gesamten Zeitraum.
 *
 * Beim Hineinzoomen verliert man sonst jeden Bezug dazu, wo man sich in den
 * 2300 Jahren gerade befindet. Die Leiste zeigt das Fenster im Ganzen und
 * erlaubt den Sprung dorthin mit einem Klick.
 */
export default function TimelineMinimap() {
  const viewRange = useAtlasStore((s) => s.viewRange);
  const setViewRange = useAtlasStore((s) => s.setViewRange);
  const trackRef = useRef<HTMLDivElement>(null);

  /** Anteilige Position eines Jahres auf der Gesamtleiste, 0…1. */
  const ratioOf = useCallback((year: number) => (toContinuous(year) - TOTAL_FROM) / TOTAL_SPAN, []);

  const windowStyle = useMemo(() => {
    const left = ratioOf(viewRange.from);
    const right = ratioOf(viewRange.to);
    return {
      left: `${left * 100}%`,
      // Mindestbreite, damit das Fenster bei starkem Zoom nicht zum Strich wird.
      width: `${Math.max((right - left) * 100, 1.2)}%`,
    };
  }, [viewRange, ratioOf]);

  const jumpTo = useCallback(
    (clientX: number) => {
      const node = trackRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      const year = fromContinuous(TOTAL_FROM + ratio * TOTAL_SPAN);
      setViewRange(centerOn(useAtlasStore.getState().viewRange, year));
    },
    [setViewRange],
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="hidden shrink-0 text-[11px] tabular-nums text-ink-subtle lg:inline">
        {formatYearRange(viewRange.from, viewRange.to)}
      </span>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Zeitraum überblicken und anspringen"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={Math.round((viewRange.from + viewRange.to) / 2)}
        aria-valuetext={formatYearRange(viewRange.from, viewRange.to)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          jumpTo(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) jumpTo(e.clientX);
        }}
        className="relative h-5 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-md border border-line bg-surface-2"
      >
        {/* Epochen als Untergrund — sie geben der Leiste eine Geografie. */}
        {periods.map((period) => {
          const left = ratioOf(period.yearStart);
          const right = ratioOf(period.yearEnd);
          return (
            <span
              key={period.id}
              title={period.name}
              className="absolute inset-y-0"
              style={{
                left: `${left * 100}%`,
                width: `${(right - left) * 100}%`,
                backgroundColor: sectionColorVar(period.colorToken),
                opacity: 0.28,
              }}
            />
          );
        })}

        {/* Jedes Ereignis als feiner Strich: die Dichteverteilung über die
            gesamte biblische Geschichte auf einen Blick. */}
        {allEvents.map((event) => (
          <span
            key={event.id}
            className="absolute top-0 h-full w-px"
            style={{
              left: `${ratioOf(event.year) * 100}%`,
              backgroundColor: eventColorVar(event),
              opacity: 0.55,
            }}
          />
        ))}

        <span
          className="pointer-events-none absolute inset-y-0 rounded-sm border-2 border-accent bg-accent/15"
          style={windowStyle}
        />
      </div>
    </div>
  );
}
