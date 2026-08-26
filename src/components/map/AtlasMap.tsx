import { useCallback, useMemo } from 'react';
import { MapContainer, ZoomControl } from 'react-leaflet';

import type { BibleEvent, Place } from '@/types';
import { getBook, getJourney, placeById } from '@/lib/dataset';
import { buildSegments, toJourney } from '@/lib/readingPath';
import { toContinuous } from '@/lib/year';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useVisibleMapEvents } from '@/hooks/useVisibleEvents';
import BaseTileLayer, { useTileInversion } from '@/components/map/BaseTileLayer';
import ClusterLayer, { type PlaceGroup } from '@/components/map/ClusterLayer';
import JourneyRoutes from '@/components/map/JourneyRoutes';
import MapController from '@/components/map/MapController';
import MapLegend from '@/components/map/MapLegend';
import MapStyleControl from '@/components/map/MapStyleControl';
import { cn } from '@/lib/cn';

/** Ausgangsausschnitt: die Levante mit Ägypten und Mesopotamien am Rand. */
const INITIAL_CENTER: [number, number] = [32.5, 35.5];
const INITIAL_ZOOM = 6;

interface AtlasMapProps {
  onSelectEvent: (eventId: string) => void;
}

export default function AtlasMap({ onSelectEvent }: AtlasMapProps) {
  const events = useVisibleMapEvents();
  const selectedEventId = useAtlasStore((s) => s.selectedEventId);
  const hoveredEntityId = useAtlasStore((s) => s.hoveredEntityId);
  const hoverEntity = useAtlasStore((s) => s.hoverEntity);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);

  const invertTiles = useTileInversion();
  const axisMode = useAtlasStore((s) => s.axisMode);
  const readingScope = useAtlasStore((s) => s.readingScope);

  /**
   * Im Lesemodus zeigt die Karte den Lesepfad statt einer Reiseroute: die
   * Orte des Buchs, nummeriert in Lesereihenfolge und verbunden. Beides
   * gleichzeitig zu zeichnen würde nur zwei Linien übereinanderlegen.
   */
  const readingJourney = useMemo(() => {
    if (axisMode !== 'kapitel') return null;
    const segments = buildSegments(readingScope);
    const colorToken =
      readingScope.kind === 'abschnitt'
        ? readingScope.id
        : (getBook(readingScope.id)?.section ?? 'geschichtsbuecher');
    return toJourney(segments, readingScope, colorToken);
  }, [axisMode, readingScope]);

  const activeJourney =
    readingJourney ?? (activeJourneyId ? getJourney(activeJourneyId) : undefined);

  /**
   * Ereignisse nach Ort bündeln. In Jerusalem spielen Dutzende Ereignisse —
   * als einzelne Pins lägen sie exakt übereinander und wären weder
   * anklickbar noch zählbar.
   */
  const groups: PlaceGroup[] = useMemo(() => {
    const byPlace = new Map<string, BibleEvent[]>();
    for (const event of events) {
      if (!event.placeId) continue;
      const bucket = byPlace.get(event.placeId);
      if (bucket) bucket.push(event);
      else byPlace.set(event.placeId, [event]);
    }

    const result: PlaceGroup[] = [];
    for (const [placeId, placeEvents] of byPlace) {
      const place: Place | undefined = placeById.get(placeId);
      if (!place) continue;
      placeEvents.sort((a, b) => toContinuous(a.year) - toContinuous(b.year));
      result.push({ place, events: placeEvents });
    }
    return result;
  }, [events]);

  // Nur bei genau einem Ereignis am Ort — bei mehreren öffnet ClusterLayer
  // stattdessen eine Auswahlliste.
  const handleSelectPlace = useCallback(
    (group: PlaceGroup) => {
      const first = group.events[0];
      if (first) onSelectEvent(first.id);
    },
    [onSelectEvent],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={3}
        maxZoom={16}
        zoomControl={false}
        scrollWheelZoom
        className={cn('h-full w-full', invertTiles && 'bl-invert-tiles')}
        worldCopyJump
      >
        <BaseTileLayer />

        <ZoomControl position="bottomright" />
        <MapController />

        {activeJourney ? (
          <JourneyRoutes journey={activeJourney} onSelectEvent={onSelectEvent} />
        ) : null}

        <ClusterLayer
          groups={groups}
          selectedEventId={selectedEventId}
          hoveredEntityId={hoveredEntityId}
          onSelectPlace={handleSelectPlace}
          onSelectEvent={onSelectEvent}
          onHoverPlace={hoverEntity}
        />
      </MapContainer>

      <MapLegend placeCount={groups.length} eventCount={events.length} />
      <MapStyleControl />
    </div>
  );
}
