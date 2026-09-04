import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';

import { placeLabelIcon } from '@/lib/markerIcons';
import type { PlaceGroup } from '@/components/map/ClusterLayer';

/**
 * Ab dieser Zoomstufe stehen die Ortsnamen an den Pins.
 *
 * Derselbe Wert, bei dem `ClusterLayer` das Clustering abschaltet: Solange
 * mehrere Orte zu einem Bündel zusammengefasst sind, wäre eine Beschriftung
 * pro Ort ohnehin nicht zuzuordnen.
 */
const LABEL_ZOOM = 9;

interface PlaceLabelsProps {
  groups: readonly PlaceGroup[];
  selectedPlaceId: string | null;
}

/**
 * Die biblischen Ortsnamen als eigene Beschriftungsebene.
 *
 * Die Kacheln beschriften den heutigen Ort in der Größe einer
 * Übersichtskarte. Beides passt hier nicht: Gesucht wird der biblische Name,
 * und gelesen werden soll er auch. Deshalb setzt die App ihn selbst — aus
 * `places.json`, in lesbarer Größe, mit hellem Rand gegen den Kartengrund.
 *
 * Beschriftet werden nur die Orte, an denen gerade auch Ereignisse liegen —
 * dieselbe Menge wie die Marker. Eine Ebene, die mehr zeigt als die andere,
 * wäre nur verwirrend.
 */
export default function PlaceLabels({ groups, selectedPlaceId }: PlaceLabelsProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  // `zoomend` statt `zoom`: Während des Zoomens würde die Ebene bei jedem
  // Zwischenschritt neu aufgebaut, ohne dass man den Unterschied sähe.
  useEffect(() => {
    const update = () => setZoom(map.getZoom());
    map.on('zoomend', update);
    return () => {
      map.off('zoomend', update);
    };
  }, [map]);

  if (zoom < LABEL_ZOOM) return null;

  return (
    <>
      {groups.map(({ place }) => (
        <Marker
          key={`label-${place.id}`}
          position={[place.lat, place.lng]}
          icon={placeLabelIcon(place.name, { selected: place.id === selectedPlaceId })}
          interactive={false}
          keyboard={false}
          // Unter die Pins, damit ein langer Name den Marker daneben nicht
          // verdeckt.
          zIndexOffset={-500}
        />
      ))}
    </>
  );
}
