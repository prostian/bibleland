import { memo } from 'react';

import type { Tick, TimelineScale } from '@/lib/timelineScale';
import { formatYear } from '@/lib/year';
import { cn } from '@/lib/cn';

interface TimelineAxisProps {
  ticks: readonly Tick[];
  scale: TimelineScale;
  /** Oberkante der Beschriftung — sie sitzt unter den Epochenbändern. */
  labelTop: number;
}

/**
 * Die Jahresachse.
 *
 * Die Zeitenwende bekommt eine kräftigere Linie und eine eigene
 * Beschriftung — sie ist der einzige Punkt der Achse, an dem sich die
 * Zählrichtung umkehrt, und ohne Hervorhebung liest man an ihr vorbei.
 */
function TimelineAxis({ ticks, scale, labelTop }: TimelineAxisProps) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {ticks.map((tick) => {
        const x = scale.valueToX(tick.year);
        return (
          <div
            key={tick.year}
            className="absolute inset-y-0"
            style={{ transform: `translateX(${x}px)` }}
          >
            <div
              className={cn(
                'h-full w-px',
                tick.epochBoundary ? 'bg-line-strong' : 'bg-line',
              )}
            />
            <span
              className={cn(
                'absolute left-1.5 whitespace-nowrap text-[11px] tabular-nums',
                tick.epochBoundary ? 'font-semibold text-ink-muted' : 'text-ink-subtle',
              )}
              style={{ top: `${labelTop}px` }}
            >
              {tick.label ?? (tick.epochBoundary ? 'Zeitenwende' : formatYear(tick.year, { compact: true }))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default memo(TimelineAxis);
