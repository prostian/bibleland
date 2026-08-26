import { memo } from 'react';

import {
  HIT_PADDING,
  LANE_HEIGHT,
  MARKER_SIZE,
  type PackedEvent,
} from '@/lib/timelineScale';
import { eventColorVar } from '@/lib/labels';
import { formatEventDate } from '@/lib/year';
import { eventRefLabel } from '@/lib/dataset';
import { cn } from '@/lib/cn';

interface TimelineEventProps {
  item: PackedEvent;
  selected: boolean;
  hovered: boolean;
  onSelect: (eventId: string) => void;
  onHover: (eventId: string | null) => void;
}

/**
 * Ein Ereignis auf dem Zeitstrahl.
 *
 * Als echter Button, nicht als gezeichnete Form: So ist jedes Ereignis mit
 * der Tastatur erreichbar, bekommt einen Fokusring und wird vom Screenreader
 * vorgelesen. Ein Canvas wäre schneller zu zeichnen, aber unbedienbar für
 * alle, die nicht mit der Maus arbeiten.
 *
 * Der Knopf ist bewusst größer als der Punkt und **ändert seine Größe nie**.
 * Vergrößert wird nur der Punkt darin — würde der Knopf selbst wachsen,
 * verschöbe sich beim Überfahren die Fläche unter dem Zeiger, und man klickt
 * ins Leere.
 */
function TimelineEvent({ item, selected, hovered, onSelect, onHover }: TimelineEventProps) {
  const { event, x, width, lane } = item;
  const isSpan = width > MARKER_SIZE * 1.5;
  const color = eventColorVar(event);
  const uncertain = event.certainty === 'niedrig' || event.certainty === 'symbolisch';
  const dotWidth = isSpan ? width : MARKER_SIZE;

  return (
    <button
      type="button"
      data-event-id={event.id}
      onClick={() => onSelect(event.id)}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(event.id)}
      onBlur={() => onHover(null)}
      aria-pressed={selected}
      title={`${event.title} — ${formatEventDate(event)} · ${eventRefLabel(event, { abbreviated: true })}`}
      className={cn(
        'absolute grid place-items-center',
        'hover:z-20 focus-visible:z-30',
        selected && 'z-30',
      )}
      style={{
        // Die Trefferfläche ragt um HIT_PADDING über den Punkt hinaus, also
        // wird sie entsprechend nach oben links versetzt — der Punkt landet
        // dadurch exakt auf der Jahresposition.
        transform: `translate(${x - HIT_PADDING}px, ${lane * LANE_HEIGHT}px)`,
        width: `${dotWidth + HIT_PADDING * 2}px`,
        height: `${LANE_HEIGHT}px`,
      }}
    >
      <span
        className="pointer-events-none block rounded-full transition-[box-shadow,transform] duration-150"
        style={{
          width: `${dotWidth}px`,
          height: `${MARKER_SIZE}px`,
          backgroundColor: color,
          opacity: uncertain ? 0.62 : 1,
          // Der Ring sitzt außen und ist bei Auswahl deutlich stärker — auf
          // engem Raum ist eine Umrandung ablesbarer als eine Farbänderung.
          boxShadow: selected
            ? `0 0 0 2px var(--bl-surface), 0 0 0 4px ${color}`
            : hovered
              ? `0 0 0 2px var(--bl-surface), 0 0 0 3px ${color}`
              : `0 0 0 1.5px var(--bl-surface)`,
          transform: selected ? 'scale(1.25)' : hovered ? 'scale(1.15)' : 'scale(1)',
        }}
        aria-hidden="true"
      />
      <span className="sr-only">
        {event.title}, {formatEventDate(event)}, {eventRefLabel(event)}
      </span>
    </button>
  );
}

export default memo(TimelineEvent);
