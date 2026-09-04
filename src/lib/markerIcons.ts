import L from 'leaflet';

import type { BibleEvent, Certainty, EventType, Section } from '@/types';

/**
 * Leaflet-Marker als eingebettetes SVG.
 *
 * Die Füllfarbe wird nicht als Hexwert gesetzt, sondern als `var(--bl-…)`.
 * Weil das Icon-Markup im Dokument hängt, erbt es die Variablen von `:root`
 * — beim Wechsel zwischen hellem und dunklem Modus färben sich alle Marker
 * sofort um, ohne dass React etwas neu rendern müsste.
 *
 * Kodierung: **Farbe = Bibelabschnitt**, **Zeichen = Art des Ereignisses**.
 * Jede der dreizehn Arten hat ihr eigenes Bild — Handschlag für den Bund,
 * gekreuzte Schwerter für die Schlacht, ein Haus für den Bau, ein Lamm für
 * die Geburt. Das ist mehr Zeichenarbeit als abstrakte Formen, aber man
 * erkennt es ohne Legende.
 */

/**
 * Innenzeichnung eines Markers, zentriert auf (12, 12) im 24×32-Raster.
 *
 * Jede Funktion bekommt die Farbe des Pins übergeben: Details wie die Tür im
 * Haus oder die Zeilen auf der Schriftrolle werden nicht weiß gezeichnet,
 * sondern in der Pinfarbe „ausgestanzt" — sonst verschwänden sie in der
 * weißen Fläche.
 */
const GLYPHS: Record<EventType, (cut: string) => string> = {
  /* Handschlag — zwei Unterarme, die sich in der Mitte greifen. */
  bund: () => `
    <g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5.8 10.7h3.1l3.1 2.3 3.1-2.3h3.1"/>
      <path d="M9.7 13.5 12 15.3l2.3-1.8"/>
    </g>`,

  /* Strahlenkranz — Gott tritt in Erscheinung. */
  theophanie: () => `
    <circle cx="12" cy="12" r="2.7" fill="#fff"/>
    <g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round">
      <path d="M12 5.9v1.7M12 16.4v1.7M5.9 12h1.7M16.4 12h1.7"/>
      <path d="M7.7 7.7l1.2 1.2M15.1 15.1l1.2 1.2M16.3 7.7l-1.2 1.2M8.9 15.1l-1.2 1.2"/>
    </g>`,

  /* Funkeln — das Außergewöhnliche. */
  wunder: () => `
    <g fill="#fff">
      <path d="M11.4 5.6l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9L6 11l3.9-1.5z"/>
      <circle cx="16.6" cy="16.2" r="1.5"/>
    </g>`,

  /* Gekreuzte Schwerter — Klinge über Klinge, Parierstange am Griff. */
  schlacht: () => `
    <g fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round">
      <path d="M7 17 16.4 7.2"/>
      <path d="M17 17 7.6 7.2"/>
      <path d="M6.2 14.2 9 17"/>
      <path d="M17.8 14.2 15 17"/>
    </g>`,

  /* Pfeil — der Weg von hier nach dort. */
  reise: () => `
    <g fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.8 17 17 6.9"/>
      <path d="M11.7 6.9H17V12.2"/>
    </g>`,

  /* Lamm — Körper, Kopf, Ohr, zwei Beine. */
  geburt: () => `
    <g fill="#fff">
      <ellipse cx="10.7" cy="12.5" rx="4" ry="3.3"/>
      <circle cx="15.2" cy="10.6" r="2.2"/>
      <path d="M16.5 8.5c1-.5 1.9-.2 1.7.6-.2.7-1.1.9-1.9.5z"/>
      <rect x="8.3" y="15.1" width="1.5" height="2.7" rx=".7"/>
      <rect x="11.9" y="15.1" width="1.5" height="2.7" rx=".7"/>
    </g>`,

  /* Grabstein. */
  tod: () => `
    <path d="M8.2 17.7v-5.5a3.8 3.8 0 0 1 7.6 0v5.5z" fill="#fff"/>`,

  /* Schriftrolle mit Zeilen. */
  prophetie: (cut) => `
    <rect x="8.4" y="6.8" width="7.2" height="10.4" rx=".8" fill="#fff"/>
    <g fill="none" stroke="${cut}" stroke-width="1.1" stroke-linecap="round">
      <path d="M10.1 9.5h3.8M10.1 12h3.8M10.1 14.5h2.5"/>
    </g>`,

  /* Haus — Dach, Wand, ausgestanzte Tür. */
  bau: (cut) => `
    <g fill="#fff">
      <path d="M12 6.3 18.5 11.7H5.5z"/>
      <rect x="7.7" y="11.7" width="8.6" height="5.9" rx=".5"/>
    </g>
    <rect x="10.6" y="13.7" width="2.8" height="3.9" rx=".4" fill="${cut}"/>`,

  /* Blitz — das Gericht, das einschlägt. */
  gericht: () => `
    <path d="M13.7 5.7 7.9 12.9h3.3l-1 5.4 5.9-7.5h-3.3z" fill="#fff"/>`,

  /* Aufgeschlagenes Buch. */
  lehre: () => `
    <g fill="#fff">
      <path d="M11.4 9.4c-1.3-1-2.8-1.4-4.4-1.3v7.7c1.6-.1 3.1.3 4.4 1.2z"/>
      <path d="M12.6 9.4c1.3-1 2.8-1.4 4.4-1.3v7.7c-1.6-.1-3.1.3-4.4 1.2z"/>
    </g>`,

  /* Krone. */
  politik: () => `
    <path d="M6.3 16.5h11.4l1.1-6.8-4 2.7L12 7.9l-2.8 4.5-4-2.7z" fill="#fff"/>`,

  /* Säule mit Kapitell und Sockel — etwas wird gegründet. */
  gruendung: () => `
    <g fill="#fff">
      <rect x="7.3" y="6.7" width="9.4" height="2" rx=".5"/>
      <rect x="9.4" y="9.1" width="5.2" height="5.9"/>
      <rect x="7.3" y="15.4" width="9.4" height="2.1" rx=".5"/>
    </g>`,
};

