import { useMemo, useState, type ReactNode } from 'react';

import { EVENT_TYPES, SECTIONS } from '@/types';
import { journeys } from '@/lib/dataset';
import { EVENT_TYPE_LABEL, SECTION_LABEL, sectionColorVar } from '@/lib/labels';
import { formatYearRange } from '@/lib/year';
import { rangeAround } from '@/lib/timelineScale';
import { hasActiveFilters, useAtlasStore } from '@/store/useAtlasStore';
import { useFilteredEvents } from '@/hooks/useVisibleEvents';
import YearRangeFilter from '@/components/filters/YearRangeFilter';
import { cn } from '@/lib/cn';

function Group({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-line px-3 py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-1.5 flex w-full items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-subtle transition-colors hover:text-ink-muted"
      >
        {title}
        <svg
          className={cn('ml-auto size-3 transition-transform', !open && '-rotate-90')}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? children : null}
    </section>
  );
}

const chipClass = (active: boolean) =>
  cn(
    'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors',
    active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
  );

/**
 * Die linke Seitenleiste.
 *
 * Alle Filter wirken gleichzeitig auf Karte, Zeitstrahl und Wissensnetz —
 * die Filterlogik liegt in `useVisibleEvents`, damit die drei Sichten nie
 * auseinanderlaufen können.
 */
export default function FilterPanel() {
  const filters = useAtlasStore((s) => s.filters);
  const toggleSection = useAtlasStore((s) => s.toggleSection);
  const toggleEventType = useAtlasStore((s) => s.toggleEventType);
  const resetFilters = useAtlasStore((s) => s.resetFilters);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);
  const setActiveJourney = useAtlasStore((s) => s.setActiveJourney);
  const setViewRange = useAtlasStore((s) => s.setViewRange);

  const visible = useFilteredEvents();

  /** Trefferzahl je Abschnitt — zeigt vorab, ob ein Filter etwas übrig lässt. */
  const countsBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of visible) {
      if (!event.section) continue;
      counts.set(event.section, (counts.get(event.section) ?? 0) + 1);
    }
    return counts;
  }, [visible]);

  const active = hasActiveFilters(filters);

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-slim">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="text-xs font-medium tabular-nums text-ink">
          {visible.length} {visible.length === 1 ? 'Ereignis' : 'Ereignisse'}
        </span>
        {active ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto rounded-md px-1.5 py-0.5 text-[11px] text-accent transition-colors hover:bg-accent-soft"
          >
            Zurücksetzen
          </button>
        ) : null}
      </div>

      <Group title="Zeitraum">
        <YearRangeFilter />
      </Group>

      <Group title="Bibelabschnitt">
        <ul className="flex flex-col gap-0.5">
          {SECTIONS.map((section) => {
            const isActive = filters.sections.includes(section);
            const count = countsBySection.get(section) ?? 0;
            return (
              <li key={section}>
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  aria-pressed={isActive}
                  className={chipClass(isActive)}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sectionColorVar(section) }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{SECTION_LABEL[section]}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-ink-subtle">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Art des Ereignisses" defaultOpen={false}>
        <ul className="flex flex-wrap gap-1">
          {EVENT_TYPES.map((type) => {
            const isActive = filters.eventTypes.includes(type);
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => toggleEventType(type)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                    isActive
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-ink-muted hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  {EVENT_TYPE_LABEL[type]}
                </button>
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Reisen">
        <ul className="flex flex-col gap-0.5">
          {journeys.map((journey) => {
            const isActive = activeJourneyId === journey.id;
            return (
              <li key={journey.id}>
                <button
                  type="button"
                  onClick={() => {
                    const next = isActive ? null : journey.id;
                    setActiveJourney(next);
                    if (next) setViewRange(rangeAround(journey.yearStart, journey.yearEnd));
                  }}
                  aria-pressed={isActive}
                  className={chipClass(isActive)}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sectionColorVar(journey.colorToken) }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{journey.title}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-ink-subtle">
                    {formatYearRange(journey.yearStart, journey.yearEnd)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Group>
    </div>
  );
}
