import { Link } from 'react-router-dom';

import type { BibleEvent } from '@/types';
import { eventRefLabel } from '@/lib/dataset';
import { eventColorVar } from '@/lib/labels';
import { formatEventDate } from '@/lib/year';
import { useAtlasStore } from '@/store/useAtlasStore';

interface EventListProps {
  events: readonly BibleEvent[];
  emptyText?: string;
}

/**
 * Chronologische Ereignisliste — der wiederkehrende Baustein auf allen
 * Entitätsseiten. Personen, Orte, Bücher und Reisen zeigen alle dasselbe:
 * „Was ist hier, mit dieser Person, in diesem Buch geschehen?"
 */
export default function EventList({ events, emptyText = 'Keine Ereignisse.' }: EventListProps) {
  const hoverEntity = useAtlasStore((s) => s.hoverEntity);

  if (events.length === 0) {
    return <p className="px-1 py-2 text-sm text-ink-subtle">{emptyText}</p>;
  }

  return (
    <ol className="flex flex-col">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            to={`/ereignis/${event.id}`}
            onMouseEnter={() => hoverEntity(event.id)}
            onMouseLeave={() => hoverEntity(null)}
            className="group flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
          >
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full"
              style={{ backgroundColor: eventColorVar(event) }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink group-hover:text-accent">
                {event.title}
              </span>
              <span className="mt-0.5 block text-xs text-ink-subtle">
                {formatEventDate(event)} · {eventRefLabel(event)}
              </span>
              <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-ink-muted">
                {event.description}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
