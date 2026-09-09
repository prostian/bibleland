import { useEffect, useRef } from 'react';

import type { PackedEvent } from '@/lib/timelineScale';
import { eventColorVar } from '@/lib/labels';
import { formatEventDate } from '@/lib/year';
import { eventRefLabel } from '@/lib/dataset';
import { useIsMobile } from '@/hooks/useMediaQuery';

/**
 * Die Ereignisse, für die im Zeitstrahl keine Zeile mehr war.
 *
 * Die bloße Zahl hinter „7 weitere passen nicht" ist eine Sackgasse: Man
 * erfährt, dass etwas fehlt, aber nicht was, und der einzige Weg dorthin war
 * bisher Zoomen und Suchen. Die Karte macht es an ihren Pins längst besser —
 * dort steht eine Zahl, und ein Klick zeigt, was dahintersteckt.
 *
 * Gezeigt werden **alle** ausgelassenen Ereignisse, nicht die ersten fünf:
 * Eine gekürzte Liste hätte dasselbe Problem wie die Zahl allein.
 */

interface HiddenEventsProps {
  items: readonly PackedEvent[];
  onSelect: (eventId: string) => void;
  onClose: () => void;
}

export default function HiddenEvents({ items, onSelect, onClose }: HiddenEventsProps) {
  const isMobile = useIsMobile();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Beim Öffnen den ersten Eintrag anspringen — sonst müsste man sich vom
  // Zähler aus erst durch die ganze Liste tabben.
  useEffect(() => {
    listRef.current?.querySelector('button')?.focus();
  }, []);

  const sorted = [...items].sort((a, b) => a.x - b.x);

  return (
    <>
      {/* Ein Klick daneben schließt. Auf dem Telefon liegt die Fläche
          zusätzlich über der Karte, damit das Blatt nicht mit einem Wisch
          auf die Karte konkurriert. */}
      <button
        type="button"
        aria-label="Liste schließen"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/20 md:bg-transparent"
      />

      <div
        ref={listRef}
        role="dialog"
        aria-label={`${items.length} weitere Ereignisse`}
        className={
          isMobile
            ? 'fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop pb-safe'
            : 'absolute bottom-8 left-1/2 z-50 max-h-64 w-80 -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-pop'
        }
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <h2 className="text-xs font-semibold text-ink">
            {items.length} weitere Ereignisse
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Liste schließen"
            className="tap ml-auto grid size-8 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ul className="max-h-[calc(60vh-3rem)] overflow-y-auto overscroll-contain p-1 scrollbar-slim md:max-h-52">
          {sorted.map(({ event }) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(event.id);
                  onClose();
                }}
                className="tap flex w-full items-baseline gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2 md:py-1.5"
              >
                <span
                  className="size-1.5 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ backgroundColor: eventColorVar(event) }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{event.title}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-ink-subtle">
                  {formatEventDate(event)}
                </span>
                <span className="sr-only">{eventRefLabel(event)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
