import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Fängt Fehler aus den nachgeladenen Seiten ab.
 *
 * Ohne sie reißt ein Fehler in einer einzigen Seite — ein Bündel, das nicht
 * ankommt, ein Datensatz, der anders aussieht als erwartet — die gesamte
 * Anwendung mit: React hängt den Baum ab, und der Nutzer sieht eine weiße
 * Fläche ohne Kopfleiste, ohne Navigation und ohne Hinweis, was zu tun wäre.
 *
 * Sie liegt deshalb **um den Outlet**, nicht um die ganze App: Kopfleiste,
 * Bereichsleiste und Suche bleiben dadurch bedienbar, und der Weg zurück ist
 * ein Klick statt eines Neustarts.
 *
 * Zurückgesetzt wird beim Wechsel der Adresse (`resetKey`) statt über einen
 * `key` am Element: Ein neuer Key würde den gesamten Unterbaum neu aufbauen —
 * und damit bei jeder Navigation die Leaflet-Karte, die genau deshalb eine
 * pfadlose Layoutroute hat.
 */

interface Props {
  children: ReactNode;
  /** Ändert sich diese Angabe, gilt der Fehler als überholt. */
  resetKey: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kein Fehlerdienst — das Projekt hat keinen Server und sammelt nichts.
    // In der Entwicklung ist die Konsole der richtige Ort dafür.
    if (import.meta.env.DEV) console.error('Fehler in einer Seite:', error, info.componentStack);
  }

  override componentDidUpdate(previous: Props): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-md">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Diese Seite konnte nicht geladen werden
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Karte, Zeitstrahl und Suche funktionieren weiter. Ein erneuter Versuch hilft oft
            schon — sonst führt der Weg zurück zum Atlas.
          </p>

          {import.meta.env.DEV ? (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-ink-subtle scrollbar-slim">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
            >
              Neu laden
            </button>
            {/*
              Bewusst ein echter Seitenwechsel und kein Router-Link: Wenn ein
              Bündel nicht ankommt, hilft nur ein frischer Ladevorgang.
            */}
            <a
              href="/"
              className="tap rounded-lg px-2 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Zurück zum Atlas
            </a>
          </div>
        </div>
      </div>
    );
  }
}
