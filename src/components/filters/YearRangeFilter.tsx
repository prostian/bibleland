import { MAX_YEAR, MIN_YEAR, formatYear, formatYearRange, fromContinuous, toContinuous } from '@/lib/year';
import { rangeAround } from '@/lib/timelineScale';
import { useAtlasStore } from '@/store/useAtlasStore';
import { cn } from '@/lib/cn';

/**
 * Gängige Zeitfenster als ein Klick. Wer „die Königszeit" sehen will, soll
 * nicht zwei Regler auf 1050 und 586 schieben müssen.
 */
const PRESETS: { label: string; from: number; to: number }[] = [
  { label: 'Alles', from: MIN_YEAR, to: MAX_YEAR },
  { label: 'Patriarchen', from: -2020, to: -1640 },
  { label: 'Exodus', from: -1450, to: -1400 },
  { label: 'Königszeit', from: -1050, to: -586 },
  { label: 'Exil & Rückkehr', from: -600, to: -430 },
  { label: 'Jesus', from: -6, to: 33 },
  { label: 'Urgemeinde', from: 30, to: 100 },
];

/** Die Regler arbeiten auf der lückenlosen Skala, damit kein Jahr 0 wählbar ist. */
const SLIDER_MIN = toContinuous(MIN_YEAR);
const SLIDER_MAX = toContinuous(MAX_YEAR);

export default function YearRangeFilter() {
  const filters = useAtlasStore((s) => s.filters);
  const setFilters = useAtlasStore((s) => s.setFilters);
  const setViewRange = useAtlasStore((s) => s.setViewRange);

  const apply = (from: number, to: number) => {
    setFilters({ yearFrom: from, yearTo: to });
    // Den Zeitstrahl mitziehen — sonst filtert man etwas heraus, das gar
    // nicht im Bild ist, und wundert sich, warum nichts passiert.
    setViewRange(rangeAround(from, to, 0.05));
  };

  const isFullRange = filters.yearFrom <= MIN_YEAR && filters.yearTo >= MAX_YEAR;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs tabular-nums text-ink-muted">
        {isFullRange ? 'Gesamter Zeitraum' : formatYearRange(filters.yearFrom, filters.yearTo)}
      </p>

      <label className="flex items-center gap-2 text-[11px] text-ink-subtle">
        <span className="w-6 shrink-0">von</span>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={toContinuous(filters.yearFrom)}
          onChange={(e) => {
            const from = fromContinuous(Number(e.target.value));
            apply(from, Math.max(from, filters.yearTo));
          }}
          className="min-w-0 flex-1 accent-[var(--bl-accent)]"
          aria-label="Frühestes Jahr"
        />
        <span className="w-20 shrink-0 text-right tabular-nums text-ink-muted">
          {formatYear(filters.yearFrom)}
        </span>
      </label>

      <label className="flex items-center gap-2 text-[11px] text-ink-subtle">
        <span className="w-6 shrink-0">bis</span>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={toContinuous(filters.yearTo)}
          onChange={(e) => {
            const to = fromContinuous(Number(e.target.value));
            apply(Math.min(to, filters.yearFrom), to);
          }}
          className="min-w-0 flex-1 accent-[var(--bl-accent)]"
          aria-label="Spätestes Jahr"
        />
        <span className="w-20 shrink-0 text-right tabular-nums text-ink-muted">
          {formatYear(filters.yearTo)}
        </span>
      </label>

      <div className="flex flex-wrap gap-1 pt-0.5">
        {PRESETS.map((preset) => {
          const active = filters.yearFrom === preset.from && filters.yearTo === preset.to;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => apply(preset.from, preset.to)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-ink-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
