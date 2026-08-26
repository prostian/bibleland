import { Link } from 'react-router-dom';

import type { BibleEvent } from '@/types';
import {
  eventsAtPlace,
  formatRef,
  getBook,
  getJourney,
  getPeriod,
  getPlace,
  personsOf,
} from '@/lib/dataset';
import {
  AUSSERBIBLISCH_COLOR,
  EVENT_TYPE_LABEL,
  SECTION_LABEL,
  eventColorVar,
  sectionColorVar,
} from '@/lib/labels';
import { certaintyLabel, formatEventDate, formatYearRange } from '@/lib/year';
import { verseKeyForEvent } from '@/lib/verses';
import { useAtlasStore } from '@/store/useAtlasStore';
import Badge from '@/components/ui/Badge';
import EntityChip from '@/components/detail/EntityChip';
import VerseBox from '@/components/detail/VerseBox';

interface EventDetailProps {
  event: BibleEvent;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-3">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Die Detailansicht eines Ereignisses — der Knotenpunkt, an dem Zeit, Ort,
 * Text und Personen zusammenkommen.
 *
 * Jede genannte Entität ist verlinkt. Von „Abraham zieht nach Kanaan" führt
 * ein Klick zu Abraham, von dort zu Isaak, von dort nach Beerscheba: Aus
 * einer Liste von Datensätzen wird ein begehbares Netz.
 */
export default function EventDetail({ event }: EventDetailProps) {
  const place = getPlace(event.placeId);
  const book = getBook(event.ref?.bookId);
  const period = getPeriod(event.periodId);
  const journey = getJourney(event.journeyId);
  const persons = personsOf(event);
  const setActiveJourney = useAtlasStore((s) => s.setActiveJourney);
  const activeJourneyId = useAtlasStore((s) => s.activeJourneyId);

  // Andere Ereignisse am selben Ort — der häufigste nächste Klick.
  const siblings = place ? eventsAtPlace(place.id).filter((e) => e.id !== event.id) : [];

  return (
    <article className="flex flex-col gap-3 p-4">
      <header>
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {event.section ? (
            <Badge color={sectionColorVar(event.section)}>{SECTION_LABEL[event.section]}</Badge>
          ) : (
            <Badge
              color={AUSSERBIBLISCH_COLOR}
              title="Dieses Ereignis wird in der Bibel nicht erzählt"
            >
              Außerbiblisch
            </Badge>
          )}
          <Badge variant="soft">{EVENT_TYPE_LABEL[event.eventType]}</Badge>
        </div>

        <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink">
          {event.title}
        </h2>

        <p className="mt-1 text-sm tabular-nums text-ink-muted" title={certaintyLabel(event.certainty)}>
          {formatEventDate(event)}
          {period ? (
            <>
              {' · '}
              <span className="text-ink-subtle">{period.name}</span>
            </>
          ) : null}
        </p>

        {event.certainty === 'niedrig' || event.certainty === 'symbolisch' ? (
          <p className="mt-1.5 rounded-lg bg-surface-2 px-2 py-1 text-[11px] leading-snug text-ink-subtle">
            {certaintyLabel(event.certainty)}
          </p>
        ) : null}
      </header>

      <p className="text-sm leading-relaxed text-ink-muted">{event.description}</p>

      {/*
        Nur biblische Ereignisse bekommen eine Stelle. Für die Septuaginta
        oder die Zerstörung des Tempels im Jahr 70 irgendeinen Vers
        anzuzeigen wäre irreführend — an ihre Stelle tritt eine Erklärung,
        warum hier nichts steht.
      */}
      {event.ref ? (
        <VerseBox refs={event.ref} verseKey={verseKeyForEvent(event)} />
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface-2/40 px-3 py-2.5">
          <p className="text-[12px] leading-relaxed text-ink-subtle">
            <strong className="font-medium text-ink-muted">Keine Bibelstelle.</strong> Dieses
            Ereignis wird in der Bibel nicht erzählt. Es steht hier, weil es den historischen
            Zusammenhang erklärt, in dem die biblischen Ereignisse ringsum stehen.
          </p>
        </div>
      )}

      {event.parallelRefs?.length ? (
        <Section title="Parallelstellen">
          <ul className="flex flex-wrap gap-1.5">
            {event.parallelRefs.map((ref, i) => (
              <li key={`${ref.bookId}-${ref.chapter}-${i}`}>
                <Badge variant="soft">{formatRef(ref)}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {place ? (
        <Section title="Ort">
          <EntityChip
            type="ort"
            id={place.id}
            label={place.name}
            {...(place.modernName ? { sublabel: `· ${place.modernName}` } : {})}
          />
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-subtle">{place.description}</p>
        </Section>
      ) : null}

      {persons.length ? (
        <Section title={persons.length === 1 ? 'Person' : 'Personen'}>
          <ul className="flex flex-wrap gap-1.5">
            {persons.map((person) => (
              <li key={person.id}>
                <EntityChip type="person" id={person.id} label={person.name} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {book ? (
        <Section title="Buch">
          <EntityChip
            type="buch"
            id={book.id}
            label={book.name}
            {...(book.altName ? { sublabel: `· ${book.altName}` } : {})}
          />
        </Section>
      ) : null}

      {journey ? (
        <Section title="Reise">
          <div className="flex flex-wrap items-center gap-1.5">
            <EntityChip
              type="reise"
              id={journey.id}
              label={journey.title}
              sublabel={`· ${formatYearRange(journey.yearStart, journey.yearEnd)}`}
            />
            <button
              type="button"
              onClick={() => setActiveJourney(activeJourneyId === journey.id ? null : journey.id)}
              className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {activeJourneyId === journey.id ? 'Route ausblenden' : 'Route auf Karte'}
            </button>
          </div>
        </Section>
      ) : null}

      {event.tags.length ? (
        <Section title="Schlagwörter">
          <ul className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="plain">#{tag}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {siblings.length ? (
        <Section title={`Weiteres an diesem Ort (${siblings.length})`}>
          <ul className="flex flex-col gap-0.5">
            {siblings.slice(0, 8).map((sibling) => (
              <li key={sibling.id}>
                <Link
                  to={`/ereignis/${sibling.id}`}
                  className="flex items-baseline gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-surface-2"
                >
                  <span
                    className="size-1.5 shrink-0 -translate-y-px rounded-full"
                    style={{ backgroundColor: eventColorVar(sibling) }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-ink">{sibling.title}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-ink-subtle">
                    {formatEventDate(sibling)}
                  </span>
                </Link>
              </li>
            ))}
            {siblings.length > 8 && place ? (
              <li>
                <Link
                  to={`/ort/${place.id}`}
                  className="block px-1.5 py-1 text-xs text-accent hover:underline"
                >
                  Alle {siblings.length + 1} Ereignisse in {place.name} ansehen
                </Link>
              </li>
            ) : null}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
