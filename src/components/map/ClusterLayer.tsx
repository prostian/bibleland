import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useMap } from 'react-leaflet';

import type { BibleEvent, Place } from '@/types';
import { clusterIcon, dominantSection, placeIcon } from '@/lib/markerIcons';
import { eventIdFromClick, placePopupHtml } from '@/components/map/placePopup';

/**
 * Marker-Ebene mit Clustering.
 *
 * Bewusst imperativ statt über eine fertige React-Bindung: `leaflet.markercluster`
 * verwaltet seine Marker selbst, und die verfügbaren Wrapper hinken der
 * react-leaflet-5-API hinterher. Ein dünner `useMap()`-Adapter ist hier
 * weniger fehleranfällig als eine Abhängigkeit, die zur nächsten Version
 * bricht.
 *
 * Ein Marker steht für einen **Ort**, nicht für ein Ereignis. In Jerusalem
 * spielen Dutzende Ereignisse — als einzelne Pins lägen sie exakt
 * übereinander und wären nicht anklickbar. Die Zahl am Pin zeigt, wie viel
 * dahintersteckt.
 *
 * Wichtig ist die Trennung der beiden Effekte weiter unten: Marker werden
 * **nur** neu gebaut, wenn sich die Ortsgruppen ändern. Auswahl und
 * Mauszeigerposition ändern lediglich das Icon eines bestehenden Markers.
 * Würde man auch dafür neu bauen, verschwände jedes offene Auswahlmenü,
 * sobald der Zeiger den Marker verlässt — man käme nie bis zur Liste.
 */

export interface PlaceGroup {
  place: Place;
  events: BibleEvent[];
}

interface ClusterLayerProps {
  groups: readonly PlaceGroup[];
  selectedEventId: string | null;
  hoveredEntityId: string | null;
  /** Wird aufgerufen, wenn an einem Ort genau ein Ereignis liegt. */
  onSelectPlace: (group: PlaceGroup) => void;
  /** Wird aus der Auswahlliste eines Ortes mit mehreren Ereignissen gerufen. */
  onSelectEvent: (eventId: string) => void;
  onHoverPlace: (placeId: string | null) => void;
}

interface Entry {
  marker: L.Marker;
  group: PlaceGroup;
  /** Zuletzt gesetzter Icon-Zustand, um überflüssige Neuzeichnungen zu sparen. */
  state: string;
}

export default function ClusterLayer({
  groups,
  selectedEventId,
  hoveredEntityId,
  onSelectPlace,
  onSelectEvent,
  onHoverPlace,
}: ClusterLayerProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const entriesRef = useRef<Entry[]>([]);

  // Handler und Auswahl in Refs halten: Sie ändern sich bei jedem Render, die
  // Marker sollen deswegen aber nicht neu aufgebaut werden.
  const handlers = useRef({ onSelectPlace, onSelectEvent, onHoverPlace });
  handlers.current = { onSelectPlace, onSelectEvent, onHoverPlace };

  const selectedRef = useRef(selectedEventId);
  selectedRef.current = selectedEventId;

  /* ---------------------------------------------------------------- *
   * Die Cluster-Ebene selbst
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 45,
      disableClusteringAtZoom: 9,
      chunkedLoading: true,
      iconCreateFunction: (group) => {
        const markers = group.getAllChildMarkers();
        const events = markers.flatMap(
          (m) => ((m.options as { blEvents?: BibleEvent[] }).blEvents ?? []) as BibleEvent[],
        );
        return clusterIcon(events.length || markers.length, dominantSection(events));
      },
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
      entriesRef.current = [];
    };
  }, [map]);

  /* ---------------------------------------------------------------- *
   * Marker aufbauen — nur bei geänderten Ortsgruppen
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();

    const entries: Entry[] = groups.map((group) => {
      const { place, events } = group;

      const marker = L.marker([place.lat, place.lng], {
        icon: placeIcon(
          dominantSection(events),
          events.length,
          place.locationCertainty ?? 'hoch',
          {},
          events[0]?.eventType ?? 'politik',
        ),
        title: `${place.name} — ${events.length} ${events.length === 1 ? 'Ereignis' : 'Ereignisse'}`,
        riseOnHover: true,
        // Zusatzdaten am Marker, damit das Cluster-Icon die Abschnittsfarbe
        // seiner Kinder bestimmen kann.
        blEvents: events,
      } as L.MarkerOptions);

      // Ein Ereignis: direkt auswählen. Mehrere: Liste zum Auswählen öffnen,
      // sonst wären die übrigen über die Karte unerreichbar.
      if (events.length === 1) {
        marker.on('click', () => handlers.current.onSelectPlace(group));
        marker.on('keypress', (e: L.LeafletKeyboardEvent) => {
          if (e.originalEvent.key === 'Enter') handlers.current.onSelectPlace(group);
        });
      } else {
        // Als Funktion, damit die Hervorhebung des aktuellen Ereignisses beim
        // Öffnen frisch berechnet wird statt beim Aufbau der Marker.
        marker.bindPopup(() => placePopupHtml(group, selectedRef.current), {
          className: 'bl-pop-wrap',
          maxWidth: 340,
          minWidth: 268,
          autoPanPadding: [24, 24],
          closeButton: true,
          // Beim Verschieben der Karte geschlossen zu werden ist unnötig —
          // das Automatik-Panning beim Öffnen genügt.
          autoClose: true,
        });

        const onPopupClick = (event: Event) => {
          const eventId = eventIdFromClick(event.target);
          if (!eventId) return;
          handlers.current.onSelectEvent(eventId);
          marker.closePopup();
        };

        // Listener beim Öffnen setzen und beim Schließen wieder abräumen,
        // sonst sammeln sich bei jedem Öffnen weitere an.
        marker.on('popupopen', (e) => {
          e.popup.getElement()?.addEventListener('click', onPopupClick);
        });
        marker.on('popupclose', (e) => {
          e.popup.getElement()?.removeEventListener('click', onPopupClick);
        });
      }

      marker.on('mouseover', () => handlers.current.onHoverPlace(place.id));
      marker.on('mouseout', () => handlers.current.onHoverPlace(null));

      return { marker, group, state: '' };
    });

    entriesRef.current = entries;
    cluster.addLayers(entries.map((entry) => entry.marker));
  }, [groups]);

  /* ---------------------------------------------------------------- *
   * Auswahl und Hervorhebung — ohne Neuaufbau
   * ---------------------------------------------------------------- */
  useEffect(() => {
    for (const entry of entriesRef.current) {
      const { place, events } = entry.group;
      const isSelected = events.some((e) => e.id === selectedEventId);
      const isHovered =
        hoveredEntityId === place.id || events.some((e) => e.id === hoveredEntityId);

      // Das Zeichen stammt vom ausgewählten Ereignis, sonst vom ersten — so
      // wechselt der Pin mit, wenn man an einem Ort durch die Ereignisse
      // blättert.
      const leading = events.find((e) => e.id === selectedEventId) ?? events[0];
      const state = `${isSelected}|${isHovered}|${leading?.eventType ?? ''}`;
      if (state === entry.state) continue;
      entry.state = state;

      entry.marker.setIcon(
        placeIcon(
          dominantSection(events),
          events.length,
          place.locationCertainty ?? 'hoch',
          { selected: isSelected, hovered: isHovered },
          leading?.eventType ?? 'politik',
        ),
      );
    }
  }, [selectedEventId, hoveredEntityId, groups]);

  return null;
}
