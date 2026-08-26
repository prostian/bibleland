import type { BibleEvent, Place } from '@/types';
import { eventRefLabel } from '@/lib/dataset';
import { EVENT_TYPE_LABEL } from '@/lib/labels';
import { eventPinMarkup } from '@/lib/markerIcons';
import { formatEventDate } from '@/lib/year';

/**
 * Die Auswahlliste, die aufgeht, wenn an einem Ort mehrere Ereignisse
 * stattfanden.
 *
 * In Jerusalem spielen Dutzende Ereignisse. Ein Klick auf den Marker wählte
 * früher stillschweigend das chronologisch erste aus — an die übrigen kam
 * man über die Karte gar nicht heran. Jetzt öffnet sich unter dem Pin eine
 * chronologische Liste mit demselben Zeichen, das auch auf der Karte steht,
 * dazu Jahr, Art und Bibelstelle.
 *
 * Bewusst als HTML-Zeichenkette und nicht als React-Baum: Die Marker werden
 * in `ClusterLayer` imperativ erzeugt, weil `leaflet.markercluster` seine
 * Ebene selbst verwaltet. Für jedes Popup eine React-Wurzel aufzuspannen wäre
 * deutlich mehr Maschinerie als dieser Aufbau samt Klick-Delegation.
 */

/** Fremdzeichen unschädlich machen. Die Daten sind zwar unsere eigenen — aber
 *  Text, der als HTML zusammengesetzt wird, wird grundsätzlich maskiert. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface PlacePopupData {
  place: Place;
  events: readonly BibleEvent[];
}

export function placePopupHtml(
  { place, events }: PlacePopupData,
  selectedEventId: string | null,
): string {
  const rows = events
    .map((event) => {
      const active = event.id === selectedEventId;
      return [
        `<button type="button" class="bl-pop-row${active ? ' is-active' : ''}" data-event-id="${escapeHtml(event.id)}">`,
        `<span class="bl-pop-pin">${eventPinMarkup(event)}</span>`,
        '<span class="bl-pop-text">',
        `<span class="bl-pop-title">${escapeHtml(event.title)}</span>`,
        `<span class="bl-pop-meta">${escapeHtml(formatEventDate(event))} · ${escapeHtml(
          EVENT_TYPE_LABEL[event.eventType],
        )} · ${escapeHtml(eventRefLabel(event, { abbreviated: true }))}</span>`,
        '</span>',
        '</button>',
      ].join('');
    })
    .join('');

  return [
    '<div class="bl-pop">',
    '<div class="bl-pop-head">',
    `<span class="bl-pop-place">${escapeHtml(place.name)}</span>`,
    `<span class="bl-pop-count">${events.length} ${events.length === 1 ? 'Ereignis' : 'Ereignisse'}</span>`,
    '</div>',
    `<div class="bl-pop-list">${rows}</div>`,
    '</div>',
  ].join('');
}

/**
 * Findet in einem Popup die angeklickte Ereigniszeile.
 *
 * Ein einziger Listener am Popup statt einer pro Zeile — die Zeilen werden
 * bei jeder Auswahl neu erzeugt, einzeln gebundene Listener müsste man
 * jedes Mal wieder abräumen.
 */
export function eventIdFromClick(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const row = target.closest('[data-event-id]');
  return row?.getAttribute('data-event-id') ?? null;
}
