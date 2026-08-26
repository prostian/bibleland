import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

/**
 * Misst ein Element und hält die Größe aktuell.
 *
 * Der Zeitstrahl rechnet Jahre in Pixel um und braucht dafür seine eigene
 * Breite. Ein ResizeObserver ist hier die einzig verlässliche Quelle: Das
 * Element ändert sich nicht nur beim Fensterwechsel, sondern auch, wenn eine
 * Seitenleiste ein- oder ausklappt oder der Splitter gezogen wird.
 */
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  Size,
] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // Subpixelwerte runden — sonst löst jede Nachkommastelle ein Rerender
      // des gesamten Zeitstrahls aus.
      setSize((prev) => {
        const next = { width: Math.round(width), height: Math.round(height) };
        return prev.width === next.width && prev.height === next.height ? prev : next;
      });
    });
    observer.observe(node);
    observerRef.current = observer;

    const rect = node.getBoundingClientRect();
    setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
  }, []);

  useLayoutEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, size];
}
