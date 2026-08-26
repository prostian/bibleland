import { useCallback } from 'react';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import AtlasMap from '@/components/map/AtlasMap';
import Timeline from '@/components/timeline/Timeline';
import SplitHandle, { useTimelineHeight } from '@/components/layout/SplitHandle';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Die Hauptansicht: Karte oben, Zeitstrahl unten, Detailbereich rechts.
 *
 * Als **pfadlose** Layoutroute angelegt, damit `/` und `/ereignis/:id`
 * dieselbe Instanz teilen. Beim Öffnen eines Ereignisses bleiben Karte und
 * Zeitstrahl montiert — würde Leaflet dabei neu aufgebaut, ginge der
 * Kartenausschnitt verloren und das Ganze flackerte bei jedem Klick.
 */
export default function AtlasPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const detailOpen = useMatch('/ereignis/:id') !== null;
  const [timelineHeight, setTimelineHeight] = useTimelineHeight();

  const handleSelectEvent = useCallback(
    (eventId: string) => navigate(`/ereignis/${eventId}`),
    [navigate],
  );

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Die Karte nimmt, was übrig bleibt — der Zeitstrahl bekommt eine
            feste, vom Nutzer eingestellte Höhe. */}
        <div className="relative min-h-0 flex-1">
          <AtlasMap onSelectEvent={handleSelectEvent} />
        </div>
        <SplitHandle height={timelineHeight} onHeightChange={setTimelineHeight} />
        <div className="min-h-0 shrink-0" style={{ height: `${timelineHeight}px` }}>
          <Timeline onSelectEvent={handleSelectEvent} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {detailOpen ? (
          <motion.aside
            key="detail"
            initial={reducedMotion ? false : { width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : 372, opacity: 1 }}
            exit={reducedMotion ? { width: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.2, 0, 0.2, 1] }}
            className="z-20 shrink-0 overflow-hidden border-l border-line bg-surface max-md:absolute max-md:inset-0 max-md:border-l-0"
            aria-label="Detailansicht"
          >
            <div className="h-full overflow-y-auto scrollbar-slim md:w-93">
              <Outlet />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
