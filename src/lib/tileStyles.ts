/**
 * Kartenhintergründe.
 *
 * Die Standardkacheln von OpenStreetMap beschriften jeden Ort in seiner
 * Landessprache — in Ägypten, Israel und Jordanien also auf Arabisch und
 * Hebräisch. Für einen deutschsprachigen Bibelatlas ist das unbrauchbar:
 * Wer „Alexandria" sucht, findet „الإسكندرية".
 *
 * Deshalb gibt es hier zwei Alternativen. Beide beziehen dieselben
 * OpenStreetMap-Daten, rendern aber in lateinischer Schrift.
 */

export type TileStyleId = 'deutsch' | 'neutral';

export interface TileVariant {
  url: string;
  maxZoom: number;
}

export interface TileStyle {
  id: TileStyleId;
  label: string;
  /** Kurze Erklärung für den Umschalter. */
  hint: string;
  attribution: string;
  light: TileVariant;
  /**
   * Eigene Kacheln für den dunklen Modus. Fehlen sie, werden die hellen
   * Kacheln per CSS invertiert — das sieht weniger gut aus, ist aber besser,
   * als den Nutzer im Dunkeln zu blenden.
   */
  dark?: TileVariant;
}

export const TILE_STYLES: Record<TileStyleId, TileStyle> = {
  /**
   * Der deutsche OSM-Stil rendert `name:de`, wo es getaggt ist, und sonst
   * die lateinische Umschrift. „Ägypten", „Jerusalem", „Damaskus" — genau
   * das, was ein deutschsprachiger Atlas braucht. Einen dunklen Satz gibt es
   * dafür nicht.
   */
  deutsch: {
    id: 'deutsch',
    label: 'Deutsch',
    hint: 'Deutsche Orts- und Ländernamen, wo vorhanden',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende · Kacheln: openstreetmap.de',
    light: { url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png', maxZoom: 18 },
  },

  /**
   * CARTO rendert die lateinische Umschrift und hat einen echten dunklen
   * Satz. Zurückhaltender gezeichnet als der Standardstil — die Marker
   * treten dadurch stärker hervor.
   */
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    hint: 'Lateinische Schrift, zurückhaltend — mit echtem Dunkelmodus',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende &copy; <a href="https://carto.com/attributions">CARTO</a>',
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      maxZoom: 20,
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      maxZoom: 20,
    },
  },
};

export const TILE_STYLE_LIST: readonly TileStyle[] = [TILE_STYLES.deutsch, TILE_STYLES.neutral];

/**
 * Die passende Kachelvariante — und ob die App nachhelfen muss.
 *
 * `invert` bedeutet: Für diesen Stil gibt es keine dunklen Kacheln, also
 * dreht CSS die hellen um. Das muss die Karte wissen, damit sie den Filter
 * nur dort einschaltet, wo er nötig ist.
 */
export function resolveTiles(
  style: TileStyle,
  theme: 'light' | 'dark',
): { variant: TileVariant; invert: boolean } {
  if (theme === 'dark' && style.dark) return { variant: style.dark, invert: false };
  if (theme === 'dark') return { variant: style.light, invert: true };
  return { variant: style.light, invert: false };
}
