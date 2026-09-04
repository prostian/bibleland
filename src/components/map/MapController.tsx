import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { getEvent, getJourney, getPlace, placeById } from '@/lib/dataset';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/** Zoomstufe, auf die beim Auswählen eines Ereignisses geflogen wird. */
const FOCUS_ZOOM = 9;

/**
 * Wie weit der Kartenmittelpunkt auf dem Handy nach unten rückt.
 *
 * Dort liegt über der unteren Hälfte das Detailblatt. Flöge die Karte den
 * Ort genau in die Mitte, verschwände der Marker darunter — man bekäme die
 * Beschreibung eines Ortes zu sehen, den man nicht sieht. Der versetzte
 * Mittelpunkt hebt ihn in die obere Hälfte.
 */
const MOBILE_FOCUS_SHIFT = 0.22;

/**
 * Ein Mittelpunkt, der das Ziel um einen Anteil der Kartenhöhe nach oben
 * schiebt. Gerechnet wird in projizierten Pixeln, weil ein fester Gradwert
 * je nach Zoomstufe mal ein Dorf und mal ein Land weit wäre.
 */
function shiftedCenter(
  map: L.Map,
  target: L.LatLngTuple,
  zoom: number,
  ratio: number,
): L.LatLngTuple {
  if (ratio === 0) return target;
  const point = map.project(target, zoom);
  const shifted = point.add(L.point(0, map.getSize().y * ratio));
  const latLng = map.unproject(shifted, zoom);
  return [latLng.lat, latLng.lng];
}

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
  const isMobile = useIsMobile();

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
    const center = shiftedCenter(
      map,
      [place.lat, place.lng],
      zoom,
      isMobile ? MOBILE_FOCUS_SHIFT : 0,
    );

    if (reducedMotion) map.setView(center, zoom);
    else map.flyTo(center, zoom, { duration: 0.7, easeLinearity: 0.28 });
  }, [selectedEventId, map, reducedMotion, isMobile]);

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
    // Auf dem Handy ein knapperer Rand: 64 Pixel auf jeder Seite fräßen von
    // einem 375 Pixel breiten Bild ein Drittel weg.
    const pad: L.PointTuple = isMobile ? [24, 24] : [64, 64];
    map.fitBounds(L.latLngBounds(points), {
      padding: pad,
      animate: !reducedMotion,
      duration: 0.7,
    });
  }, [activeJourneyId, map, reducedMotion, isMobile]);

  return null;
}
