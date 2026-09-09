import { useSyncExternalStore } from 'react';

/**
 * Ist gerade eine Netzverbindung da?
 *
 * `navigator.onLine` allein ist notorisch großzügig — es meldet auch dann
 * `true`, wenn zwar ein WLAN verbunden, aber kein Netz dahinter ist. Für den
 * Zweck hier reicht es trotzdem: Die Karte fragt zusätzlich, ob tatsächlich
 * Kacheln fehlgeschlagen sind. Beides zusammen ist verlässlich genug für
 * einen Hinweis, der niemanden aufhält.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange);
      window.addEventListener('offline', onChange);
      return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
