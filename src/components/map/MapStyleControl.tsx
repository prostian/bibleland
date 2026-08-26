import { TILE_STYLE_LIST } from '@/lib/tileStyles';
import { useMapStyleStore } from '@/store/useMapStyleStore';
import { cn } from '@/lib/cn';

/**
 * Umschalter für den Kartenhintergrund.
 *
 * Sitzt unten links über der Karte, wo er nicht mit der Legende oben links
 * und den Zoomknöpfen unten rechts kollidiert.
 */
export default function MapStyleControl() {
  const styleId = useMapStyleStore((s) => s.styleId);
  const setStyle = useMapStyleStore((s) => s.setStyle);

  return (
    <div
      role="radiogroup"
      aria-label="Kartenhintergrund"
      className="pointer-events-auto absolute bottom-3 left-3 z-1000 flex rounded-lg border border-line bg-overlay p-0.5 shadow-panel backdrop-blur-md"
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
            'rounded-md px-2 py-1 text-[11px] transition-colors',
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
