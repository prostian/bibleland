import { useMemo, useState, type ReactNode } from 'react';

import { EVENT_TYPES, SECTIONS, type Section } from '@/types';
import { books, journeys } from '@/lib/dataset';
import { EVENT_TYPE_LABEL, SECTION_LABEL, sectionColorVar } from '@/lib/labels';
import { formatYearRange } from '@/lib/year';
import { rangeAround } from '@/lib/timelineScale';
import { hasActiveFilters, useAtlasStore } from '@/store/useAtlasStore';
import { useEventsForCanonCounts, useFilteredEvents } from '@/hooks/useVisibleEvents';
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
        className="mb-1.5 flex w-full items-center gap-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-subtle transition-colors hover:text-ink-muted sm:py-0"
      >
        {title}
        <Chevron open={open} className="ml-auto" />
      </button>
      {open ? children : null}
    </section>
  );
}

/**
 * Eine Zeile der Filterleiste.
 *
 * Am Finger ist sie höher: Eine Liste aus 18 Pixel hohen Zeilen ist mit dem
 * Daumen nicht zu treffen, ohne die Nachbarzeile zu erwischen.
 */
const chipClass = (active: boolean) =>
  cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors sm:px-1.5 sm:py-1',
    active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
  );

function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={cn('size-3 transition-transform', !open && '-rotate-90', className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Die Bücher je Abschnitt, in Kanonreihenfolge. Einmal beim Laden gebaut. */
const BOOKS_BY_SECTION: ReadonlyMap<Section, typeof books> = (() => {
  const map = new Map<Section, typeof books>();
  for (const section of SECTIONS) {
    map.set(
      section,
      books.filter((book) => book.section === section),
    );
  }
  return map;
})();

/**
 * Ein Bibelabschnitt mit seinen Büchern.
 *
 * Die beiden Ebenen sind bewusst zwei getrennte Schaltflächen: Der Pfeil
 * klappt auf, der Rest filtert. Beides auf einen Knopf zu legen hieße, dass
 * man den Abschnitt nicht ansehen kann, ohne ihn zu filtern — und umgekehrt.
 */
function SectionGroup({
  section,
  count,
  bookCounts,
}: {
  section: Section;
  count: number;
  bookCounts: ReadonlyMap<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const filters = useAtlasStore((s) => s.filters);
  const toggleSection = useAtlasStore((s) => s.toggleSection);
  const toggleBook = useAtlasStore((s) => s.toggleBook);

  const inSection = BOOKS_BY_SECTION.get(section) ?? [];
  const isActive = filters.sections.includes(section);
  // Ein aktives Buch macht sichtbar, dass in einem zugeklappten Abschnitt
  // ein Filter steckt — sonst suchte man ihn vergeblich.
  const activeBooks = inSection.filter((book) => filters.bookIds.includes(book.id)).length;

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Bücher aus ${SECTION_LABEL[section]} ${open ? 'einklappen' : 'ausklappen'}`}
          className="tap grid shrink-0 place-items-center rounded-md p-2 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink sm:p-1"
        >
          <Chevron open={open} />
        </button>
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
          {activeBooks > 0 && !open ? (
            <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[10px] tabular-nums text-accent">
              {activeBooks}
            </span>
          ) : null}
          <span className="ml-auto shrink-0 tabular-nums text-ink-subtle">{count}</span>
        </button>
      </div>

      {open ? (
        <ul className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-line pl-1.5 pt-0.5">
          {inSection.map((book) => {
            const bookActive = filters.bookIds.includes(book.id);
            const bookCount = bookCounts.get(book.id) ?? 0;
            return (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => toggleBook(book.id)}
                  aria-pressed={bookActive}
                  title={book.altName ? `${book.name} (${book.altName})` : book.name}
                  className={cn(chipClass(bookActive), 'py-0.5 text-[11px]')}
                >
                  <span className="truncate">{book.name}</span>
                  <span
                    className={cn(
                      'ml-auto shrink-0 tabular-nums',
                      bookCount === 0 ? 'text-ink-subtle/60' : 'text-ink-subtle',
                    )}
                  >
                    {bookCount}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Die linke Seitenleiste.
 *
 * Alle Filter wirken gleichzeitig auf Karte, Zeitstrahl und Wissensnetz —
 * die Filterlogik liegt in `useVisibleEvents`, damit die drei Sichten nie
 * auseinanderlaufen können.
 */
export default function FilterPanel() {
  const filters = useAtlasStore((s) => s.filters);
  const toggleEventType = useAtlasStore((s) => s.toggleEventType);
  const resetFilters = useAtlasStore((s) => s.resetFilters);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);
  const setActiveJourney = useAtlasStore((s) => s.setActiveJourney);
  const setViewRange = useAtlasStore((s) => s.setViewRange);

  const visible = useFilteredEvents();
  const forCounts = useEventsForCanonCounts();

  /** Trefferzahl je Abschnitt — zeigt vorab, ob ein Filter etwas übrig lässt. */
  const countsBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of forCounts) {
      if (!event.section) continue;
      counts.set(event.section, (counts.get(event.section) ?? 0) + 1);
    }
    return counts;
  }, [forCounts]);

  /**
   * Trefferzahl je Buch. Parallelstellen zählen mit, genau wie beim Filtern —
   * sonst stünde neben Lukas eine Null für ein Ereignis, das dort erzählt wird.
   */
  const countsByBook = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of forCounts) {
      const ids = new Set<string>();
      if (event.ref) ids.add(event.ref.bookId);
      for (const ref of event.parallelRefs ?? []) ids.add(ref.bookId);
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [forCounts]);

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
            className="tap ml-auto rounded-md px-2 py-1.5 text-[11px] text-accent transition-colors hover:bg-accent-soft sm:px-1.5 sm:py-0.5"
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
          {SECTIONS.map((section) => (
            <SectionGroup
              key={section}
              section={section}
              count={countsBySection.get(section) ?? 0}
              bookCounts={countsByBook}
            />
          ))}
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
                    'rounded-full border px-2.5 py-1.5 text-[11px] transition-colors sm:py-0.5',
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
