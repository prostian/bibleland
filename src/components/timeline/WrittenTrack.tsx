import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { books } from '@/lib/dataset';
import { sectionColorVar } from '@/lib/labels';
import { formatYear } from '@/lib/year';
import type { TimelineScale } from '@/lib/timelineScale';

/**
 * Die Spur der Abfassungszeiten.
 *
 * Vierzehn Bücher tragen kein einziges Ereignis, und das ist kein Versäumnis:
 * Levitikus ist Gesetzestext, die Briefe sind Briefe — sie erzählen keine
 * Handlung. Ein Ereignis „Paulus schreibt an die Epheser" zu erfinden, füllte
 * den Zeitstrahl mit Einträgen, in denen nichts geschieht.
 *
 * Stattdessen eine **eigene Spur mit eigener Form**: schmale Balken statt
 * Punkte, in einer Zeile über den Ereignissen. Auf einen Blick erkennbar,
 * dass hier nichts geschieht, sondern geschrieben wird. Deshalb auch nur auf
 * der Jahresachse — im Kapitelmodus hat eine Abfassungszeit keinen Ort.
 */

interface WrittenTrackProps {
  scale: TimelineScale;
  /** Abstand von oben, in Pixeln. */
  top: number;
  height: number;
}

/** Bücher mit Abfassungszeit, einmal beim Laden sortiert. */
const WRITTEN_BOOKS = books
  .filter((book) => book.writtenYear !== undefined)
  .sort((a, b) => (a.writtenYear ?? 0) - (b.writtenYear ?? 0));

const BAR_WIDTH = 7;

export default function WrittenTrack({ scale, top, height }: WrittenTrackProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      WRITTEN_BOOKS.map((book) => ({ book, x: scale.valueToX(book.writtenYear ?? 0) })).filter(
        (item) => item.x >= -BAR_WIDTH && item.x <= scale.width + BAR_WIDTH,
      ),
    [scale],
  );

  const ids = visible.map((item) => item.book.id);
  const rovingId = focusedId && ids.includes(focusedId) ? focusedId : (ids[0] ?? null);

  /*
   * Dieselbe Werkzeugleisten-Bedienung wie bei den Ereignissen: Die Spur ist
   * eine Tabulator-Station, die Pfeiltasten wandern darin. 49 Bücher als
   * einzelne Stationen würden den Zeitstrahl wieder unpassierbar machen.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (ids.length === 0) return;
      const current = rovingId ? ids.indexOf(rovingId) : -1;

      let next: number;
      switch (e.key) {
        case 'ArrowRight':
          next = Math.min(ids.length - 1, current + 1);
          break;
        case 'ArrowLeft':
          next = Math.max(0, current - 1);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = ids.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      // Sonst verschöbe der Zeitstrahl zusätzlich seinen Ausschnitt.
      e.stopPropagation();

      const id = ids[next];
      if (!id) return;
      setFocusedId(id);
      containerRef.current?.querySelector<HTMLButtonElement>(`[data-book-id="${id}"]`)?.focus();
    },
    [ids, rovingId],
  );

  if (visible.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-orientation="horizontal"
      aria-label="Abfassungszeiten der Bücher — mit den Pfeiltasten wechseln, mit Enter öffnen"
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        const id = (e.target as HTMLElement).dataset['bookId'];
        if (id) setFocusedId(id);
      }}
      className="absolute inset-x-0 z-10"
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      {visible.map(({ book, x }) => (
        <button
          key={book.id}
          type="button"
          data-book-id={book.id}
          tabIndex={book.id === rovingId ? 0 : -1}
          onClick={() => navigate(`/buch/${book.id}`)}
          title={`${book.name} — verfasst um ${formatYear(book.writtenYear ?? 0)}`}
          className="absolute top-0 grid place-items-center"
          style={{ left: `${x - BAR_WIDTH}px`, width: `${BAR_WIDTH * 2}px`, height: `${height}px` }}
        >
          <span
            className="pointer-events-none block rounded-[1px]"
            style={{
              width: '3px',
              height: `${height - 4}px`,
              backgroundColor: sectionColorVar(book.section),
              opacity: 0.75,
            }}
            aria-hidden="true"
          />
          <span className="sr-only">
            {book.name}, verfasst um {formatYear(book.writtenYear ?? 0)}
          </span>
        </button>
      ))}
    </div>
  );
}
