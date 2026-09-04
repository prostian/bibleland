import { create } from 'zustand';

import type { EventType, Section } from '@/types';
import { MAX_YEAR, MIN_YEAR } from '@/lib/year';
import { scopeBounds, scopeRange, type ReadingScope } from '@/lib/readingPath';

/**
 * Die gemeinsame Wahrheitsquelle von Karte, Zeitstrahl und Wissensnetz.
 *
 * Alle drei Sichten lesen denselben Zustand und schreiben in ihn zurück. Ein
 * Klick auf einen Zeitstrahl-Marker setzt hier `selectedEventId`; die Karte
 * bemerkt das und fliegt zum Ort, ohne dass die Komponenten voneinander
 * wissen. Ohne diese Entkopplung müsste jede Sicht jede andere kennen.
 *
 * Abgeleitete Mengen (welche Ereignisse sind gerade sichtbar?) stehen
 * bewusst *nicht* hier, sondern in `useVisibleEvents` — sonst müsste bei
 * jedem Filterklick der halbe Datenbestand im Store neu abgelegt werden.
 */

export interface Filters {
  /** Leer bedeutet „alle" — das erspart es, beim Start alle acht einzutragen. */
  sections: Section[];
  /**
   * Einzelne Bücher — die feinere Stufe unter dem Abschnittsfilter.
   *
   * Wie alle übrigen Filter engt auch dieser zusätzlich ein: Abschnitt *und*
   * Buch müssen passen. Wer „Propheten" wählt und darin Jesaja anhakt, sieht
   * Jesaja; wer „Propheten" wählt und Rut anhakt, sieht nichts — und die
   * Null neben Rut in der Leiste zeigt das schon vor dem Klick.
   */
  bookIds: string[];
  eventTypes: EventType[];
  personIds: string[];
  journeyIds: string[];
  yearFrom: number;
  yearTo: number;
  query: string;
}

export const DEFAULT_FILTERS: Filters = {
  sections: [],
  bookIds: [],
  eventTypes: [],
  personIds: [],
  journeyIds: [],
  yearFrom: MIN_YEAR,
  yearTo: MAX_YEAR,
  query: '',
};

export interface YearRange {
  from: number;
  to: number;
}

/**
 * Wonach der Zeitstrahl ordnet.
 *
 * `zeit` sortiert nach Jahren, `kapitel` nach der Lesereihenfolge des Kanons.
 * Beides ist derselbe Strahl mit derselben Bedienung — nur die Achse wird
 * ausgetauscht.
 */
export type AxisMode = 'zeit' | 'kapitel';

/** Voreinstellung des Lesemodus: das erzählerisch dichteste Buch. */
const DEFAULT_SCOPE: ReadingScope = { kind: 'buch', id: 'gen' };

interface AtlasState {
  selectedEventId: string | null;
  /** Kennung eines Ereignisses, einer Person oder eines Ortes — sichtenübergreifend. */
  hoveredEntityId: string | null;
  /** Das gerade sichtbare Zeitfenster des Zeitstrahls. */
  viewRange: YearRange;
  filters: Filters;
  /** Zeigt die Karte nur, was im Zeitfenster liegt? */
  linkMapToTimeline: boolean;
  activeJourneyId: string | null;

  /* --- Lesemodus --------------------------------------------------- */

  axisMode: AxisMode;
  readingScope: ReadingScope;
  /** Sichtbares Kapitelfenster, in kanonischen Positionen. */
  chapterRange: YearRange;
  /**
   * Filter und Zeitfenster, wie sie vor dem Wechsel in den Lesemodus waren.
   *
   * Beim Zurückschalten wird der Zustand wiederhergestellt — sonst käme man
   * aus dem Lesemodus in eine Ansicht zurück, die man nie eingestellt hat.
   */
  timeStateBackup: { filters: Filters; viewRange: YearRange } | null;

  setAxisMode: (mode: AxisMode) => void;
  setReadingScope: (scope: ReadingScope) => void;
  setChapterRange: (range: YearRange) => void;

