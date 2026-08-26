import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getEvent } from '@/lib/dataset';
import { centerOn } from '@/lib/timelineScale';
import { useAtlasStore } from '@/store/useAtlasStore';
import EventDetail from '@/components/detail/EventDetail';

/**
 * Der Detailbereich rechts, gefüttert aus der URL.
 *
 * Die URL ist hier die führende Größe, nicht der Store: Wer `/ereignis/
 * abraham-kanaan` aufruft oder den Zurück-Knopf drückt, bekommt denselben
 * Zustand wie nach einem Klick auf der Karte. Der Store wird daraus
 * abgeleitet, damit Karte und Zeitstrahl nachziehen.
 */
export default function EventPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const selectEvent = useAtlasStore((s) => s.selectEvent);
  const setViewRange = useAtlasStore((s) => s.setViewRange);

  const event = getEvent(id);

  useEffect(() => {
    if (!event) return;
    selectEvent(event.id);

    // Liegt das Ereignis außerhalb des sichtbaren Zeitfensters, wandert der
    // Zeitstrahl dorthin — sonst zeigt das Panel etwas, das im Strahl
    // darunter gar nicht zu sehen ist.
    const { viewRange } = useAtlasStore.getState();
    if (event.year < viewRange.from || event.year > viewRange.to) {
      setViewRange(centerOn(viewRange, event.year));
    }
  }, [event, selectEvent, setViewRange]);

  useEffect(() => () => selectEvent(null), [selectEvent]);

  if (!event) {
    return (
      <div className="flex h-full flex-col items-start gap-3 p-6">
        <h2 className="text-base font-semibold">Ereignis nicht gefunden</h2>
        <p className="text-sm text-ink-muted">
          Zu der Kennung <code className="text-ink">{id}</code> gibt es keinen Eintrag. Vielleicht
          hat sich die Adresse geändert.
        </p>
        <Link to="/" className="text-sm text-accent hover:underline">
          Zurück zum Atlas
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Detailansicht schließen"
        title="Schließen"
        className="absolute right-2.5 top-2.5 z-10 grid size-7 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>

      <EventDetail event={event} />
    </div>
  );
}
