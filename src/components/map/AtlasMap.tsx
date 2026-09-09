import { useCallback, useMemo, useState } from 'react';
import { MapContainer, ZoomControl } from 'react-leaflet';

import type { BibleEvent, Place, TerritoryEra } from '@/types';
import { getBook, getEvent, getJourney, placeById } from '@/lib/dataset';
import { buildSegments, toJourney } from '@/lib/readingPath';
import { eraAtYear, eraById } from '@/lib/territories';
import { fromContinuous, toContinuous } from '@/lib/year';
import { useAtlasStore, type YearRange } from '@/store/useAtlasStore';
import { useMapStyleStore } from '@/store/useMapStyleStore';
import { useVisibleMapEvents } from '@/hooks/useVisibleEvents';
import BaseTileLayer, { useTileInversion } from '@/components/map/BaseTileLayer';
import ClusterLayer, { type PlaceGroup } from '@/components/map/ClusterLayer';
import HistoricalBorders from '@/components/map/HistoricalBorders';
import JourneyRoutes from '@/components/map/JourneyRoutes';
import MapAutoResize from '@/components/map/MapAutoResize';
import MapBordersControl from '@/components/map/MapBordersControl';
import MapController from '@/components/map/MapController';
import MapLegend from '@/components/map/MapLegend';
import MapStyleControl from '@/components/map/MapStyleControl';
import PlaceLabels from '@/components/map/PlaceLabels';
import { useIsTouch } from '@/hooks/useMediaQuery';
import { useOnline } from '@/hooks/useOnline';
import { cn } from '@/lib/cn';

/** Ausgangsausschnitt: die Levante mit Ägypten und Mesopotamien am Rand. */
const INITIAL_CENTER: [number, number] = [32.5, 35.5];
const INITIAL_ZOOM = 6;

/**
 * Die Karte ist kein Bild, sondern ein Bedienelement: Leaflet macht den
 * Container fokussierbar und verschiebt ihn mit den Pfeiltasten. Ohne
 * Beschriftung kündigt ein Screenreader dort nichts an. Ein vorlesbarer Ersatz
 * für die Fläche selbst ist das nicht — deshalb der Hinweis auf die beiden
 * Wege, die zu denselben Orten führen.
 */
const MAP_LABEL =
  'Karte der biblischen Welt — dieselben Orte sind über den Zeitstrahl und die Suche erreichbar';

interface AtlasMapProps {
  onSelectEvent: (eventId: string) => void;
}

/**
 * Das Jahr, nach dem sich die Gebietsebene richtet.
 *
 * Erst das ausgewählte Ereignis — wer Paulus in Ephesus anschaut, will die
 * römischen Provinzen sehen. Sonst der Mittelwert dessen, was gerade auf der
 * Karte liegt: Die Ereignisse kommen chronologisch sortiert an, der mittlere
 * ist also der Median und robuster als ein Durchschnitt, den ein einzelnes
 * Urgeschichte-Ereignis um Jahrtausende verzöge. Und wenn gar nichts sichtbar
 * ist, die Mitte des Zeitfensters.
 */
function eraYear(
  events: readonly BibleEvent[],
  selectedEventId: string | null,
  viewRange: YearRange,
): number {
  const selected = getEvent(selectedEventId ?? undefined);
  if (selected) return selected.year;

  const middle = events[Math.floor(events.length / 2)];
  if (middle) return middle.year;

  return fromContinuous((toContinuous(viewRange.from) + toContinuous(viewRange.to)) / 2);
}

export default function AtlasMap({ onSelectEvent }: AtlasMapProps) {
  const events = useVisibleMapEvents();
  const selectedEventId = useAtlasStore((s) => s.selectedEventId);
  const hoveredEntityId = useAtlasStore((s) => s.hoveredEntityId);
  const hoverEntity = useAtlasStore((s) => s.hoverEntity);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);

  const invertTiles = useTileInversion();
  const isTouch = useIsTouch();
  const axisMode = useAtlasStore((s) => s.axisMode);
  const readingScope = useAtlasStore((s) => s.readingScope);
  const viewRange = useAtlasStore((s) => s.viewRange);

  const online = useOnline();
  // Erst wenn tatsaechlich Kacheln fehlschlagen, ist der Hinweis begruendet.
  const [tilesFailed, setTilesFailed] = useState(false);

  const bordersMode = useMapStyleStore((s) => s.bordersMode);
  const bordersEraId = useMapStyleStore((s) => s.bordersEraId);

  /** Welches Gebietsbild liegt unter den Markern? `null` = keins. */
  const era: TerritoryEra | null = useMemo(() => {
    if (bordersMode === 'aus') return null;
    const auto = () => eraAtYear(eraYear(events, selectedEventId, viewRange));
    // Eine festgehaltene, aber unbekannte Epoche kommt aus einem alten Link
    // oder einer alten Merkeinstellung. Die automatische Wahl ist dann die
    // richtige Antwort — eine leere Ebene sähe wie ein Fehler aus.
    if (bordersMode === 'fest') return eraById.get(bordersEraId) ?? auto();
    return auto();
  }, [bordersMode, bordersEraId, events, selectedEventId, viewRange]);

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

  /** Der Ort des ausgewählten Ereignisses — seine Beschriftung wird hervorgehoben. */
  const selectedPlaceId = getEvent(selectedEventId ?? undefined)?.placeId ?? null;

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
        ref={(map) => {
          // Den Container erzeugt Leaflet selbst, und react-leaflet gibt keine
          // DOM-Attribute an ihn durch — deshalb hier am fertigen Element.
          const node = map?.getContainer();
          node?.setAttribute('role', 'application');
          node?.setAttribute('aria-label', MAP_LABEL);
        }}
      >
        <BaseTileLayer onTileError={() => setTilesFailed(true)} />

        {era ? <HistoricalBorders era={era} /> : null}

        {/* Am Finger wird gezwickt, nicht geklickt — die Knöpfe würden auf
            einem Telefonbildschirm nur Karte verdecken. */}
        {isTouch ? null : <ZoomControl position="bottomright" />}
        <MapAutoResize />
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

        <PlaceLabels groups={groups} selectedPlaceId={selectedPlaceId} />
      </MapContainer>

      <MapLegend placeCount={groups.length} eventCount={events.length} />

      {/* Unten links in einer Spalte: Grenzen über Kartenhintergrund. Die
          Zoomknöpfe sitzen unten rechts, die Legende oben links. */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-1000 flex w-44 flex-col items-start gap-1.5 sm:bottom-3 sm:left-3 sm:w-52">
        {/*
          Ohne Netz fehlen die Kacheln unbesuchter Gegenden — die Sachdaten
          nicht. Eine graue Fläche ohne Erklärung sähe nach einem Defekt aus;
          der Satz sagt, was fehlt und was weiterhin funktioniert.
        */}
        {!online && tilesFailed ? (
          <p className="pointer-events-auto rounded-lg border border-line bg-overlay px-2 py-1.5 text-[10px] leading-snug text-ink-subtle shadow-panel backdrop-blur-md">
            Kartenhintergrund offline nicht verfügbar. Orte, Zeitstrahl und Details bleiben da.
          </p>
        ) : null}
        <MapBordersControl activeEra={era} />
        <MapStyleControl />
      </div>
    </div>
  );
}
