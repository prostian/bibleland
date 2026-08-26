import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import type { RelationType } from '@/types';
import {
  eventsOfPerson,
  formatRef,
  getPerson,
  journeysOfPerson,
  placeById,
} from '@/lib/dataset';
import { RELATION_LABEL } from '@/lib/labels';
import { formatYear, formatYearRange } from '@/lib/year';
import { bibleserverUrl } from '@/lib/verses';
import PageContainer, { PageSection } from '@/components/layout/PageContainer';
import EventList from '@/components/detail/EventList';
import EntityChip from '@/components/detail/EntityChip';
import Badge from '@/components/ui/Badge';
import NotFoundPage from '@/pages/NotFoundPage';

/** Reihenfolge, in der Beziehungen gruppiert erscheinen — Familie zuerst. */
const RELATION_ORDER: RelationType[] = [
  'vater',
  'mutter',
  'ehepartner',
  'geschwister',
  'kind',
  'vorgaenger',
  'nachfolger',
  'mentor',
  'schueler',
  'mitarbeiter',
  'gegner',
];

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const person = getPerson(id);

  const events = useMemo(() => (person ? eventsOfPerson(person.id) : []), [person]);
  const journeys = useMemo(() => (person ? journeysOfPerson(person.id) : []), [person]);

  /** Orte, an denen diese Person nachweislich war — ihre persönliche Geografie. */
  const places = useMemo(() => {
    const ids = new Set(events.map((e) => e.placeId).filter((v): v is string => v !== null));
    return [...ids].map((placeId) => placeById.get(placeId)).filter((p) => p !== undefined);
  }, [events]);

  const grouped = useMemo(() => {
    if (!person) return [];
    return RELATION_ORDER.map((type) => ({
      type,
      relations: person.relations.filter((r) => r.type === type),
    })).filter((group) => group.relations.length > 0);
  }, [person]);

  if (!person) return <NotFoundPage what="Person" id={id} />;

  const lifespan =
    person.birthYear !== undefined && person.deathYear !== undefined
      ? formatYearRange(person.birthYear, person.deathYear)
      : person.birthYear !== undefined
        ? `geboren ${formatYear(person.birthYear)}`
        : person.deathYear !== undefined
          ? `gestorben ${formatYear(person.deathYear)}`
          : null;

  return (
    <PageContainer
      eyebrow={
        <>
          <Badge color="var(--bl-node-person)">Person</Badge>
          <Badge variant="soft">{person.role}</Badge>
          {person.tribe ? <Badge variant="soft">Stamm {person.tribe}</Badge> : null}
        </>
      }
      title={person.name}
      subtitle={
        <>
          {person.aliases.length > 0 ? <span>auch {person.aliases.join(', ')} · </span> : null}
          {lifespan ? <span className="tabular-nums">{lifespan}</span> : null}
          {person.reignStart !== undefined && person.reignEnd !== undefined ? (
            <span className="tabular-nums">
              {lifespan ? ' · ' : ''}
              Regierung {formatYearRange(person.reignStart, person.reignEnd)}
            </span>
          ) : null}
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-muted">{person.description}</p>

      {(person.greekName || person.hebrewName) && (
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
          {person.hebrewName ? (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-subtle">Hebräisch</p>
              <p className="text-hebrew text-ink">{person.hebrewName}</p>
            </div>
          ) : null}
          {person.greekName ? (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-subtle">Griechisch</p>
              <p className="text-greek text-ink">{person.greekName}</p>
            </div>
          ) : null}
        </div>
      )}

      {person.primaryRef ? (
        <p className="mt-4 text-sm">
          <span className="text-ink-subtle">Wichtigste Stelle: </span>
          <a
            href={bibleserverUrl(person.primaryRef)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent hover:underline"
          >
            {formatRef(person.primaryRef)}
          </a>
        </p>
      ) : null}

      {grouped.length > 0 ? (
        <PageSection title="Beziehungen">
          <dl className="flex flex-col gap-2">
            {grouped.map(({ type, relations }) => (
              <div key={type} className="flex flex-wrap items-baseline gap-2">
                <dt className="w-24 shrink-0 text-xs text-ink-subtle">{RELATION_LABEL[type]}</dt>
                <dd className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {relations.map((relation) => {
                    const other = getPerson(relation.personId);
                    if (!other) return null;
                    return (
                      <EntityChip
                        key={relation.personId}
                        type="person"
                        id={other.id}
                        label={other.name}
                        {...(relation.note ? { sublabel: `· ${relation.note}` } : {})}
                      />
                    );
                  })}
                </dd>
              </div>
            ))}
          </dl>
        </PageSection>
      ) : null}

      <PageSection title="Ereignisse" count={events.length}>
        <EventList
          events={events}
          emptyText="Zu dieser Person ist im Datensatz noch kein Ereignis erfasst."
        />
      </PageSection>

      {places.length > 0 ? (
        <PageSection title="Orte" count={places.length}>
          <ul className="flex flex-wrap gap-1.5">
            {places.map((place) => (
              <li key={place.id}>
                <EntityChip type="ort" id={place.id} label={place.name} />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {journeys.length > 0 ? (
        <PageSection title="Reisen" count={journeys.length}>
          <ul className="flex flex-wrap gap-1.5">
            {journeys.map((journey) => (
              <li key={journey.id}>
                <EntityChip
                  type="reise"
                  id={journey.id}
                  label={journey.title}
                  sublabel={`· ${formatYearRange(journey.yearStart, journey.yearEnd)}`}
                />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
    </PageContainer>
  );
}
