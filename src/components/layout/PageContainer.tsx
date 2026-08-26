import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Rahmen für alle Entitätsseiten außerhalb des Atlas.
 *
 * Hält Zeilenlänge, Abstände und den Rückweg an einer Stelle — so sehen
 * Personen-, Orts-, Buch- und Reiseseite gleich aus, ohne dass jede es
 * einzeln nachbauen muss.
 */
export default function PageContainer({
  eyebrow,
  title,
  subtitle,
  aside,
  children,
}: {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto scrollbar-slim">
      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-8 lg:py-10">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-ink-subtle transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9.5 3.5L5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zum Atlas
        </Link>

        <header className="mb-6">
          {eyebrow ? <div className="mb-2 flex flex-wrap gap-1.5">{eyebrow}</div> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <div className="mt-1.5 text-sm text-ink-muted">{subtitle}</div> : null}
          {aside ? <div className="mt-4">{aside}</div> : null}
        </header>

        {children}
      </div>
    </div>
  );
}

/** Abschnittsüberschrift innerhalb einer Entitätsseite. */
export function PageSection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="mb-2.5 flex items-baseline gap-2 text-sm font-semibold text-ink">
        {title}
        {count !== undefined ? (
          <span className="text-xs font-normal tabular-nums text-ink-subtle">{count}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}
