import { Link } from 'react-router-dom';

import type { NodeType } from '@/types';
import { entityPath } from '@/lib/labels';
import { useAtlasStore } from '@/store/useAtlasStore';
import { cn } from '@/lib/cn';

/** Farbpunkt je Entitätstyp — dieselben Tokens wie im Wissensnetz. */
const NODE_COLOR: Record<NodeType, string> = {
  ereignis: 'var(--bl-node-ereignis)',
  person: 'var(--bl-node-person)',
  ort: 'var(--bl-node-ort)',
  buch: 'var(--bl-node-buch)',
  reise: 'var(--bl-node-reise)',
};

interface EntityChipProps {
  type: NodeType;
  id: string;
  label: string;
  sublabel?: string;
  className?: string;
}

/**
 * Ein verlinkter Verweis auf eine andere Entität — der Baustein, der aus
 * einzelnen Datensätzen ein Netz macht.
 *
 * Beim Überfahren wird die Entität sichtenübergreifend hervorgehoben: Wer
 * im Detailbereich auf „Hebron" zeigt, sieht den zugehörigen Kartenmarker
 * aufleuchten, noch bevor er klickt.
 */
export default function EntityChip({ type, id, label, sublabel, className }: EntityChipProps) {
  const hoverEntity = useAtlasStore((s) => s.hoverEntity);

  return (
    <Link
      to={entityPath(type, id)}
      onMouseEnter={() => hoverEntity(id)}
      onMouseLeave={() => hoverEntity(null)}
      onFocus={() => hoverEntity(id)}
      onBlur={() => hoverEntity(null)}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5',
        'text-xs text-ink transition-colors hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: NODE_COLOR[type] }}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
      {sublabel ? <span className="shrink-0 text-ink-subtle">{sublabel}</span> : null}
    </Link>
  );
}
