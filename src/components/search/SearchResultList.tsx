import { Link } from 'react-router-dom';

import type { SearchResult, SearchResultKind } from '@/types';
import { NODE_TYPE_PLURAL, entityPath } from '@/lib/labels';
import { cn } from '@/lib/cn';

const KIND_COLOR: Record<SearchResultKind, string> = {
  ereignis: 'var(--bl-node-ereignis)',
  person: 'var(--bl-node-person)',
  ort: 'var(--bl-node-ort)',
  buch: 'var(--bl-node-buch)',
  reise: 'var(--bl-node-reise)',
  stelle: 'var(--bl-accent)',
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  ...NODE_TYPE_PLURAL,
  stelle: 'Bibelstellen',
};

export function resultPath(result: SearchResult): string {
  if (result.kind === 'stelle') return `/ereignis/${result.id}`;
  return entityPath(result.kind, result.id);
}

interface SearchResultListProps {
  results: readonly SearchResult[];
  /** Index des per Tastatur hervorgehobenen Treffers. */
  activeIndex?: number;
  onNavigate?: () => void;
  grouped?: boolean;
}

/**
 * Trefferliste, wahlweise flach (Befehlspalette) oder nach Art gruppiert
 * (Suchseite).
 */
export default function SearchResultList({
  results,
  activeIndex,
  onNavigate,
  grouped = false,
}: SearchResultListProps) {
  if (results.length === 0) return null;

  const rows = results.map((result, index) => (
    <li key={`${result.kind}:${result.id}`}>
      <Link
        to={resultPath(result)}
        onClick={onNavigate}
        data-result-index={index}
        className={cn(
          // Am Finger höhere Zeilen — eine Trefferliste ist der Ort, an dem
          // ein Fehlgriff am meisten kostet.
          'flex items-baseline gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors sm:py-1.5',
          index === activeIndex ? 'bg-accent-soft' : 'hover:bg-surface-2',
        )}
      >
        <span
          className="size-2 shrink-0 translate-y-[-1px] rounded-full"
          style={{ backgroundColor: KIND_COLOR[result.kind] }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">{result.title}</span>
          <span className="block truncate text-xs text-ink-subtle">{result.subtitle}</span>
        </span>
      </Link>
    </li>
  ));

  if (!grouped) return <ul className="flex flex-col gap-0.5">{rows}</ul>;

  // Gruppiert: Reihenfolge der Blöcke folgt der Nützlichkeit, nicht dem Alphabet.
  const order: SearchResultKind[] = ['ereignis', 'person', 'ort', 'reise', 'buch', 'stelle'];
  return (
    <div className="flex flex-col gap-6">
      {order.map((kind) => {
        const inKind = results.filter((r) => r.kind === kind);
        if (inKind.length === 0) return null;
        return (
          <section key={kind}>
            <h2 className="mb-1.5 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              {KIND_LABEL[kind]}
              <span className="tabular-nums font-normal">{inKind.length}</span>
            </h2>
            <ul className="flex flex-col gap-0.5">
              {inKind.map((result) => (
                <li key={`${result.kind}:${result.id}`}>
                  <Link
                    to={resultPath(result)}
                    onClick={onNavigate}
                    className="flex items-baseline gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                      style={{ backgroundColor: KIND_COLOR[result.kind] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{result.title}</span>
                      <span className="block truncate text-xs text-ink-subtle">
                        {result.subtitle}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
