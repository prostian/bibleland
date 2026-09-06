import { EVENT_TYPES, SECTIONS, type EventType, type Section } from '@/types';
import { bookById, journeyById, personById } from '@/lib/dataset';
import { MAX_YEAR, MIN_YEAR, clampYear } from '@/lib/year';
import type { ReadingScope } from '@/lib/readingPath';
import { DEFAULT_READING_SCOPE, type AxisMode, type YearRange } from '@/store/useAtlasStore';
import type { BordersMode } from '@/store/useMapStyleStore';

/**
 * Die eingestellte Ansicht als Adresse — und zurück.
 *
 * Zwei reine Funktionen ohne React und ohne Store-Zugriff, damit sie sich
 * prüfen lassen, ohne eine Anwendung hochzufahren. Die Verdrahtung macht
 * `useUrlSync`.
 *
 * Zwei Entscheidungen prägen das Format:
 *
 * 1. **Vorgabewerte stehen nicht in der Adresse.** Ein unberührter Atlas hat
 *    eine saubere `/`. Eine Startseite mit zwölf Parametern wäre schlechter
 *    als gar keine URL-Sicherung — sie wäre weder lesbar noch weitergebbar.
 * 2. **Unbekannte Werte werden still verworfen, nicht gemeldet.** Ein Link
 *    von vor einer Datenänderung darf zu einer leereren Auswahl führen, aber
 *    niemals zu einer leeren Seite oder einer Fehlermeldung.
 *
 * Die Parameter sind einbuchstabig, weil ein geteilter Link in einen
 * Messenger passen soll. Ausgeschrieben wären es schnell 200 Zeichen.
 */

export interface BordersSetting {
  mode: BordersMode;
  /** Nur bei `fest` von Bedeutung. */
  eraId: string;
}

export interface AtlasUrlState {
  sections: readonly Section[];
  bookIds: readonly string[];
  eventTypes: readonly EventType[];
  personIds: readonly string[];
  activeJourneyId: string | null;
  years: YearRange;
  query: string;
  axisMode: AxisMode;
  readingScope: ReadingScope;
  borders: BordersSetting;
  linkMapToTimeline: boolean;
}

/** Reihenfolge der Parameter — fest, damit dieselbe Ansicht dieselbe URL ergibt. */
const KEYS = {
  sections: 'a',
  books: 'b',
  types: 't',
  persons: 'p',
  journey: 'j',
  years: 'y',
  query: 'q',
  axisMode: 'm',
  scope: 's',
  borders: 'g',
  linked: 'l',
} as const;

const sectionSet: ReadonlySet<string> = new Set(SECTIONS);
const eventTypeSet: ReadonlySet<string> = new Set(EVENT_TYPES);

/** Kennungen sind überall `a-z0-9-` — siehe die Prüfung in validate-data.mjs. */
const ID_PATTERN = /^[a-z0-9-]+$/;

/* ------------------------------------------------------------------ *
 * Schreiben
 * ------------------------------------------------------------------ */

export function encodeAtlasState(state: AtlasUrlState): URLSearchParams {
  const params = new URLSearchParams();

  const list = (key: string, values: readonly string[]) => {
    if (values.length > 0) params.set(key, values.join(','));
  };

  list(KEYS.sections, state.sections);
  list(KEYS.books, state.bookIds);
  list(KEYS.types, state.eventTypes);
  list(KEYS.persons, state.personIds);

  if (state.activeJourneyId) params.set(KEYS.journey, state.activeJourneyId);

  if (state.years.from !== MIN_YEAR || state.years.to !== MAX_YEAR) {
    params.set(KEYS.years, `${state.years.from}:${state.years.to}`);
  }

  const query = state.query.trim();
  if (query) params.set(KEYS.query, query);

  /*
   * Achsenmodus und Lesebereich hängen zusammen: Ein Lesebereich ohne
   * Kapitelmodus ist unsichtbar, und ihn trotzdem mitzuschreiben brächte
   * einen Parameter in jede Adresse, der nichts bewirkt.
   */
  if (state.axisMode === 'kapitel') {
    params.set(KEYS.axisMode, 'kapitel');
    const scope = state.readingScope;
    if (scope.kind !== DEFAULT_READING_SCOPE.kind || scope.id !== DEFAULT_READING_SCOPE.id) {
      params.set(KEYS.scope, `${scope.kind}:${scope.id}`);
    }
  }

  if (state.borders.mode === 'aus') params.set(KEYS.borders, 'aus');
  else if (state.borders.mode === 'fest') params.set(KEYS.borders, state.borders.eraId);

  if (state.linkMapToTimeline) params.set(KEYS.linked, '1');

  return params;
}

