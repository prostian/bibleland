import { useSyncExternalStore } from 'react';

/**
 * Abonniert eine Media Query.
 *
 * `useSyncExternalStore` statt `useState` + `useEffect`: So steht der Wert
 * schon beim ersten Render richtig da, statt erst nach einem Nachrenderer —
 * das verhindert, dass das Mobil-Layout kurz aufblitzt.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  );
}

/** Bildschirmbreiten, an denen das Layout umschaltet. Deckungsgleich mit Tailwind. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(max-width: 1023px)');

/**
 * Wird mit dem Finger bedient?
 *
 * Bewusst nicht an der Bildschirmbreite abgelesen: Ein Tablet im Querformat
 * ist breit und wird trotzdem angetippt, ein schmales Browserfenster auf dem
 * Rechner ist schmal und wird geklickt. Was sich unterscheiden muss, sind
 * Trefferflächen und alles, was nur beim Überfahren erscheint — und das
 * hängt am Zeigegerät, nicht an der Breite.
 */
export const useIsTouch = () => useMediaQuery('(pointer: coarse)');

/**
 * Hat der Nutzer Bewegung abbestellt? Steuert `flyTo` gegen `setView`, die
 * Panel-Übergänge und die Graph-Simulation.
 */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
