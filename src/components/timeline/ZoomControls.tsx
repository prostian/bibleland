import type { AxisSpec, Range } from '@/lib/timelineScale';
import { ZOOM_LEVEL_LABEL, zoomLevelOf, zoomRange } from '@/lib/timelineScale';
import { positionLabel } from '@/lib/readingPath';
import { useAtlasStore } from '@/store/useAtlasStore';
import { cn } from '@/lib/cn';

interface ZoomControlsProps {
  range: Range;
  setRange: (range: Range) => void;
  axis: AxisSpec;
  isReading: boolean;
  pixelsPerUnit: number;
  visibleCount: number;
}

const buttonClass =
  'grid size-6 place-items-center rounded-md border border-line text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent';

export default function ZoomControls({
  range,
  setRange,
  axis,
  isReading,
  pixelsPerUnit,
  visibleCount,
}: ZoomControlsProps) {
  const linked = useAtlasStore((s) => s.linkMapToTimeline);
  const setLinked = useAtlasStore((s) => s.setLinkMapToTimeline);

  const centerPosition = (axis.toPosition(range.from) + axis.toPosition(range.to)) / 2;
  const anchor = axis.fromPosition(centerPosition);
  const isFullRange = range.from <= axis.min && range.to >= axis.max;

  /** Was gerade sichtbar ist — Zoomstufe bei Jahren, Kapitelspanne beim Lesen. */
  const readout = isReading
    ? `${positionLabel(range.from)} – ${positionLabel(Math.ceil(range.to) - 1)}`
    : ZOOM_LEVEL_LABEL[zoomLevelOf(pixelsPerUnit)];

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-ink-subtle">
      <span className="hidden tabular-nums lg:inline">
        {visibleCount} sichtbar · {readout}
      </span>

      {/*
        Die Kopplung ist standardmäßig aus. Wer den Zeitstrahl erkundet,
        will nicht, dass ihm dabei ständig Kartenmarker verschwinden — wer
        sie will, schaltet sie bewusst ein.
      */}
      <label
        className={cn(
          'flex cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-0.5 transition-colors',
          linked ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:bg-surface-2',
        )}
        title={
          isReading
            ? 'Zeigt die Karte nur Orte aus dem sichtbaren Kapitelausschnitt?'
            : 'Zeigt die Karte nur Ereignisse aus dem sichtbaren Zeitfenster?'
        }
      >
        <input
          type="checkbox"
          checked={linked}
          onChange={(e) => setLinked(e.target.checked)}
          className="size-3 accent-[var(--bl-accent)]"
        />
        Karte koppeln
      </label>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={buttonClass}
          onClick={() => setRange(zoomRange(range, 1.4, anchor, axis))}
          disabled={isFullRange}
          aria-label="Herauszoomen"
          title="Herauszoomen"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3.5 8h9" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setRange(zoomRange(range, 0.7, anchor, axis))}
          aria-label="Hineinzoomen"
          title="Hineinzoomen"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className={cn(buttonClass, 'w-auto px-1.5')}
          onClick={() => setRange({ from: axis.min, to: axis.max })}
          disabled={isFullRange}
          title={isReading ? 'Das ganze Buch anzeigen' : 'Den gesamten Zeitraum anzeigen'}
        >
          Alles
        </button>
      </div>
    </div>
  );
}
