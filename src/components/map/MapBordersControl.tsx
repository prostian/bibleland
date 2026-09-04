import { useEffect, useRef, useState } from 'react';

import type { TerritoryEra } from '@/types';
import { territoryEras } from '@/lib/territories';
import { formatYearRange } from '@/lib/year';
import { useMapStyleStore } from '@/store/useMapStyleStore';
import { cn } from '@/lib/cn';

interface MapBordersControlProps {
  /** Die gerade gezeichnete Epoche — im Automatikmodus die zum Zeitraum. */
  activeEra: TerritoryEra | null;
}

/**
 * Umschalter für die historischen Grenzen.
 *
 * Drei Zustände statt eines Schalters: aus, automatisch, feste Epoche. Das
 * Automatische ist der Regelfall — die Karte zeigt dann die Verhältnisse der
 * Zeit, die man gerade betrachtet. Wer vergleichen will, klemmt eine Epoche
 * fest und wandert mit dem Zeitstrahl darunter hindurch.
 */
export default function MapBordersControl({ activeEra }: MapBordersControlProps) {
  const mode = useMapStyleStore((s) => s.bordersMode);
  const eraId = useMapStyleStore((s) => s.bordersEraId);
  const setMode = useMapStyleStore((s) => s.setBordersMode);
  const setEra = useMapStyleStore((s) => s.setBordersEra);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Schließen bei Escape und bei einem Klick daneben — ein Menü über der
  // Karte, das offen bleibt, verdeckt genau das, was man ansehen will.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const summary = mode === 'aus' ? 'Grenzen: aus' : (activeEra?.name ?? 'Grenzen');

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      {open ? (
        <div
          role="radiogroup"
          aria-label="Historische Grenzen"
          className="absolute bottom-full left-0 mb-1.5 max-h-[min(26rem,60vh)] w-64 overflow-y-auto rounded-xl border border-line bg-overlay p-1 shadow-panel backdrop-blur-md scrollbar-slim"
        >
          <Choice
            label="Aus"
            hint="Nur der Kartenhintergrund"
            checked={mode === 'aus'}
            onSelect={() => {
              setMode('aus');
              setOpen(false);
            }}
          />
          <Choice
            label="Automatisch"
            hint="Folgt dem betrachteten Zeitraum"
            checked={mode === 'auto'}
            onSelect={() => {
              setMode('auto');
              setOpen(false);
            }}
          />

          <p className="mt-1.5 mb-0.5 px-2 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-subtle border-t border-line">
            Feste Epoche
          </p>
          {territoryEras.map((era) => (
            <Choice
              key={era.id}
              label={era.name}
              hint={`${era.hint} · ${formatYearRange(era.yearFrom, era.yearTo)}`}
              checked={mode === 'fest' && eraId === era.id}
              onSelect={() => {
                setEra(era.id);
                setOpen(false);
              }}
            />
          ))}

          <p className="mt-1 border-t border-line px-2 py-1.5 text-[10px] leading-relaxed text-ink-subtle">
            Die Umrisse sind schematisch. Antike Herrschaft endete an Einflusszonen, nicht an
            Linien — deshalb sind alle Ränder gestrichelt.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        title={activeEra ? `${activeEra.name} — ${activeEra.note}` : 'Historische Grenzen einblenden'}
        className={cn(
          'tap flex w-full items-center gap-1.5 rounded-lg border border-line bg-overlay px-2 py-2 text-[11px] shadow-panel backdrop-blur-md transition-colors sm:py-1',
          mode === 'aus' ? 'text-ink-subtle hover:text-ink-muted' : 'text-ink',
        )}
      >
        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" aria-hidden="true">
          <path
            d="M2 4.2 6 2.6l4 1.6 4-1.6v9.2l-4 1.6-4-1.6-4 1.6z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M6 2.6v9.8M10 4.2V14" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2" />
        </svg>
        <span className="truncate">{summary}</span>
        {mode === 'auto' ? (
          <span className="ml-auto shrink-0 rounded-full bg-surface-3 px-1.5 text-[9px] uppercase tracking-wide text-ink-subtle">
            auto
          </span>
        ) : null}
      </button>
    </div>
  );
}

function Choice({
  label,
  hint,
  checked,
  onSelect,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors',
        checked ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      <span className="text-xs font-medium">{label}</span>
      <span className={cn('text-[10px]', checked ? 'text-accent/80' : 'text-ink-subtle')}>{hint}</span>
    </button>
  );
}