const PIN_PATH = 'M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0z';

/** Außerbiblische Ereignisse haben keinen Abschnitt und bleiben neutral grau. */
function fillFor(section: Section | undefined): string {
  return section ? `var(--bl-${section})` : 'var(--bl-ausserbiblisch)';
}

/**
 * Unsichere Datierungen werden schwächer und mit gestricheltem Rand
 * gezeichnet. Die App soll keine Präzision behaupten, die die Quellenlage
 * nicht hergibt — auch nicht optisch.
 */
function certaintyStyle(certainty: Certainty): { opacity: number; dash: string } {
  switch (certainty) {
    case 'hoch':
      return { opacity: 1, dash: '' };
    case 'mittel':
      return { opacity: 0.94, dash: '' };
    case 'niedrig':
      return { opacity: 0.82, dash: ' stroke-dasharray="3 2"' };
    case 'symbolisch':
      return { opacity: 0.62, dash: ' stroke-dasharray="2 3"' };
  }
}

function pinSvg(
  section: Section | undefined,
  eventType: EventType,
  certainty: Certainty,
): string {
  const { opacity, dash } = certaintyStyle(certainty);
  const color = fillFor(section);
  return [
    '<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
    `<path d="${PIN_PATH}" fill="${color}" fill-opacity="${opacity}"`,
    ` stroke="var(--bl-surface)" stroke-width="1.5"${dash}/>`,
    GLYPHS[eventType](color),
    '</svg>',
  ].join('');
}

export interface MarkerState {
  selected?: boolean;
  hovered?: boolean;
}

