import { useEffect, useRef } from 'react';

import { useIsTouch } from '@/hooks/useMediaQuery';

/**
 * Kurzübersicht über Tastenkürzel und die nicht offensichtlichen Bedienungen.
 *
 * Bewusst getrennt von der Einführung beim ersten Besuch: Eine Einführung
 * liest man einmal, eine Übersicht schlägt man nach. Sie ist deshalb jederzeit
 * über `?` erreichbar und veraltet nicht, während der Erstbesuch-Hinweis
 * verschwindet, sobald er gelesen wurde.
 *
 * **Jedes hier genannte Kürzel funktioniert tatsächlich.** Eine Übersicht, die
 * etwas verspricht, das es nicht gibt, ist schlimmer als gar keine — wer ein
 * dokumentiertes Kürzel drückt und nichts passiert, probiert die anderen gar
 * nicht erst.
 */

interface Group {
  title: string;
  rows: { keys: string[]; text: string }[];
}

const KEYBOARD: Group[] = [
  {
    title: 'Überall',
    rows: [
      { keys: ['Strg', 'K'], text: 'Suche öffnen (auf dem Mac ⌘ K)' },
      { keys: ['?'], text: 'Diese Übersicht' },
      { keys: ['Esc'], text: 'Dialog, Detailblatt oder Filterschublade schließen' },
    ],
  },
  {
    title: 'Zeitstrahl',
    rows: [
      { keys: ['←', '→'], text: 'Ausschnitt verschieben, solange der Strahl den Fokus hat' },
      { keys: ['+', '−'], text: 'Hinein- und herauszoomen' },
      { keys: ['Tab'], text: 'In die Ereignisreihe wechseln — sie ist eine einzige Station' },
      { keys: ['←', '→'], text: 'Zwischen Ereignissen wandern, wenn eines den Fokus hat' },
      { keys: ['Pos 1', 'Ende'], text: 'Zum ersten oder letzten Ereignis der Reihe' },
      { keys: ['Enter'], text: 'Ereignis öffnen' },
      { keys: ['Esc'], text: 'Aus der Ereignisreihe zurück auf den Strahl' },
    ],
  },
  {
    title: 'Geführte Tour einer Reise',
    rows: [
      { keys: ['←', '→'], text: 'Eine Etappe zurück und vor' },
      { keys: ['Leertaste'], text: 'Abspielen und anhalten' },
      { keys: ['Esc'], text: 'Tour beenden — die Route bleibt liegen' },
    ],
  },
  {
    title: 'Offene Suche',
    rows: [
      { keys: ['↑', '↓'], text: 'Treffer wählen' },
      { keys: ['Enter'], text: 'Treffer öffnen' },
    ],
  },
];

const HIDDEN_GESTURES = [
  'Der Griff zwischen Karte und Zeitstrahl lässt sich ziehen — der Zeitstrahl wird dadurch höher, und es passen mehr Ereignisse hinein.',
  'Auf dem Zeitstrahl zoomen zwei Finger; ein Finger verschiebt.',
  'Unten links auf der Karte liegen die historischen Grenzen und der Kartenhintergrund.',
  'Unten am Zeitstrahl wird zwischen Jahren und Kapiteln umgeschaltet — im Kapitelmodus steht die Lesereihenfolge eines Buchs auf der Achse.',
  'Der Hinweis „N weitere passen nicht" ist anklickbar und zeigt, welche Ereignisse gerade keinen Platz haben.',
];

/** Was den Fokus im Dialog hält. */
const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouch();

  // Wer den Dialog geöffnet hat, bekommt den Fokus zurück — sonst landet er
  // beim Schließen am Anfang der Seite.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    // Fokusfalle: Ein Dialog, aus dem der Tabulator hinausführt, lässt den
    // Nutzer unsichtbar hinter der Überlagerung landen.
    const focusables = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 backdrop-blur-[2px] px-3 py-6 sm:pt-[10vh]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Kurzübersicht"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Kurzübersicht</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kurzübersicht schließen"
            className="tap ml-auto grid size-8 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 scrollbar-slim">
          {/* Am Finger gibt es keine Tastatur — die Kürzel stünden dort als
              Liste von Dingen, die sich nicht ausführen lassen. */}
          {isTouch ? null : (
            <>
              {KEYBOARD.map((group) => (
                <section key={group.title} className="mb-4">
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                    {group.title}
                  </h3>
                  <dl>
                    {group.rows.map((row) => (
                      <div
                        key={`${group.title}-${row.text}`}
                        className="flex items-baseline gap-3 border-b border-line py-1.5 last:border-b-0"
                      >
                        <dt className="flex w-28 shrink-0 flex-wrap gap-1">
                          {row.keys.map((key) => (
                            <kbd
                              key={key}
                              className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] text-ink-muted"
                            >
                              {key}
                            </kbd>
                          ))}
                        </dt>
                        <dd className="min-w-0 flex-1 text-xs text-ink-muted">{row.text}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </>
          )}

          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              Leicht zu übersehen
            </h3>
            <ul className="flex flex-col gap-1.5">
              {HIDDEN_GESTURES.map((text) => (
                <li key={text} className="text-xs leading-relaxed text-ink-muted">
                  {text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
