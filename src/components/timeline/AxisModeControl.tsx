import { useMemo } from 'react';

import { SECTIONS } from '@/types';
import { books, eventsInBook } from '@/lib/dataset';
import { SECTION_LABEL } from '@/lib/labels';
import type { ReadingScope } from '@/lib/readingPath';
import { useAtlasStore } from '@/store/useAtlasStore';
import { cn } from '@/lib/cn';

/**
 * Umschalter zwischen Zeit- und Kapitelachse, samt Auswahl des Lesebereichs.
 *
 * Die Ereigniszahl steht bei jedem Buch dabei. Ohne sie griffe man
 * unweigerlich ins Leere: 3. Mose hat kein einziges Ereignis, weil es keine
 * Handlung an Orten erzählt — das ist keine Lücke im Datensatz, sondern die
 * Natur des Buchs, und man sollte es vor dem Klick sehen.
 */
export default function AxisModeControl() {
  const axisMode = useAtlasStore((s) => s.axisMode);
  const setAxisMode = useAtlasStore((s) => s.setAxisMode);
  const readingScope = useAtlasStore((s) => s.readingScope);
  const setReadingScope = useAtlasStore((s) => s.setReadingScope);

  const bookOptions = useMemo(
    () =>
      books.map((book) => ({
        id: book.id,
        name: book.name,
        count: eventsInBook(book.id).length,
      })),
    [],
  );

  const value =
    readingScope.kind === 'buch' ? `buch:${readingScope.id}` : `abschnitt:${readingScope.id}`;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Ordnung des Strahls"
        className="flex rounded-md border border-line bg-surface p-0.5"
      >
        {(
          [
            ['zeit', 'Zeit', 'Nach Jahren geordnet — die historische Abfolge'],
            ['kapitel', 'Kapitel', 'Nach Lesereihenfolge geordnet — so, wie das Buch dasteht'],
          ] as const
        ).map(([mode, label, hint]) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={axisMode === mode}
            title={hint}
            onClick={() => setAxisMode(mode)}
            className={cn(
              'rounded px-2 py-0.5 text-[11px] transition-colors',
              axisMode === mode
                ? 'bg-accent text-accent-contrast'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {axisMode === 'kapitel' ? (
        <select
          aria-label="Lesebereich"
          value={value}
          onChange={(e) => {
            const [kind, id] = e.target.value.split(':');
            if (kind === 'buch' && id) setReadingScope({ kind: 'buch', id } as ReadingScope);
            else if (kind === 'abschnitt' && id) {
              setReadingScope({ kind: 'abschnitt', id } as ReadingScope);
            }
          }}
          className="max-w-44 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] text-ink outline-none focus-visible:border-accent"
        >
          <optgroup label="Abschnitt am Stück">
            {SECTIONS.map((section) => (
              <option key={section} value={`abschnitt:${section}`}>
                {SECTION_LABEL[section]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Einzelnes Buch">
            {bookOptions.map((book) => (
              <option key={book.id} value={`buch:${book.id}`} disabled={book.count === 0}>
                {book.name} {book.count === 0 ? '— keine Ereignisse' : `(${book.count})`}
              </option>
            ))}
          </optgroup>
        </select>
      ) : null}
    </div>
  );
}
