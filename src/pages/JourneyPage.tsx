import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';

import { getEvent, getJourney, getPerson, placeById } from '@/lib/dataset';
import { sectionColorVar } from '@/lib/labels';
import { certaintyLabel, formatEventDate, formatYearRange } from '@/lib/year';
import { useAtlasStore } from '@/store/useAtlasStore';
import BaseTileLayer from '@/components/map/BaseTileLayer';
import JourneyRoutes from '@/components/map/JourneyRoutes';
import PageContainer, { PageSection } from '@/components/layout/PageContainer';
import EntityChip from '@/components/detail/EntityChip';
import Badge from '@/components/ui/Badge';
import NotFoundPage from '@/pages/NotFoundPage';

export default function JourneyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveJourney = useAtlasStore((s) => s.setActiveJourney);
  const journey = getJourney(id);

  const legs = useMemo(
    () =>
      journey
        ? [...journey.legs]
            .sort((a, b) => a.order - b.order)
            .map((leg) => ({ leg, place: placeById.get(leg.placeId), event: getEvent(leg.eventId) }))
            .filter((entry) => entry.place !== undefined)
        : [],
    [journey],
  );

  const bounds = useMemo(() => {
    if (legs.length < 2) return null;
    return L.latLngBounds(legs.map(({ place }) => [place!.lat, place!.lng] as L.LatLngTuple));
  }, [legs]);

  // Beim Verlassen der Seite die Route wieder abwählen, damit der Atlas
  // nicht mit einer Linie zurückbleibt, die dort niemand angefordert hat.
  useEffect(() => () => setActiveJourney(null), [setActiveJourney]);

  if (!journey) return <NotFoundPage what="Reise" id={id} />;

  const persons = journey.personIds.map((pid) => getPerson(pid)).filter((p) => p !== undefined);
  const uncertain = journey.routeCertainty === 'niedrig' || journey.routeCertainty === 'symbolisch';

  return (
    <PageContainer
      eyebrow={
        <>
          <Badge color="var(--bl-node-reise)">Reise</Badge>
          <Badge color={sectionColorVar(journey.colorToken)}>
            {formatYearRange(journey.yearStart, journey.yearEnd)}
          </Badge>
          <Badge variant="soft">{journey.legs.length} Etappen</Badge>
        </>
      }
      title={journey.title}
      aside={
        bounds ? (
          <div className="h-72 overflow-hidden rounded-xl border border-line">
            <MapContainer bounds={bounds} boundsOptions={{ padding: [32, 32] }} className="h-full w-full">
              <BaseTileLayer />
              <JourneyRoutes
                journey={journey}
                onSelectEvent={(eventId) => navigate(`/ereignis/${eventId}`)}
              />
            </MapContainer>
          </div>
        ) : null
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-muted">{journey.description}</p>

      {uncertain ? (
        <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-subtle">
          <strong className="font-medium text-ink-muted">Route rekonstruiert.</strong>{' '}
          {certaintyLabel(journey.routeCertainty ?? 'niedrig')} Deshalb ist die Linie auf der Karte
          gestrichelt gezeichnet.
        </p>
      ) : null}

      <p className="mt-4">
        <button
          type="button"
          onClick={() => {
            setActiveJourney(journey.id);
            navigate('/');
          }}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm text-accent-contrast transition-opacity hover:opacity-90"
        >
          Route im Atlas öffnen
        </button>
      </p>

      {persons.length > 0 ? (
        <PageSection title="Beteiligte" count={persons.length}>
          <ul className="flex flex-wrap gap-1.5">
            {persons.map((person) => (
              <li key={person.id}>
                <EntityChip type="person" id={person.id} label={person.name} />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection title="Etappen" count={legs.length}>
        <ol className="flex flex-col">
          {legs.map(({ leg, place, event }) => (
            <li key={leg.order} className="flex gap-3 py-2">
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: sectionColorVar(journey.colorToken) }}
                aria-hidden="true"
              >
                {leg.order}
              </span>
              <div className="min-w-0 flex-1 border-b border-line pb-2">
                <EntityChip type="ort" id={place!.id} label={place!.name} />
                {leg.note ? (
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{leg.note}</p>
                ) : null}
                {event ? (
                  <Link
                    to={`/ereignis/${event.id}`}
                    className="mt-1 inline-block text-xs text-accent hover:underline"
                  >
                    {event.title} · {formatEventDate(event)}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </PageSection>
    </PageContainer>
  );
}
