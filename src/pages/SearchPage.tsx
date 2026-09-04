import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { search } from '@/lib/search';
import PageContainer from '@/components/layout/PageContainer';
import SearchResultList from '@/components/search/SearchResultList';

/** Beispiele, die zugleich zeigen, was die Suche alles versteht. */
const EXAMPLES = [
  'Genesis 12',
  'Moses',
  'Jerusalem',
  '1000 v. Chr.',
  'Paulus zweite Missionsreise',
  '8. Jahrhundert v. Chr.',
  'Psalm 23',
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => search(query, 60), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <PageContainer
      title="Suche"
      subtitle="Buch und Kapitel, Person, Ort, Jahreszahl oder Zeitraum — alles im selben Feld."
    >
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 focus-within:border-accent">
        <svg
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-ink-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Wonach suchst du?"
          aria-label="Suchbegriff"
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle sm:text-sm"
        />
        {query ? (
          <span className="shrink-0 text-xs tabular-nums text-ink-subtle">
            {results.length} {results.length === 1 ? 'Treffer' : 'Treffer'}
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        {query.trim().length === 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              Zum Ausprobieren
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => setParams({ q: example })}
                    className="rounded-full border border-line px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink sm:px-2.5 sm:py-1"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-6 text-center">
            <p className="text-sm text-ink">Nichts gefunden zu „{query}".</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
              Der Datensatz ist eine Auswahl, keine Vollständigkeit. Versuch es mit einem
              Buchnamen, einer Person oder einer Jahreszahl.
            </p>
          </div>
        ) : (
          <SearchResultList results={results} grouped />
        )}
      </div>
    </PageContainer>
  );
}