/* ------------------------------------------------------------------ *
 * Lesen
 * ------------------------------------------------------------------ */

/** Kommaliste, auf bekannte Werte gefiltert und ohne Duplikate. */
function readList(
  params: URLSearchParams,
  key: string,
  isKnown: (value: string) => boolean,
): string[] | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;

  const values = [...new Set(raw.split(',').map((v) => v.trim()).filter(Boolean))].filter(isKnown);
  return values.length > 0 ? values : undefined;
}

/**
 * `-1000:-900` — getrennt wird am Doppelpunkt, nicht am Bindestrich. Ein
 * Bindestrich als Trenner wäre bei Jahren vor Christus nicht auflösbar.
 */
function readYears(params: URLSearchParams): YearRange | undefined {
  const raw = params.get(KEYS.years);
  if (raw === null) return undefined;

  const parts = raw.split(':');
  if (parts.length !== 2) return undefined;

  const from = Number(parts[0]);
  const to = Number(parts[1]);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === 0 || to === 0) return undefined;

  const lo = clampYear(Math.min(from, to));
  const hi = clampYear(Math.max(from, to));
  return { from: lo, to: hi };
}

function readScope(params: URLSearchParams): ReadingScope | undefined {
  const raw = params.get(KEYS.scope);
  if (raw === null) return undefined;

  const [kind, id] = raw.split(':');
  if (!id) return undefined;
  if (kind === 'buch') return bookById.has(id) ? { kind: 'buch', id } : undefined;
  if (kind === 'abschnitt' && sectionSet.has(id)) return { kind: 'abschnitt', id: id as Section };
  return undefined;
}

/**
 * Die Epochenkennung wird bewusst *nicht* gegen `territories.json` geprüft:
 * Diese Datei wird nur von der Kartenebene geladen, damit ihre Geometrie aus
 * dem ersten Ladevorgang herausbleibt. Ein unbekanntes Gebietsbild fängt die
 * Karte selbst ab, indem sie auf die automatische Wahl zurückfällt.
 */
function readBorders(params: URLSearchParams): BordersSetting | undefined {
  const raw = params.get(KEYS.borders);
  if (raw === null) return undefined;
  if (raw === 'aus') return { mode: 'aus', eraId: '' };
  if (raw === 'auto') return { mode: 'auto', eraId: '' };
  return ID_PATTERN.test(raw) ? { mode: 'fest', eraId: raw } : undefined;
}

export function decodeAtlasState(params: URLSearchParams): Partial<AtlasUrlState> {
  const state: Partial<AtlasUrlState> = {};

  const sections = readList(params, KEYS.sections, (v) => sectionSet.has(v));
  if (sections) state.sections = sections as Section[];

  const bookIds = readList(params, KEYS.books, (v) => bookById.has(v));
  if (bookIds) state.bookIds = bookIds;

  const eventTypes = readList(params, KEYS.types, (v) => eventTypeSet.has(v));
  if (eventTypes) state.eventTypes = eventTypes as EventType[];

  const personIds = readList(params, KEYS.persons, (v) => personById.has(v));
  if (personIds) state.personIds = personIds;

  const journeyId = params.get(KEYS.journey);
  if (journeyId && journeyById.has(journeyId)) state.activeJourneyId = journeyId;

  const years = readYears(params);
  if (years) state.years = years;

  const query = params.get(KEYS.query)?.trim();
  if (query) state.query = query;

  if (params.get(KEYS.axisMode) === 'kapitel') state.axisMode = 'kapitel';

  const scope = readScope(params);
  if (scope) state.readingScope = scope;

  const borders = readBorders(params);
  if (borders) state.borders = borders;

  if (params.get(KEYS.linked) === '1') state.linkMapToTimeline = true;

  return state;
}
