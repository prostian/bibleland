import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import '@/index.css';
import { router } from '@/router';
import { watchSystemTheme } from '@/store/useThemeStore';

watchSystemTheme();

const container = document.getElementById('root');
if (!container) throw new Error('Wurzelelement #root fehlt in index.html.');

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

/*
 * Der Service Worker läuft nur im Produktionsbuild.
 *
 * In der Entwicklung ist er eine Quelle rätselhafter Fehler: Er liefert alte
 * Dateien aus, während Vite gerade neue schickt, und man sucht den Fehler im
 * Quelltext statt im Zwischenspeicher.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Kein HTTPS, abgeschaltet, privater Modus — dann eben ohne Offline. */
    });
  });
}
