import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { GraphNode, NodeType } from '@/types';
import { buildGraph, egoGraph, hubs, nodeKey, splitNodeKey } from '@/lib/graph';
import { NODE_TYPE_LABEL, NODE_TYPE_PLURAL, entityPath } from '@/lib/labels';
import KnowledgeGraph from '@/components/graph/KnowledgeGraph';
import { cn } from '@/lib/cn';

const NODE_COLOR: Record<NodeType, string> = {
  ereignis: 'var(--bl-node-ereignis)',
  person: 'var(--bl-node-person)',
  ort: 'var(--bl-node-ort)',
  buch: 'var(--bl-node-buch)',
  reise: 'var(--bl-node-reise)',
};

const NODE_TYPES: NodeType[] = ['ereignis', 'person', 'ort', 'buch', 'reise'];

/**
 * Das Wissensnetz als eigene Seite.
 *
 * Ohne Mittelpunkt zeigt sie die am stärksten verknüpften Knoten als
 * Einstieg — das vollständige Netz auf einmal ist ein unlesbares Knäuel.
 * Mit `/graph/person/paulus` wird der Umkreis um eine Entität gezeichnet.
 */
export default function GraphPage() {
  const { type, id } = useParams<{ type?: NodeType; id?: string }>();
  const navigate = useNavigate();
  const [depth, setDepth] = useState(2);

  const centerId = type && id ? nodeKey(type, id) : undefined;

  const graph = useMemo(() => {
    if (centerId) return egoGraph(centerId, depth);
    // Ohne Mittelpunkt: der Umkreis um den am besten vernetzten Knoten.
    const top = hubs(1)[0];
    return top ? egoGraph(top.id, 2, 140) : buildGraph();
  }, [centerId, depth]);

  const centerNode = useMemo(
    () => graph.nodes.find((node) => node.id === centerId),
    [graph, centerId],
  );

  const handleSelect = useCallback(
    (node: GraphNode) => {
      const parts = splitNodeKey(node.id);
      if (parts) navigate(`/graph/${parts.type}/${parts.id}`);
    },
    [navigate],
  );

  /** Dieselben Knoten als Liste — die tastaturbedienbare Alternative zum Canvas. */
  const neighbours = useMemo(
    () =>
      [...graph.nodes]
        .filter((node) => node.id !== centerId)
        .sort((a, b) => b.degree - a.degree),
    [graph, centerId],
  );

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-ink">
            {centerNode ? centerNode.label : 'Wissensnetz'}
          </h1>
          <p className="text-[11px] text-ink-subtle">
            {graph.nodes.length} Knoten · {graph.edges.length} Verbindungen
            {centerNode ? ` · Umkreis ${depth}` : ' · meistverknüpfter Ausschnitt'}
          </p>
        </div>

        {centerNode ? (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] text-ink-subtle">Umkreis</span>
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDepth(value)}
                aria-pressed={depth === value}
                className={cn(
                  'size-6 rounded-md border text-[11px] tabular-nums transition-colors',
                  depth === value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-ink-muted hover:bg-surface-2',
                )}
              >
                {value}
              </button>
            ))}
            {(() => {
              const parts = splitNodeKey(centerNode.id);
              return parts ? (
                <Link
                  to={entityPath(parts.type, parts.id)}
                  className="ml-1 rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  Zur Seite
                </Link>
              ) : null;
            })()}
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <KnowledgeGraph graph={graph} centerId={centerId} onSelect={handleSelect} />

          <ul className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-line bg-overlay px-2.5 py-2 shadow-panel backdrop-blur-md">
            {NODE_TYPES.map((nodeType) => (
              <li key={nodeType} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: NODE_COLOR[nodeType] }}
                  aria-hidden="true"
                />
                {NODE_TYPE_LABEL[nodeType]}
              </li>
            ))}
          </ul>
        </div>

        {/* Listenalternative: Das Canvas lässt sich nicht mit der Tastatur
            bedienen, dieselben Knoten sind hier aber alle erreichbar. */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-line bg-surface scrollbar-slim lg:block">
          <h2 className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Verbundene Knoten
          </h2>
          <ul className="p-1.5">
            {neighbours.slice(0, 120).map((node) => {
              const parts = splitNodeKey(node.id);
              if (!parts) return null;
              return (
                <li key={node.id}>
                  <Link
                    to={`/graph/${parts.type}/${parts.id}`}
                    className="flex items-baseline gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-surface-2"
                  >
                    <span
                      className="size-1.5 shrink-0 translate-y-[-1px] rounded-full"
                      style={{ backgroundColor: NODE_COLOR[node.type] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">{node.label}</span>
                    <span className="shrink-0 tabular-nums text-ink-subtle">{node.degree}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {!centerNode ? (
        <div className="shrink-0 border-t border-line bg-surface px-4 py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            Einstiegspunkte
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {hubs(10).map((node) => {
              const parts = splitNodeKey(node.id);
              if (!parts) return null;
              return (
                <li key={node.id}>
                  <Link
                    to={`/graph/${parts.type}/${parts.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs text-ink transition-colors hover:bg-surface-2"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: NODE_COLOR[node.type] }}
                      aria-hidden="true"
                    />
                    {node.label}
                    <span className="text-ink-subtle">{NODE_TYPE_PLURAL[node.type].slice(0, 1)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
