import { TileLayer } from 'react-leaflet';

import { resolveTiles } from '@/lib/tileStyles';
import { useTileStyle } from '@/store/useMapStyleStore';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * Der Kartenhintergrund, abgestimmt auf Kartenstil und Farbschema.
 *
 * Als eigene Komponente, damit alle Karten der App — Atlas, Ortsseite,
 * Reiseseite — denselben Hintergrund zeigen und eine Änderung nur an einer
 * Stelle nötig ist.
 *
 * Der `key` erzwingt einen Neuaufbau beim Stilwechsel: Leaflet tauscht die
 * URL einer bestehenden Ebene sonst nicht sauber aus und behält alte
 * Kacheln im Zwischenspeicher.
 */
export default function BaseTileLayer() {
  const style = useTileStyle();
  const theme = useThemeStore((s) => s.resolved);
  const { variant } = resolveTiles(style, theme);

  return (
    <TileLayer
      key={`${style.id}-${theme}`}
      url={variant.url}
      attribution={style.attribution}
      maxZoom={variant.maxZoom}
      detectRetina
    />
  );
}

/**
 * Muss CSS die Kacheln für den dunklen Modus umdrehen?
 *
 * Nur beim deutschen Stil, für den es keinen dunklen Kachelsatz gibt. Der
 * neutrale Stil bringt eigene dunkle Kacheln mit und darf auf keinen Fall
 * zusätzlich invertiert werden.
 */
export function useTileInversion(): boolean {
  const style = useTileStyle();
  const theme = useThemeStore((s) => s.resolved);
  return resolveTiles(style, theme).invert;
}
