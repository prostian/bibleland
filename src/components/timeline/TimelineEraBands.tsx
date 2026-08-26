import { memo } from 'react';

import type { Period } from '@/types';
import type { TimelineScale } from '@/lib/timelineScale';
import { sectionColorVar } from '@/lib/labels';
import { formatYearRange } from '@/lib/year';

interface TimelineEraBandsProps {
  periods: readonly Period[];
  scale: TimelineScale;
  /** Höhe des Bandstreifens in Pixeln. */
  height: number;
  onSelectPeriod?: (period: Period) => void;
}

/** Ab dieser Breite passt der Epochenname noch ins Band. */
const MIN_LABEL_WIDTH = 64;

/**
 * Epochen als getönte Flächen im Hintergrund.
 *
 * Sie geben den Ereignismarkern einen historischen Rahmen: Ohne sie ist ein
 * Punkt bei 722 v. Chr. nur eine Zahl, mit ihnen liegt er sichtbar im
 * geteilten Reich.
 */
function TimelineEraBands({ periods, scale, height, onSelectPeriod }: TimelineEraBandsProps) {
  return (
    <div className="absolute inset-x-0 top-0 select-none" style={{ height: `${height}px` }}>
      {periods.map((period) => {
        const x0 = scale.valueToX(period.yearStart);
        const x1 = scale.valueToX(period.yearEnd);
        const width = x1 - x0;
        if (width <= 0) return null;

        const color = sectionColorVar(period.colorToken);
        const label = `${period.name} · ${formatYearRange(period.yearStart, period.yearEnd)}`;

        return (
          <button
            key={period.id}
            type="button"
            title={label}
            onClick={onSelectPeriod ? () => onSelectPeriod(period) : undefined}
            className="absolute inset-y-0 overflow-hidden border-r border-bg/60 text-left transition-[filter] hover:brightness-110 focus-visible:z-10"
            style={{
              transform: `translateX(${x0}px)`,
              width: `${width}px`,
              backgroundColor: color,
              // Kräftig genug, um Abschnitte zu unterscheiden, blass genug,
              // damit die Marker davor nicht untergehen.
              opacity: 0.22,
            }}
          >
            {width >= MIN_LABEL_WIDTH ? (
              <span className="pointer-events-none block truncate px-2 text-[10px] font-semibold uppercase tracking-wide text-ink">
                {period.name}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default memo(TimelineEraBands);
