import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

const STORAGE_KEY = 'bibleland-zeitstrahl-hoehe';

/**
 * Standardhöhe des Zeitstrahls.
 *
 * Bewusst knapp: Beim Öffnen soll die Karte den Bildschirm beherrschen. Wer
 * mehr Zeitstrahl braucht, zieht ihn hoch — und die App merkt sich das.
 */
export const DEFAULT_TIMELINE_HEIGHT = 168;
const MIN_HEIGHT = 84;

/** Der Zeitstrahl darf höchstens zwei Drittel des Fensters einnehmen. */
function maxHeight(): number {
  if (typeof window === 'undefined') return 600;
  return Math.max(MIN_HEIGHT, Math.round(window.innerHeight * 0.66));
}

function readStored(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_TIMELINE_HEIGHT;
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY));
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMELINE_HEIGHT;
    return Math.min(Math.max(raw, MIN_HEIGHT), maxHeight());
  } catch {
    return DEFAULT_TIMELINE_HEIGHT;
  }
}

/**
 * Höhe des unteren Bereichs, über Sitzungen hinweg gemerkt.
 */
export function useTimelineHeight(): [number, (value: number) => void] {
  const [height, setHeightRaw] = useState(readStored);

  const setHeight = useCallback((value: number) => {
    const clamped = Math.min(Math.max(Math.round(value), MIN_HEIGHT), maxHeight());
    setHeightRaw(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* Privater Modus — die Höhe gilt dann nur für diese Sitzung. */
    }
  }, []);

  // Wird das Fenster kleiner, darf der Zeitstrahl nicht die ganze Karte
  // verschlucken.
  useEffect(() => {
    const onResize = () => setHeightRaw((h) => Math.min(h, maxHeight()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return [height, setHeight];
}

interface SplitHandleProps {
  height: number;
  onHeightChange: (value: number) => void;
}

/**
 * Der Ziehgriff zwischen Karte und Zeitstrahl.
 *
 * Nach oben ziehen vergrößert den Zeitstrahl. Zusätzlich mit den Pfeiltasten
 * bedienbar — ein reiner Mausgriff wäre für Tastaturnutzer eine Sackgasse.
 */
export default function SplitHandle({ height, onHeightChange }: SplitHandleProps) {
  const dragStart = useRef<{ pointerId: number; y: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Höhe des Zeitstrahls"
      aria-valuenow={height}
      tabIndex={0}
      onPointerDown={(e) => {
        dragStart.current = { pointerId: e.pointerId, y: e.clientY, height };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const start = dragStart.current;
        if (!start || start.pointerId !== e.pointerId) return;
        // Nach oben ziehen heißt: mehr Zeitstrahl.
        onHeightChange(start.height + (start.y - e.clientY));
      }}
      onPointerUp={(e) => {
        if (dragStart.current?.pointerId !== e.pointerId) return;
        dragStart.current = null;
        setDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 48 : 16;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onHeightChange(height + step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onHeightChange(height - step);
        } else if (e.key === 'Home') {
          e.preventDefault();
          onHeightChange(DEFAULT_TIMELINE_HEIGHT);
        }
      }}
      onDoubleClick={() => onHeightChange(DEFAULT_TIMELINE_HEIGHT)}
      title="Ziehen, um den Zeitstrahl zu vergrößern — Doppelklick setzt zurück"
      className={cn(
        'group relative z-20 flex h-2 shrink-0 cursor-row-resize touch-none items-center justify-center',
        'border-t border-line bg-surface transition-colors',
        dragging ? 'bg-accent-soft' : 'hover:bg-surface-2',
      )}
    >
      <span
        className={cn(
          'h-0.5 w-9 rounded-full transition-colors',
          dragging ? 'bg-accent' : 'bg-line-strong group-hover:bg-ink-subtle',
        )}
        aria-hidden="true"
      />
    </div>
  );
}
