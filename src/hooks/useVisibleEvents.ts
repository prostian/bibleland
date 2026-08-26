import { useMemo } from 'react';

import type { BibleEvent } from '@/types';
import { events as allEvents, getJourney } from '@/lib/dataset';
import { eventsInReadingOrder, type ReadingEntry } from '@/lib/readingPath';
import { useAtlasStore, type Filters, type YearRange } from '@/store/useAtlasStore';
import { toContinuous } from '@/lib/year';

/**
 * Die eine Filterlogik, die alle drei Sichten teilen.
 *
 * Karte, Zeitstrahl und Wissensnetz zeigen immer dieselbe Menge — sonst
 * würde ein Klick auf einen Kartenmarker ins Leere führen, weil der
 * Zeitstrahl das Ereignis gerade ausgeblendet hat. Deshalb wird hier
 * gefiltert und nicht in den Komponenten.
 */

/** Überschneidet sich das Ereignis mit dem Zeitfenster? Zeiträume zählen mit. */
function overlapsRange(event: BibleEvent, from: number, to: number): boolean {
  const start = toContinuous(event.year);
  const end = toContinuous(event.yearEnd ?? event.year);
  return end >= toContinuous(from) && start <= toContinuous(to);
}

export function filterEvents(
  events: readonly BibleEvent[],
  filters: Filters,
  options: {
    range?: YearRange | undefined;
    journeyId?: string | null;
    /**
     * Im Lesemodus: nur diese Ereignisse. Sie stammen aus dem gewählten Buch
     * bzw. Abschnitt und stehen bereits in Lesereihenfolge.
     */
    scopeEventIds?: ReadonlySet<string> | undefined;
  } = {},
): BibleEvent[] {
  const { range, journeyId, scopeEventIds } = options;
  const query = filters.query.trim().toLowerCase();

  // Eine aktive Reise engt zusätzlich auf ihren Zeitraum ein — sonst stünde
  // die Route auf der Karte, während der Zeitstrahl ganz woanders steht.
  const journey = journeyId ? getJourney(journeyId) : undefined;

  return events.filter((event) => {
    if (scopeEventIds && !scopeEventIds.has(event.id)) return false;

    // Ohne Abschnitt — also außerbiblisch — fällt das Ereignis aus jedem
    // Abschnittsfilter heraus. Wer „nur Propheten" wählt, will die
    // Septuaginta nicht sehen.
    if (filters.sections.length && (!event.section || !filters.sections.includes(event.section))) {
      return false;
    }
    if (filters.eventTypes.length && !filters.eventTypes.includes(event.eventType)) return false;
    if (filters.personIds.length && !filters.personIds.some((id) => event.personIds.includes(id))) {
      return false;
    }
    if (filters.journeyIds.length && (!event.journeyId || !filters.journeyIds.includes(event.journeyId))) {
      return false;
    }
    if (!overlapsRange(event, filters.yearFrom, filters.yearTo)) return false;
    if (range && !overlapsRange(event, range.from, range.to)) return false;
    if (journey && !overlapsRange(event, journey.yearStart, journey.yearEnd)) return false;

    if (query) {
      const haystack = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/**
 * Die Ereignisse des Lesebereichs, in Lesereihenfolge — oder `null` außerhalb
 * des Lesemodus.
 */
export function useReadingEntries(): ReadingEntry[] | null {
  const axisMode = useAtlasStore((s) => s.axisMode);
  const readingScope = useAtlasStore((s) => s.readingScope);
  return useMemo(
    () => (axisMode === 'kapitel' ? eventsInReadingOrder(readingScope) : null),
    [axisMode, readingScope],
  );
}

/** Alle Ereignisse, die den aktuellen Filtern entsprechen — ohne Zeitfenster. */
export function useFilteredEvents(): BibleEvent[] {
  const filters = useAtlasStore((s) => s.filters);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);
  const entries = useReadingEntries();

  // Im Lesemodus zuerst auf das gewählte Buch bzw. den Abschnitt einengen —
  // danach greifen die übrigen Filter wie gewohnt.
  const scopeEventIds = useMemo(
    () => (entries ? new Set(entries.map((entry) => entry.event.id)) : undefined),
    [entries],
  );

  return useMemo(
    () => filterEvents(allEvents, filters, { journeyId: activeJourneyId, scopeEventIds }),
    [filters, activeJourneyId, scopeEventIds],
  );
}

/**
 * Was die Karte zeigt: die gefilterten Ereignisse, zusätzlich auf das
 * Zeitfenster des Zeitstrahls eingeengt, sofern die Kopplung aktiv ist.
 *
 * Der Name meidet bewusst `useMapEvents` — so heißt bereits ein Hook in
 * react-leaflet, der etwas ganz anderes tut (Karten-Ereignisbehandlung).
 */
export function useVisibleMapEvents(): BibleEvent[] {
  const filtered = useFilteredEvents();
  const linked = useAtlasStore((s) => s.linkMapToTimeline);
  const viewRange = useAtlasStore((s) => s.viewRange);

  return useMemo(() => {
    if (!linked) return filtered;
    return filtered.filter((e) => overlapsRange(e, viewRange.from, viewRange.to));
  }, [filtered, linked, viewRange]);
}
