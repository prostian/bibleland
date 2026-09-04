import erasJson from '@/data/territories.json';

import type { Territory, TerritoryEra, TerritoryKind } from '@/types';
import { toContinuous } from '@/lib/year';

/**
 * Die historischen Grenzen — Reiche, Provinzen, Stammesgebiete.
 *
 * Heutige Staatsgrenzen erklären an einer Bibelkarte nichts: „Israel" auf
 * dem Kartenhintergrund ist nicht das Nordreich Israel, und wer in der
 * Apostelgeschichte liest, sucht Galatien, nicht die Türkei. Diese Ebene
 * legt deshalb das Gebietsbild der jeweiligen Zeit über die Karte.
 *
 * Zwei Dinge sind dabei bewusst so und nicht anders:
 *
 * 1. **Die Umrisse sind schematisch.** Antike Herrschaft endete an
 *    Einflusszonen, nicht an Katasterlinien; für viele Grenzen ist der
 *    Verlauf umstritten oder unbekannt. Die Ebene zeigt Größenverhältnisse
 *    und Nachbarschaften — mehr nicht. Gezeichnet wird sie deshalb
 *    durchgehend mit gestrichelten Rändern.
 * 2. **Die Epochen überlappen sich nicht.** Zu jedem Jahr gehört genau ein
 *    Kartenbild. Sonst müsste die Automatik raten, welches sie zeigt.
 *
 * Diese Datei wird nur von der Kartenebene geladen, nicht von `dataset.ts`
 * — so bleibt die Gebietsgeometrie aus dem ersten Ladevorgang heraus, wenn
 * die Ebene abgeschaltet ist.
 */

export const territoryEras: readonly TerritoryEra[] = [...erasJson].sort(
  (a, b) => a.yearFrom - b.yearFrom,
);

export const eraById: ReadonlyMap<string, TerritoryEra> = new Map(
  territoryEras.map((era) => [era.id, era]),
);

/**
 * Das Kartenbild zu einem Jahr.
 *
 * Außerhalb des abgedeckten Zeitraums die nächstgelegene Epoche: Wer die
 * Urgeschichte betrachtet, bekommt die Bronzezeit — falsch datiert, aber
 * näher an der Sache als gar kein Bild.
 */
export function eraAtYear(year: number): TerritoryEra {
  const y = toContinuous(year);
  const match = territoryEras.find(
    (era) => y >= toContinuous(era.yearFrom) && y <= toContinuous(era.yearTo),
  );
  if (match) return match;

  const first = territoryEras[0]!;
  const last = territoryEras[territoryEras.length - 1]!;
  return y < toContinuous(first.yearFrom) ? first : last;
}

/** Die Farbe eines Gebiets — dieselbe Quelle wie Tailwind und die Marker. */
export function territoryColorVar(territory: Territory): string {
  return `var(--bl-terr-${territory.color})`;
}

/**
 * Gebiete, deren Grenze nicht einmal ungefähr gezogen werden kann, werden
 * zusätzlich blasser und mit weiteren Strichen gezeichnet.
 */
export function isVague(kind: TerritoryKind): boolean {
  return kind === 'einfluss';
}
