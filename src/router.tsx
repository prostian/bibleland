import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppShell from '@/components/layout/AppShell';
import AtlasPage from '@/pages/AtlasPage';
import EventPanel from '@/pages/EventPanel';
import NotFoundPage from '@/pages/NotFoundPage';

/**
 * Routen.
 *
 * `AtlasPage` ist eine **pfadlose** Layoutroute: `/` und `/ereignis/:id`
 * teilen sich dieselbe Instanz, sodass Karte und Zeitstrahl beim Öffnen
 * eines Ereignisses montiert bleiben. Würde Leaflet dabei neu aufgebaut,
 * ginge bei jedem Klick der Kartenausschnitt verloren.
 *
 * Die Entitätsseiten liegen bewusst daneben statt darin — sie sind
 * Vollseiten zum Lesen, nicht Beiwerk zur Karte. Sie werden erst bei Bedarf
 * geladen; besonders das Wissensnetz spart so d3 aus dem ersten Ladevorgang
 * heraus, das beim Öffnen des Atlas niemand braucht.
 */

const PersonPage = lazy(() => import('@/pages/PersonPage'));
const PlacePage = lazy(() => import('@/pages/PlacePage'));
const BookPage = lazy(() => import('@/pages/BookPage'));
const JourneyPage = lazy(() => import('@/pages/JourneyPage'));
const GraphPage = lazy(() => import('@/pages/GraphPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));

/**
 * Ladezustand für nachgeladene Seiten. Bewusst zurückhaltend: Auf einem
 * schnellen Rechner ist der Chunk da, bevor ein Spinner zu Ende gedreht
 * hätte — ein blinkender Kreisel wäre störender als ein ruhiger Hinweis.
 */
function PageFallback() {
  return (
    <div className="grid h-full place-items-center">
      <p className="text-sm text-ink-subtle">Wird geladen …</p>
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        element: <AtlasPage />,
        children: [
          { index: true, element: null },
          { path: 'ereignis/:id', element: <EventPanel /> },
        ],
      },
      { path: 'person/:id', element: withSuspense(<PersonPage />) },
      { path: 'ort/:id', element: withSuspense(<PlacePage />) },
      { path: 'buch/:id', element: withSuspense(<BookPage />) },
      { path: 'reise/:id', element: withSuspense(<JourneyPage />) },
      { path: 'graph', element: withSuspense(<GraphPage />) },
      { path: 'graph/:type/:id', element: withSuspense(<GraphPage />) },
      { path: 'suche', element: withSuspense(<SearchPage />) },
      { path: 'info', element: withSuspense(<AboutPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
