import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { decodeAtlasState, encodeAtlasState } from '@/lib/urlState';
import { rangeAround } from '@/lib/timelineScale';
import { useAtlasStore, type Filters } from '@/store/useAtlasStore';
import { useMapStyleStore } from '@/store/useMapStyleStore';

/**
 * Hält die Adresse und den Atlaszustand zusammen.
 *
 * Die Richtung ist **nicht** symmetrisch, und das ist der Kern: Gelesen wird
 * genau einmal beim Betreten, geschrieben wird danach fortlaufend. Ein
 * beidseitiger Abgleich sähe ordentlicher aus, drehte sich aber im Kreis —
 * jedes Schreiben löste ein Lesen aus und umgekehrt.
 *
 * Geschrieben wird **entprellt und mit `replace`**. Ohne beides wäre der
 * Zurück-Knopf unbrauchbar: Ein einziges Ziehen am Jahresregler erzeugt
 * hunderte Zustandsänderungen, und jede davon wäre ein Historieneintrag.
 * Die Auswahl eines Ereignisses bleibt dagegen ein echter Eintrag — dorthin
 * will man zurückkommen können.
 */

/** Lange genug, dass ein Reglerzug als eine Änderung ankommt. */
const WRITE_DELAY_MS = 250;

export default function useUrlSync(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  const filters = useAtlasStore((s) => s.filters);
  const axisMode = useAtlasStore((s) => s.axisMode);
  const readingScope = useAtlasStore((s) => s.readingScope);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);
  const linkMapToTimeline = useAtlasStore((s) => s.linkMapToTimeline);
  const bordersMode = useMapStyleStore((s) => s.bordersMode);
  const bordersEraId = useMapStyleStore((s) => s.bordersEraId);

  const hydrated = useRef(false);

  /* --- Lesen: einmalig ---------------------------------------------- */

  // Bewusst ohne Abhängigkeiten: `searchParams` ist hier der Stand beim
  // Betreten, und genau der soll übernommen werden. Spätere Änderungen an der
  // Adresse stammen von diesem Hook selbst.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const state = decodeAtlasState(searchParams);
    const atlas = useAtlasStore.getState();
    const map = useMapStyleStore.getState();

    const patch: Partial<Filters> = {};
    if (state.sections) patch.sections = [...state.sections];
    if (state.bookIds) patch.bookIds = [...state.bookIds];
    if (state.eventTypes) patch.eventTypes = [...state.eventTypes];
    if (state.personIds) patch.personIds = [...state.personIds];
    if (state.query !== undefined) patch.query = state.query;
    if (state.years) {
      patch.yearFrom = state.years.from;
      patch.yearTo = state.years.to;
    }
    if (Object.keys(patch).length > 0) atlas.setFilters(patch);

    // Denselben Ausschnitt zeigen wie der Jahresfilter: Sonst filtert die
    // wiederhergestellte Ansicht etwas heraus, das gar nicht im Bild ist.
    if (state.years) atlas.setViewRange(rangeAround(state.years.from, state.years.to, 0.05));

    // Der Lesebereich zuerst — `setAxisMode` leitet das Kapitelfenster daraus ab.
    if (state.readingScope) atlas.setReadingScope(state.readingScope);
    if (state.axisMode) atlas.setAxisMode(state.axisMode);

    if (state.activeJourneyId) atlas.setActiveJourney(state.activeJourneyId);
    if (state.linkMapToTimeline) atlas.setLinkMapToTimeline(true);

    // Ein geteilter Link darf die Grenzebene umstellen — dieselbe Wirkung wie
    // ein Klick auf den Umschalter, samt Merken für die nächste Sitzung.
    if (state.borders) {
      if (state.borders.mode === 'fest') map.setBordersEra(state.borders.eraId);
      else map.setBordersMode(state.borders.mode);
    }
  }, []);

  /* --- Schreiben: entprellt ----------------------------------------- */

  useEffect(() => {
    if (!hydrated.current) return;

    const timer = setTimeout(() => {
      const next = encodeAtlasState({
        sections: filters.sections,
        bookIds: filters.bookIds,
        eventTypes: filters.eventTypes,
        personIds: filters.personIds,
        activeJourneyId,
        years: { from: filters.yearFrom, to: filters.yearTo },
        query: filters.query,
        axisMode,
        readingScope,
        borders: { mode: bordersMode, eraId: bordersEraId },
        linkMapToTimeline,
      }).toString();

      // Ein gleichlautendes Schreiben würde nichts ändern, aber jedes Mal eine
      // Navigation auslösen — und `pathname` steht hier nur in den
      // Abhängigkeiten, damit die Parameter einen Routenwechsel überleben.
      if (next === searchParams.toString()) return;
      setSearchParams(next, { replace: true });
    }, WRITE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    filters,
    axisMode,
    readingScope,
    activeJourneyId,
    linkMapToTimeline,
    bordersMode,
    bordersEraId,
    pathname,
    searchParams,
    setSearchParams,
  ]);
}
