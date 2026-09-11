import { Link } from 'react-router-dom';

import type { Journey, JourneyLeg } from '@/types';
import { placeById } from '@/lib/dataset';
import { PLACE_TYPE_LABEL } from '@/lib/labels';
import Badge from '@/components/ui/Badge';

/**
 * Der Detailbereich während einer Tour, wenn die Etappe kein Ereignis trägt.
 *
 * Ohne ihn bliebe dort das Ereignis der *vorigen* Etappe stehen — man führe
 * über die Karte weiter und läse daneben etwas, das anderswo geschah. Die
 * Alternative, den Bereich einfach zu leeren, wäre kaum besser: Auch eine
 * Etappe ohne erfasstes Ereignis hat einen Ort und meist eine Notiz.
 */
export default function TourLegDetail({ journey, leg }: { journey: Journey; leg: JourneyLeg }) {
  const place = placeById.get(leg.placeId);

  return (
    <article className="flex flex-col gap-3 p-4">
      <header>
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge color="var(--bl-node-reise)">Etappe {leg.order}</Badge>
          {place ? <Badge variant="soft">{PLACE_TYPE_LABEL[place.type]}</Badge> : null}
        </div>
        <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink">
          {place?.name ?? 'Unbekannter Ort'}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{journey.title}</p>
      </header>

      {leg.note ? (
        <p className="text-sm leading-relaxed text-ink-muted">{leg.note}</p>
      ) : (
        <p className="text-sm leading-relaxed text-ink-subtle">
          Zu dieser Etappe ist kein Ereignis erfasst — die Route berührt den Ort, ohne dass die
          Quelle dort etwas erzählt.
        </p>
      )}

      {place ? (
        <>
          {place.description ? (
            <p className="text-sm leading-relaxed text-ink-muted">{place.description}</p>
          ) : null}
          <p className="text-sm">
            <Link to={`/ort/${place.id}`} className="text-accent hover:underline">
              Alles zu {place.name}
            </Link>
          </p>
        </>
      ) : null}
    </article>
  );
}
