import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useIsMobile } from '@/hooks/useMediaQuery';

/**
 * Der Hinweis beim ersten Besuch.
 *
 * Wer Bibleland öffnet, sieht eine Karte und einen Zeitstrahl und muss den
 * Rest erraten: dass ⌘K die Suche öffnet, dass der Griff ziehbar ist, dass
 * unten links die Grenzebene sitzt. Drei Sätze nehmen dem das Rätselhafte.
 *
 * Was hier **nicht** gebaut wird, ist eine Tour mit Hervorhebungen einzelner
 * Bedienelemente: Sie bricht bei jeder Layoutänderung, ist am Telefon
 * unbrauchbar und wird von den meisten sofort weggeklickt. Eine ruhige Karte
 * mit einem Knopf ist ehrlicher.
 */

const STORAGE_KEY = 'bibleland-intro-seen';

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Privater Modus: Dann erscheint der Hinweis eben jedes Mal. Ihn
    // deswegen ganz zu unterdrücken, träfe die Falschen.
    return false;
  }
}

function remember(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* Siehe oben. */
  }
}

export default function IntroCard({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const isMobile = useIsMobile();
  const { pathname, search } = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);

  /*
   * Nur beim Betreten der nackten Startseite. Wer über einen geteilten Link
   * auf ein Ereignis oder eine eingestellte Ansicht kommt, will genau das
   * sehen — ein Willkommensgruß davor wäre eine Tür, die jemand zuhält.
   *
   * Einmal beim Mounten entschieden: Sonst spränge der Hinweis auf, sobald
   * jemand ein geöffnetes Ereignis wieder schließt.
   */
  const [visible, setVisible] = useState(
    () => pathname === '/' && search === '' && !alreadySeen(),
  );

  useEffect(() => {
    if (visible) closeRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    remember();
    setVisible(false);
  };

  return (
    <div
      className={
        isMobile
          ? 'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-line bg-surface p-4 shadow-pop pb-safe'
          : 'fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 backdrop-blur-[2px]'
      }
      onClick={isMobile ? undefined : dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Willkommen bei Bibleland"
        onClick={(e) => e.stopPropagation()}
        className={
          isMobile
            ? ''
            : 'w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-pop'
        }
      >
        <h2 className="text-base font-semibold tracking-tight text-ink">Bibleland</h2>

        <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-ink-muted">
          <p>
            Die <strong className="font-medium text-ink">Karte</strong> zeigt, wo etwas geschah,
            der <strong className="font-medium text-ink">Zeitstrahl</strong> darunter, wann — beide
            zeigen immer dieselbe Auswahl.
          </p>
          <p>
            Das <strong className="font-medium text-ink">Wissensnetz</strong> zeigt, wie Ereignisse,
            Personen, Orte und Bücher zusammenhängen.
          </p>
          <p>
            {isMobile
              ? 'Über die Lupe oben findest du Ereignisse, Personen, Orte, Bibelstellen und Jahreszahlen im selben Feld.'
              : 'Mit ⌘K bzw. Strg K findest du Ereignisse, Personen, Orte, Bibelstellen und Jahreszahlen im selben Feld.'}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            className="tap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
          >
            Loslegen
          </button>
          <button
            type="button"
            onClick={() => {
              dismiss();
              onShowShortcuts();
            }}
            className="tap rounded-lg px-2 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Kurzübersicht ansehen
          </button>
        </div>
      </div>
    </div>
  );
}
