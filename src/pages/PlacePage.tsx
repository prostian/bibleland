import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, Marker } from 'react-leaflet';

import { eventsAtPlace, getPlace, journeysAtPlace, personById } from '@/lib/dataset';
import { PLACE_TYPE_LABEL } from '@/lib/labels';
import { certaintyLabel, formatYearRange } from '@/lib/year';
import { placeIcon, dominantSection } from '@/lib/markerIcons';
import BaseTileLayer from '@/components/map/BaseTileLayer';
import PageContainer, { PageSection } from '@/components/layout/PageContainer';
import EventList from '@/components/detail/EventList';
import EntityChip from '@/components/detail/EntityChip';
import Badge from '@/components/ui/Badge';
import NotFoundPage from '@/pages/NotFoundPage';

export default function PlacePage() {
  const { id } = useParams<{ id: string }>();
  const place = getPlace(id);

  const events = useMemo(() => (place ? eventsAtPlace(place.id) : []), [place]);
  const journeys = useMemo(() => (place ? journeysAtPlace(place.id) : []), [place]);

  /** Wer war hier? Aus den Ereignissen abgeleitet, nicht separat gepflegt. */
  const persons = useMemo(() => {
    const ids = new Set(events.flatMap((e) => e.personIds));
    return [...ids].map((personId) => personById.get(personId)).filter((p) => p !== undefined);
  }, [events]);

  if (!place) return <NotFoundPage what="Ort" id={id} />;

  const uncertain =
    place.locationCertainty === 'niedrig' || place.locationCertainty === 'symbolisch';

  return (
    <PageContainer
      eyebrow={
        <>
          <Badge color="var(--bl-node-ort)">Ort</Badge>
          <Badge variant="soft">{PLACE_TYPE_LABEL[place.type]}</Badge>
          <Badge variant="soft">{place.region}</Badge>
        </>
      }
      title={place.name}
      subtitle={
        <>
          {place.aliases.length > 0 ? <span>auch {place.aliases.join(', ')} · </span> : null}
          {place.modernName ? <span>heute {place.modernName} · </span> : null}
          <span className="tabular-nums">
            {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
          </span>
        </>
      }
      aside={
        <div className="h-56 overflow-hidden rounded-xl border border-line">
          <MapContainer
            center={[place.lat, place.lng]}
            zoom={9}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <BaseTileLayer />
            <Marker
              position={[place.lat, place.lng]}
              icon={placeIcon(
                dominantSection(events),
                events.length,
                place.locationCertainty ?? 'hoch',
                {},
                events[0]?.eventType ?? 'politik',
              )}
            />
          </MapContainer>
        </div>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-muted">{place.description}</p>

      {uncertain ? (
        <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink-subtle">
          <strong className="font-medium text-ink-muted">Lokalisierung unsicher.</strong>{' '}
          {certaintyLabel(place.locationCertainty ?? 'niedrig')} Die Koordinate markiert die
          gängigste Zuordnung, nicht einen gesicherten Befund.
        </p>
      ) : null}

      {place.greekName ? (
        <div className="mt-4 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-subtle">Griechisch</p>
          <p className="text-greek text-ink">{place.greekName}</p>
        </div>
      ) : null}

      <PageSection title="Ereignisse" count={events.length}>
        <EventList events={events} emptyText="An diesem Ort ist noch kein Ereignis erfasst." />
      </PageSection>

      {persons.length > 0 ? (
        <PageSection title="Personen" count={persons.length}>
          <ul className="flex flex-wrap gap-1.5">
            {persons.map((person) => (
              <li key={person.id}>
                <EntityChip type="person" id={person.id} label={person.name} />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {journeys.length > 0 ? (
        <PageSection title="Reisen über diesen Ort" count={journeys.length}>
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
