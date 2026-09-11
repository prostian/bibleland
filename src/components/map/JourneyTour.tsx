import { useCallback, useEffect, useMemo } from 'react';

import type { Journey } from '@/types';
import { placeById } from '@/lib/dataset';
import { useAtlasStore } from '@/store/useAtlasStore';

/**
 * Eine Reise Etappe für Etappe ablaufen.
 *
 * Die Daten dafür lagen längst da: `Journey.legs` mit Reihenfolge, Ort,
 * Ereignis und Notiz. Was fehlte, war die zeitliche Dimension der
 * Betrachtung — man sah die fertige Route, konnte sie aber nicht *gehen*.
 * Für eine Gruppe, der man die App zeigt, ist genau das der Unterschied
 * zwischen einer Landkarte und einer Erzählung.
 *
 * **Kein Geschwindigkeitsregler.** Ein fester, ruhiger Takt ist eine
 * Entscheidung; ein Regler dafür wäre ein Einstellknopf, den niemand anfasst
 * und der bei jeder Vorführung erst gesucht werden müsste.
 *
 * **Keine Schleife.** Eine Reise hat ein Ziel. Wieder von vorn zu beginnen
 * ist eine Entscheidung des Nutzers, nicht der Automatik.
 */

/** Takt der Wiedergabe. Langsam genug, um beim Vorführen mitzusprechen. */
const STEP_MS = 6000;

interface JourneyTourProps {
  journey: Journey;
}

export default function JourneyTour({ journey }: JourneyTourProps) {
  const tourLeg = useAtlasStore((s) => s.tourLeg);
  const tourPlaying = useAtlasStore((s) => s.tourPlaying);
  const setTourLeg = useAtlasStore((s) => s.setTourLeg);
  const setTourPlaying = useAtlasStore((s) => s.setTourPlaying);
  const setActiveJourney = useAtlasStore((s) => s.setActiveJourney);

  const legs = useMemo(() => [...journey.legs].sort((a, b) => a.order - b.order), [journey]);
  const total = legs.length;
  const current = tourLeg ?? 1;
  const atEnd = current >= total;

  const currentPlace = placeById.get(legs[current - 1]?.placeId ?? '');

  const goTo = useCallback(
    (order: number) => setTourLeg(Math.min(total, Math.max(1, order))),
    [setTourLeg, total],
  );

  /* --- Wiedergabe ---------------------------------------------------- */

  useEffect(() => {
    if (!tourPlaying) return;
    if (atEnd) {
      setTourPlaying(false);
      return;
    }
    const timer = setTimeout(() => goTo(current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [tourPlaying, current, atEnd, goTo, setTourPlaying]);

  /* --- Tastatur ------------------------------------------------------ */

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        goTo(current + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        goTo(current - 1);
        break;
      case ' ':
        e.preventDefault();
        setTourPlaying(!tourPlaying);
        break;
      case 'Escape':
        e.preventDefault();
        // Nur die Tour endet. Route und Kartenausschnitt bleiben, wo sie sind
        // — wer aussteigt, will sich das Erreichte ansehen.
        setTourLeg(null);
        setTourPlaying(false);
        break;
      default:
        break;
    }
  };

  if (tourLeg === null || total < 2) return null;

  const legNote = legs[current - 1]?.note;

  return (
    <div
      role="group"
      aria-label={`Geführte Tour: ${journey.title}`}
      onKeyDown={onKeyDown}
      className="pointer-events-auto flex w-full items-center gap-1.5 rounded-xl border border-line bg-overlay px-1.5 py-1.5 shadow-panel backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => goTo(current - 1)}
        disabled={current <= 1}
        aria-label="Vorige Etappe"
        className="tap grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 md:size-8"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 3.5L5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setTourPlaying(!tourPlaying)}
        disabled={atEnd && !tourPlaying}
        aria-label={tourPlaying ? 'Tour anhalten' : 'Tour abspielen'}
        className="tap grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-35 md:size-8"
      >
        {tourPlaying ? (
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
            <rect x="4" y="3.5" width="3" height="9" rx="1" />
            <rect x="9" y="3.5" width="3" height="9" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M5.5 3.6a.8.8 0 011.22-.68l6 4.4a.8.8 0 010 1.36l-6 4.4A.8.8 0 015.5 12.4z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={() => goTo(current + 1)}
        disabled={atEnd}
        aria-label="Nächste Etappe"
        className="tap grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 md:size-8"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 3.5L10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-xs text-ink">
          {currentPlace?.name ?? 'Unbekannter Ort'}
          {legNote ? <span className="text-ink-subtle"> · {legNote}</span> : null}
        </p>
        {/* Höflich angesagt: Wer die Karte nicht sieht, erfährt sonst nichts
            davon, dass die Tour weitergelaufen ist. */}
        <p role="status" aria-live="polite" className="text-[10px] tabular-nums text-ink-subtle">
          Etappe {current} von {total}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setTourLeg(null);
          setTourPlaying(false);
        }}
        aria-label="Tour beenden"
        title="Tour beenden (Escape)"
        className="tap grid size-11 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink md:size-8"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>

      {/* Die Route bleibt bestehen, wenn nur die Tour endet — hier wird sie
          ganz abgewählt. Zwei getrennte Ausgänge, weil es zwei Absichten sind. */}
      <button
        type="button"
        onClick={() => setActiveJourney(null)}
        className="tap hidden shrink-0 rounded-lg px-2 py-1.5 text-[11px] text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink sm:block"
      >
        Route ausblenden
      </button>
    </div>
  );
}
