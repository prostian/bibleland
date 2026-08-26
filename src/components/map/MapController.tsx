import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { getEvent, getJourney, getPlace, placeById } from '@/lib/dataset';
import { useAtlasStore } from '@/store/useAtlasStore';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/** Zoomstufe, auf die beim Auswählen eines Ereignisses geflogen wird. */
const FOCUS_ZOOM = 9;

/**
 * Verbindet die Karte mit dem Auswahlzustand.
 *
 * Rendert nichts — diese Komponente ist der Draht zwischen Zeitstrahl und
 * Karte. Wird irgendwo ein Ereignis ausgewählt, fliegt die Karte zu dessen
 * Ort; wird eine Reise aktiviert, rückt sie deren gesamte Route ins Bild.
 */
export default function MapController() {
  const map = useMap();
  const selectedEventId = useAtlasStore((s) => s.selectedEventId);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);
  const reducedMotion = usePrefersReducedMotion();

  // Worauf zuletzt geflogen wurde. Ohne diese Sperre würde jeder Rerender —
  // etwa beim Filtern — die Karte erneut in Bewegung setzen und den Nutzer
  // aus seinem selbst gewählten Ausschnitt reißen.
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedEventId) return;
    const key = `event:${selectedEventId}`;
    if (lastTarget.current === key) return;

    const place = getPlace(getEvent(selectedEventId)?.placeId);
    if (!place) return;

    lastTarget.current = key;
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);

    if (reducedMotion) map.setView([place.lat, place.lng], zoom);
    else map.flyTo([place.lat, place.lng], zoom, { duration: 0.7, easeLinearity: 0.28 });
  }, [selectedEventId, map, reducedMotion]);

  useEffect(() => {
    if (!activeJourneyId) return;
    const key = `journey:${activeJourneyId}`;
    if (lastTarget.current === key) return;

    const journey = getJourney(activeJourneyId);
    if (!journey) return;

    const points = journey.legs
      .map((leg) => placeById.get(leg.placeId))
      .filter((place) => place !== undefined)
      .map((place) => [place.lat, place.lng] as L.LatLngTuple);

    if (points.length < 2) return;

    lastTarget.current = key;
    map.fitBounds(L.latLngBounds(points), {
      padding: [64, 64],
      animate: !reducedMotion,
      duration: 0.7,
    });
  }, [activeJourneyId, map, reducedMotion]);

  return null;
}