/** Icon für ein Ereignis auf der Hauptkarte. */
export function eventIcon(event: BibleEvent, state: MarkerState = {}): L.DivIcon {
  return L.divIcon({
    className: 'bl-marker',
    html: `<span data-selected="${state.selected ? 'true' : 'false'}" data-hovered="${
      state.hovered ? 'true' : 'false'
    }">${pinSvg(event.section, event.eventType, event.certainty)}</span>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  });
}

/**
 * Icon für einen Ort, an dem mehrere Ereignisse stattfanden. Das Zeichen
 * stammt vom ersten Ereignis, die Zahl macht sichtbar, dass mehr
 * dahintersteckt.
 */
export function placeIcon(
  section: Section | undefined,
  count: number,
  certainty: Certainty = 'hoch',
  state: MarkerState = {},
  eventType: EventType = 'politik',
): L.DivIcon {
  const badge = count > 1 ? `<span class="bl-marker-count">${count > 99 ? '99+' : count}</span>` : '';
  return L.divIcon({
    className: 'bl-marker',
    html: `<span data-selected="${state.selected ? 'true' : 'false'}" data-hovered="${
      state.hovered ? 'true' : 'false'
    }">${pinSvg(section, eventType, certainty)}${badge}</span>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  });
}

/** Text, der in Icon-Markup eingesetzt wird, unschädlich machen. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Der Ortsname unter dem Pin.
 *
 * Die Kacheln beschriften nach heutigem Ortsnamen und in einer Schriftgröße,
 * die für eine Übersichtskarte gedacht ist — auf einer Bibelkarte sucht man
 * dagegen „Kapernaum", nicht „Kfar Nahum", und will es auch lesen können.
 * Deshalb setzt die App die biblischen Namen selbst, in eigener Größe und
 * mit hellem Rand gegen den unruhigen Kartengrund.
 *
 * `iconSize: [0, 0]` ist Absicht: Die Beschriftung soll den Pin nicht
 * überdecken und nichts anklickbar machen. Ihre Ausdehnung bekommt sie erst
 * aus dem Text, ausgerichtet wird sie in CSS.
 */
export function placeLabelIcon(name: string, state: MarkerState = {}): L.DivIcon {
  return L.divIcon({
    className: 'bl-place-label',
    html: `<span data-selected="${state.selected ? 'true' : 'false'}">${escapeHtml(name)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Name eines historischen Gebiets, in dessen Farbe. */
export function territoryLabelIcon(name: string, color: string, vague: boolean): L.DivIcon {
  return L.divIcon({
    className: 'bl-terr-label',
    html: `<span style="--terr-color: ${color}" data-vague="${vague ? 'true' : 'false'}">${escapeHtml(
      name,
    )}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Nummerierter Punkt für eine Reise-Etappe. */
export function journeyLegIcon(order: number, section: Section): L.DivIcon {
  return L.divIcon({
    className: 'bl-leg',
    html: `<span style="--leg-color: var(--bl-${section})">${order}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

/**
 * Cluster-Icon. Größe folgt der Anzahl, Farbe dem häufigsten Abschnitt in
 * der Gruppe — so bleibt beim Herauszoomen erkennbar, aus welchem Teil der
 * Bibel die Ereignisse einer Region stammen.
 */
export function clusterIcon(count: number, dominantSection: Section | undefined): L.DivIcon {
  const size = count < 10 ? 34 : count < 50 ? 42 : count < 200 ? 50 : 58;
  return L.divIcon({
    className: 'bl-cluster',
    html: `<div style="background-color: ${fillFor(dominantSection)}">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Der in einer Menge von Ereignissen am häufigsten vertretene Abschnitt.
 * `undefined`, wenn keines der Ereignisse zu einem Bibelabschnitt gehört.
 */
export function dominantSection(events: readonly BibleEvent[]): Section | undefined {
  const tally = new Map<Section, number>();
  for (const event of events) {
    if (!event.section) continue;
    tally.set(event.section, (tally.get(event.section) ?? 0) + 1);
  }
  let best: Section | undefined;
  let bestCount = 0;
  for (const [section, count] of tally) {
    if (count > bestCount) {
      best = section;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Der vollständige Pin als Markup — für die Auswahlliste, die aufgeht, wenn
 * an einem Ort mehrere Ereignisse stattfanden.
 *
 * Dort dasselbe Bild zu zeigen wie auf der Karte ist der Punkt: Man erkennt
 * sofort, dass die Zeile und der Marker dasselbe meinen.
 */
export function eventPinMarkup(event: BibleEvent): string {
  return pinSvg(event.section, event.eventType, event.certainty);
}

/**
 * Nur die Innenzeichnung, für die Legende.
 *
 * Das Ergebnis ist ein Modulkonstante-Aufruf ohne Fremdeingabe — es fließen
 * keine Nutzerdaten hinein. Deshalb darf es in der Legende per
 * `dangerouslySetInnerHTML` eingesetzt werden.
 */
export function glyphMarkup(eventType: EventType, cutColor = 'var(--bl-surface)'): string {
  return GLYPHS[eventType](cutColor);
}
