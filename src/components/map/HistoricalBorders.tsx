import { Marker, Pane, Polygon, Tooltip } from 'react-leaflet';

import type { TerritoryEra } from '@/types';
import { isVague, territoryColorVar } from '@/lib/territories';
import { territoryLabelIcon } from '@/lib/markerIcons';

/**
 * Die Gebiete einer Epoche als Kartenebene.
 *
 * Warum das nötig ist: Der Kartenhintergrund zeigt heutige Staaten. Für die
 * biblische Geografie erklärt der nichts — „Israel" auf den Kacheln ist nicht
 * das Nordreich Israel, „Türkei" sagt nichts darüber, warum Paulus nach
 * Galatien schreibt. Diese Ebene legt darüber, wie das Land zur jeweiligen
 * Zeit aufgeteilt war.
 *
 * Die Ränder sind **durchgehend gestrichelt**, und das ist kein Stilmittel:
 * Antike Herrschaftsgebiete endeten an Einflusszonen, nicht an Linien. Eine
 * durchgezogene Grenze würde eine Genauigkeit behaupten, die es nicht gibt.
 * Tributpflichtige Gebiete (`einfluss`) sind zusätzlich blasser.
 *
 * Eigener Pane: Die Gebiete gehören über die Kacheln, aber unter Reiserouten
 * und Marker. Leaflet legt für einen benannten Pane automatisch einen eigenen
 * SVG-Renderer an, sodass die Flächen den `overlayPane` nicht belegen.
 */

/** Zwischen Kacheln (200) und `overlayPane` (400). */
const PANE_Z = 250;

export default function HistoricalBorders({ era }: { era: TerritoryEra }) {
  return (
    <Pane name="bl-territories" style={{ zIndex: PANE_Z }}>
      {era.territories.map((territory) => {
        const color = territoryColorVar(territory);
        const vague = isVague(territory.kind);
        return (
          <Polygon
            key={territory.id}
            positions={territory.ring}
            pathOptions={{
              color,
              weight: vague ? 1.4 : 1.8,
              opacity: vague ? 0.5 : 0.8,
              dashArray: vague ? '3 5' : '6 4',
              fillColor: color,
              fillOpacity: vague ? 0.07 : 0.13,
            }}
          >
            <Tooltip sticky className="bl-terr-tip">
              <span className="font-medium">{territory.name}</span>
              {territory.note ? (
                <span className="mt-0.5 block text-ink-muted">{territory.note}</span>
              ) : null}
            </Tooltip>
          </Polygon>
        );
      })}

      {era.territories.map((territory) =>
        territory.label ? (
          <Marker
            key={`label-${territory.id}`}
            position={territory.label}
            icon={territoryLabelIcon(
              territory.name,
              territoryColorVar(territory),
              isVague(territory.kind),
            )}
            interactive={false}
            keyboard={false}
          />
        ) : null,
      )}
    </Pane>
  );
}
