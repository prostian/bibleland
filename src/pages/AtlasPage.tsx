import { useCallback, useEffect } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import AtlasMap from '@/components/map/AtlasMap';
import Timeline from '@/components/timeline/Timeline';
import SplitHandle, { useTimelineHeight } from '@/components/layout/SplitHandle';
import BottomSheet from '@/components/layout/BottomSheet';
import TourLegDetail from '@/components/detail/TourLegDetail';
import { getJourney } from '@/lib/dataset';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import useUrlSync from '@/hooks/useUrlSync';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/cn';

/**
 * Die Hauptansicht: Karte oben, Zeitstrahl unten, Detailbereich rechts.
 *
 * Als **pfadlose** Layoutroute angelegt, damit `/` und `/ereignis/:id`
 * dieselbe Instanz teilen. Beim Öffnen eines Ereignisses bleiben Karte und
 * Zeitstrahl montiert — würde Leaflet dabei neu aufgebaut, ginge der
 * Kartenausschnitt verloren und das Ganze flackerte bei jedem Klick.
 *
 * **Auf dem Handy stehen die drei nicht nebeneinander.** Bei 375 Pixeln
 * Breite und knapp 600 Pixeln Höhe bliebe für jede Ansicht ein Streifen
 * übrig, auf dem nichts zu erkennen ist. Stattdessen füllt genau eine
 * Ansicht den Bildschirm, umgeschaltet über die untere Leiste; die Details
 * kommen als Blatt von unten, damit die Karte darunter sichtbar bleibt.
 *
 * Beide Ansichten bleiben dabei **montiert** und werden nur ausgeblendet:
 * Leaflet verlöre sonst bei jedem Wechsel Ausschnitt und Zoomstufe.
 */
export default function AtlasPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const eventMatch = useMatch('/ereignis/:id') !== null;
  const [timelineHeight, setTimelineHeight] = useTimelineHeight();
  const atlasView = useUiStore((s) => s.atlasView);

  useUrlSync();

  /*
   * Die Tour führt den Detailbereich mit: Trägt die Etappe ein Ereignis, wird
   * es geöffnet; trägt sie keines, tritt an dessen Stelle die Etappe selbst.
   * Ohne den zweiten Fall bliebe das Ereignis der vorigen Etappe stehen.
   */
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);
  const tourLeg = useAtlasStore((s) => s.tourLeg);
  const tourJourney = tourLeg === null ? undefined : getJourney(activeJourneyId ?? undefined);
  const currentLeg = tourJourney?.legs.find((leg) => leg.order === tourLeg);

  useEffect(() => {
    if (!currentLeg) return;
    if (currentLeg.eventId) navigate({ pathname: `/ereignis/${currentLeg.eventId}`, search });
    else if (eventMatch) navigate({ pathname: '/', search });
    // `search` bewusst nicht in den Abhängigkeiten: Der Filterzustand ändert
    // sich beim Weiterschalten nicht, und jede Adressänderung löste sonst
    // eine zweite Navigation aus.
  }, [currentLeg]);

  const legPanel = currentLeg && !currentLeg.eventId && tourJourney ? currentLeg : null;
  const detailOpen = eventMatch || legPanel !== null;

  const detail =
    legPanel && tourJourney ? <TourLegDetail journey={tourJourney} leg={legPanel} /> : <Outlet />;

  // Die eingestellte Ansicht wird mitgenommen: Ohne `search` fiele sie beim
  // Öffnen eines Ereignisses aus der Adresse und käme erst verzögert zurück.
  const handleSelectEvent = useCallback(
    (eventId: string) => navigate({ pathname: `/ereignis/${eventId}`, search }),
    [navigate, search],
  );

  const closeDetail = useCallback(() => navigate({ pathname: '/', search }), [navigate, search]);

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Auf dem Handy füllt die aktive Ansicht alles; ab `md` teilen sich
            Karte und Zeitstrahl den Platz wie bisher. */}
        <div
          className={cn(
            'relative min-h-0 flex-1',
            isMobile && atlasView !== 'karte' && 'hidden',
          )}
        >
          <AtlasMap onSelectEvent={handleSelectEvent} />
        </div>

        {isMobile ? null : (
          <SplitHandle height={timelineHeight} onHeightChange={setTimelineHeight} />
        )}

        <div
          className={cn(
            'min-h-0',
            isMobile ? 'flex-1' : 'shrink-0',
            isMobile && atlasView !== 'zeit' && 'hidden',
          )}
          style={isMobile ? undefined : { height: `${timelineHeight}px` }}
        >
          <Timeline onSelectEvent={handleSelectEvent} />
        </div>
      </div>

      {/* Ab `md`: die Spalte rechts. */}
      <AnimatePresence initial={false}>
        {detailOpen && !isMobile ? (
          <motion.aside
            key="detail"
            initial={reducedMotion ? false : { width: 0, opacity: 0 }}
            animate={{ width: 372, opacity: 1 }}
            exit={reducedMotion ? { width: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.2, 0, 0.2, 1] }}
            className="z-20 shrink-0 overflow-hidden border-l border-line bg-surface"
            aria-label="Detailansicht"
          >
            <div className="h-full overflow-y-auto scrollbar-slim md:w-93">
              {detail}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* Darunter: das Blatt von unten. */}
      <AnimatePresence>
        {detailOpen && isMobile ? (
          <BottomSheet key="sheet" label="Detailansicht" onClose={closeDetail}>
            {detail}
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
