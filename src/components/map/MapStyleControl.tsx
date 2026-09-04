import { TILE_STYLE_LIST } from '@/lib/tileStyles';
import { useMapStyleStore } from '@/store/useMapStyleStore';
import { cn } from '@/lib/cn';

/**
 * Umschalter für den Kartenhintergrund.
 *
 * Die Platzierung übernimmt der Aufrufer: Unten links steht er zusammen mit
 * dem Grenzen-Umschalter in einer Spalte, wo er weder mit der Legende oben
 * links noch mit den Zoomknöpfen unten rechts kollidiert.
 */
export default function MapStyleControl() {
  const styleId = useMapStyleStore((s) => s.styleId);
  const setStyle = useMapStyleStore((s) => s.setStyle);

  return (
    <div
      role="radiogroup"
      aria-label="Kartenhintergrund"
      className="pointer-events-auto flex rounded-lg border border-line bg-overlay p-0.5 shadow-panel backdrop-blur-md"
    >
      {TILE_STYLE_LIST.map((style) => (
        <button
          key={style.id}
          type="button"
          role="radio"
          aria-checked={styleId === style.id}
          title={style.hint}
          onClick={() => setStyle(style.id)}
          className={cn(
            'tap rounded-md px-2.5 py-1.5 text-[11px] transition-colors sm:px-2 sm:py-1',
            styleId === style.id
              ? 'bg-surface-3 font-medium text-ink'
              : 'text-ink-subtle hover:text-ink-muted',
          )}
        >
          {style.label}
        </button>
      ))}
    </div>
  );
}