  selectEvent: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
  setViewRange: (range: YearRange) => void;
  setFilters: (patch: Partial<Filters>) => void;
  toggleSection: (section: Section) => void;
  toggleBook: (bookId: string) => void;
  toggleEventType: (type: EventType) => void;
  togglePerson: (personId: string) => void;
  resetFilters: () => void;
  setLinkMapToTimeline: (linked: boolean) => void;
  setActiveJourney: (id: string | null) => void;
}

/** Ein Element aus einer Liste entfernen oder hinzufügen. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const useAtlasStore = create<AtlasState>((set, get) => ({
  selectedEventId: null,
  hoveredEntityId: null,
  viewRange: { from: MIN_YEAR, to: MAX_YEAR },
  filters: DEFAULT_FILTERS,
  linkMapToTimeline: false,
  activeJourneyId: null,

  axisMode: 'zeit',
  readingScope: DEFAULT_SCOPE,
  chapterRange: scopeRange(DEFAULT_SCOPE),
  timeStateBackup: null,

  setAxisMode: (mode) => {
    const state = get();
    if (mode === state.axisMode) return;

    if (mode === 'kapitel') {
      set({
        axisMode: 'kapitel',
        timeStateBackup: { filters: state.filters, viewRange: state.viewRange },
        chapterRange: scopeRange(state.readingScope),
        // Der Jahresfilter würde im Lesemodus nur stören: Er wirft Ereignisse
        // heraus, die im gelesenen Buch stehen — und genau das manuelle
        // Nachjustieren soll der Lesemodus ja abnehmen.
        filters: { ...state.filters, yearFrom: MIN_YEAR, yearTo: MAX_YEAR },
        // Die Reiseroute weicht dem Lesepfad, sonst lägen zwei Linien übereinander.
        activeJourneyId: null,
      });
      return;
    }

    const backup = state.timeStateBackup;
    set({
      axisMode: 'zeit',
      ...(backup ? { filters: backup.filters, viewRange: backup.viewRange } : {}),
      timeStateBackup: null,
    });
  },

  setReadingScope: (scope) => set({ readingScope: scope, chapterRange: scopeRange(scope) }),

  setChapterRange: (range) => {
    const bounds = scopeBounds(get().readingScope);
    const from = Math.max(bounds.min, Math.min(range.from, range.to));
    const to = Math.min(bounds.max + 1, Math.max(range.from, range.to));
    set({ chapterRange: { from, to } });
  },

  selectEvent: (id) => set({ selectedEventId: id }),
  hoverEntity: (id) => {
    // Hover feuert bei jeder Mausbewegung. Ein Vergleich vor dem set spart
    // die allermeisten Rerender der drei Sichten.
    if (get().hoveredEntityId !== id) set({ hoveredEntityId: id });
  },

  setViewRange: (range) => {
    const from = Math.max(MIN_YEAR, Math.min(range.from, range.to));
    const to = Math.min(MAX_YEAR, Math.max(range.from, range.to));
    set({ viewRange: { from, to } });
  },

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  toggleSection: (section) =>
    set((s) => ({ filters: { ...s.filters, sections: toggle(s.filters.sections, section) } })),
  toggleBook: (bookId) =>
    set((s) => ({ filters: { ...s.filters, bookIds: toggle(s.filters.bookIds, bookId) } })),
  toggleEventType: (type) =>
    set((s) => ({ filters: { ...s.filters, eventTypes: toggle(s.filters.eventTypes, type) } })),
  togglePerson: (personId) =>
    set((s) => ({ filters: { ...s.filters, personIds: toggle(s.filters.personIds, personId) } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS, activeJourneyId: null }),

  setLinkMapToTimeline: (linked) => set({ linkMapToTimeline: linked }),

  setActiveJourney: (id) => set({ activeJourneyId: id }),
}));

/** Sind gerade überhaupt Filter gesetzt? Steuert die Anzeige des Zurücksetzen-Knopfs. */
export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.sections.length > 0 ||
    filters.bookIds.length > 0 ||
    filters.eventTypes.length > 0 ||
    filters.personIds.length > 0 ||
    filters.journeyIds.length > 0 ||
    filters.query.trim() !== '' ||
    filters.yearFrom !== MIN_YEAR ||
    filters.yearTo !== MAX_YEAR
  );
}
