import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Hält Leaflet über die Größe seines Containers auf dem Laufenden.
 *
 * Leaflet misst sich beim Aufbau einmal und danach nur noch, wenn das
 * *Fenster* seine Größe ändert. Das genügt hier an drei Stellen nicht: wenn
 * die Filterleiste ein- oder ausklappt, wenn der Detailbereich aufgeht — und
 * vor allem auf dem Handy, wo die Karte beim Wechsel zum Zeitstrahl
 * ausgeblendet und später wieder eingeblendet wird. Ohne diese Meldung
 * zeichnet sie danach mit der alten Größe weiter: graue Streifen am Rand,
 * Marker an falscher Stelle, Klicks daneben.
 */
export default function MapAutoResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const observer = new ResizeObserver(() => {
      // Ausgeblendet meldet der Container 0×0. Dann nichts tun — sonst
      // merkt sich Leaflet diese Größe und rechnet später damit weiter.
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      map.invalidateSize({ animate: false });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}
