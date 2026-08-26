import { Link } from 'react-router-dom';

interface NotFoundPageProps {
  /** Was gesucht wurde: „Person", „Ort", „Buch" … */
  what?: string;
  id?: string | undefined;
}

export default function NotFoundPage({ what = 'Seite', id }: NotFoundPageProps) {
  return (
    <div className="grid h-full place-items-center px-6 py-12">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
          Nicht gefunden
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Diese {what} gibt es nicht
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {id ? (
            <>
              Zur Kennung <code className="rounded bg-surface-2 px-1 py-0.5 text-ink">{id}</code>{' '}
              liegt kein Eintrag vor.
            </>
          ) : (
            'Die aufgerufene Adresse führt ins Leere.'
          )}{' '}
          Der Datensatz ist eine Auswahl, keine Vollständigkeit — vielleicht ist der Eintrag
          schlicht noch nicht erfasst.
        </p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-lg bg-accent px-3.5 py-1.5 text-sm text-accent-contrast transition-opacity hover:opacity-90"
        >
          Zurück zum Atlas
        </Link>
      </div>
    </div>
  );
}
