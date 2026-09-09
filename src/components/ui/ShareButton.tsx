import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Die aktuelle Ansicht weitergeben.
 *
 * Geteilt wird die vollständige Adresse samt Filterparametern — genau das,
 * was der Nutzer gerade sieht, nicht eine allgemeine Startseite. Am Telefon
 * über das Systemblatt, sonst über die Zwischenablage: Dort ist die
 * Adresszeile oft gar nicht sichtbar, und „kopier mal die URL" ist auf einem
 * Telefon kein zumutbarer Rat.
 *
 * **Fehlschläge bleiben still.** Ein abgebrochenes Systemblatt ist kein
 * Fehler, sondern eine Entscheidung; und `navigator.clipboard` fehlt in
 * unsicheren Kontexten schlicht. Ein Dialog dafür wäre eine Zumutung — der
 * Knopf bestätigt nur, was tatsächlich geklappt hat.
 */

/** Wie lange die Bestätigung am Knopf stehen bleibt. */
const CONFIRM_MS = 2000;

interface ShareButtonProps {
  /** Was geteilt wird — ohne Angabe der Titel der aktuellen Seite. */
  title?: string;
  /** Kleine Ausführung ohne Beschriftung, für enge Kopfzeilen. */
  compact?: boolean;
  className?: string;
}

export default function ShareButton({ title, compact = false, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const share = async () => {
    const url = window.location.href;
    const text = title ?? document.title;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text, url });
      } catch {
        /* Abgebrochen oder vom Browser abgelehnt — beides ohne Meldung. */
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), CONFIRM_MS);
    } catch {
      /* Kein sicherer Kontext, keine Berechtigung — dann eben nicht. */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? 'Link wurde kopiert' : 'Diese Ansicht teilen'}
      className={cn(
        'tap inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink',
        compact ? 'size-8 justify-center' : 'px-2 py-1.5',
        className,
      )}
    >
      {copied ? (
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M8 10.5V2.5M8 2.5L5.5 5M8 2.5L10.5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 8.5v4a1 1 0 001 1h7a1 1 0 001-1v-4" strokeLinecap="round" />
        </svg>
      )}
      {compact ? null : <span>{copied ? 'Link kopiert' : 'Teilen'}</span>}
    </button>
  );
}
