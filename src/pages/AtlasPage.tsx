import { useCallback } from 'react';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import AtlasMap from '@/components/map/AtlasMap';
import Timeline from '@/components/timeline/Timeline';
import SplitHandle, { useTimelineHeight } from '@/components/layout/SplitHandle';
import BottomSheet from '@/components/layout/BottomSheet';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
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
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const detailOpen = useMatch('/ereignis/:id') !== null;
  const [timelineHeight, setTimelineHeight] = useTimelineHeight();
  const atlasView = useUiStore((s) => s.atlasView);

  const handleSelectEvent = useCallback(
    (eventId: string) => navigate(`/ereignis/${eventId}`),
    [navigate],
  );

  const closeDetail = useCallback(() => navigate('/'), [navigate]);

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
              <Outlet />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {/* Darunter: das Blatt von unten. */}
      <AnimatePresence>
        {detailOpen && isMobile ? (
          <BottomSheet key="sheet" label="Detailansicht" onClose={closeDetail}>
            <Outlet />
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
