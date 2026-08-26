import { useMemo } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import type L from 'leaflet';

import type { Journey } from '@/types';
import { placeById } from '@/lib/dataset';
import { journeyLegIcon } from '@/lib/markerIcons';
import { sectionColorVar } from '@/lib/labels';

interface JourneyRoutesProps {
  journey: Journey;
  onSelectEvent: (eventId: string) => void;
}

/**
 * Zeichnet eine Reise als Linienzug mit nummerierten Etappen.
 *
 * Umstrittene Routen — Exodus, Abrahams Wanderung — werden gestrichelt
 * gezeichnet. Die Apostelgeschichte nennt für die Paulusreisen Hafen für
 * Hafen, dort ist eine durchgezogene Linie berechtigt; die Wüstenwanderung
 * dagegen ist Rekonstruktion, und das soll man sehen.
 */
export default function JourneyRoutes({ journey, onSelectEvent }: JourneyRoutesProps) {
  const legs = useMemo(
    () =>
      [...journey.legs]
        .sort((a, b) => a.order - b.order)
        .map((leg) => ({ leg, place: placeById.get(leg.placeId) }))
        .filter((entry): entry is { leg: (typeof journey.legs)[number]; place: NonNullable<typeof entry.place> } =>
          entry.place !== undefined,
        ),
    [journey],
  );

  const positions = useMemo(
    () => legs.map(({ place }) => [place.lat, place.lng] as L.LatLngTuple),
    [legs],
  );

  if (positions.length < 2) return null;

  const color = sectionColorVar(journey.colorToken);
  const uncertain = journey.routeCertainty === 'niedrig' || journey.routeCertainty === 'symbolisch';

  return (
    <>
      {/* Breite, halbtransparente Unterlinie — hebt die Route auch über
          unruhigem Kartenbild ab, ohne sie zu überdecken. */}
      <Polyline positions={positions} pathOptions={{ color, weight: 9, opacity: 0.16 }} />
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight: 3,
          opacity: 0.95,
          dashArray: uncertain ? '7 6' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {legs.map(({ leg, place }) => (
        <Marker
          key={`${journey.id}-${leg.order}`}
          position={[place.lat, place.lng]}
          icon={journeyLegIcon(leg.order, journey.colorToken)}
          eventHandlers={leg.eventId ? { click: () => onSelectEvent(leg.eventId!) } : undefined}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            <span className="font-medium">
              {leg.order}. {place.name}
            </span>
            {leg.note ? <span className="block text-ink-muted">{leg.note}</span> : null}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
