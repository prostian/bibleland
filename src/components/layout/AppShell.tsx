import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import TopBar from '@/components/layout/TopBar';
import MobileTabBar from '@/components/layout/MobileTabBar';
import FilterPanel from '@/components/filters/FilterPanel';
import CommandPalette from '@/components/search/CommandPalette';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import IntroCard from '@/components/help/IntroCard';
import ShortcutsDialog from '@/components/help/ShortcutsDialog';
import { useIsTablet, usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useFilteredEvents } from '@/hooks/useVisibleEvents';
import { useUiStore } from '@/store/useUiStore';

/**
 * Das Grundgerüst: Kopfleiste, Filterleiste, Inhalt — und auf dem Handy
 * unten die Bereichsleiste.
 *
 * Der Aufbau ist von der schmalen Seite her gedacht. Auf einem Telefon ist
 * nur *eine* Sache gleichzeitig sichtbar: der Inhalt. Die Filter liegen als
 * Schublade davor, die Bereiche wechselt man unten mit dem Daumen. Erst ab
 * 1024 Pixeln, wo tatsächlich Platz für zwei Spalten ist, steht die
 * Filterleiste dauerhaft daneben und die untere Leiste verschwindet
 * zugunsten der Reiter oben.
 */
export default function AppShell() {
  const isTablet = useIsTablet();
  const reducedMotion = usePrefersReducedMotion();
  const matchCount = useFilteredEvents().length;
  const { pathname } = useLocation();

  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const searchOpen = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const helpOpen = useUiStore((s) => s.helpOpen);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);

  // Strg/Cmd + K öffnet die Suche von überall, `?` die Kurzübersicht. Die
  // Listener sitzen hier und nicht in den Dialogen selbst, damit sie auch
  // greifen, wenn diese zu sind.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // In einem Eingabefeld ist `?` ein Fragezeichen und kein Kürzel.
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSearchOpen, setHelpOpen]);

  // Escape schließt die Schublade — dieselbe Taste wie bei Suche und
  // Detailblatt. Nur dort nötig, wo sie über dem Inhalt liegt: Die feste
  // Spalte auf breiten Bildschirmen verdeckt nichts.
  useEffect(() => {
    if (!sidebarOpen || !isTablet) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen, isTablet, setSidebarOpen]);

  // Wird das Fenster schmal, verdeckt die offene Leiste den ganzen Inhalt.
  // Sie geht dann zu — umgekehrt aber nicht wieder auf: Wer sie geschlossen
  // hat, will sie nicht beim Drehen des Geräts zurückbekommen.
  useEffect(() => {
    if (isTablet) setSidebarOpen(false);
  }, [isTablet, setSidebarOpen]);

  return (
    <div className="flex h-full flex-col bg-bg">
      {/*
        Erstes fokussierbares Element der Seite. Ohne ihn führt der Weg zum
        Inhalt über die gesamte Kopfleiste und danach durch den Zeitstrahl —
        bei dessen Markerdichte ist das mit der Tastatur eine Zumutung.
      */}
      <a
        href="#inhalt"
        className="sr-only rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-100"
      >
        Zum Inhalt springen
      </a>

      <TopBar />

      <div className="relative flex min-h-0 flex-1">
        {/* Ab 1024 px eine echte Spalte neben dem Inhalt … */}
        <AnimatePresence initial={false}>
          {sidebarOpen && !isTablet ? (
            <motion.aside
              key="sidebar"
              initial={reducedMotion ? false : { width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={reducedMotion ? { width: 0 } : { width: 0, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.2, 0, 0.2, 1] }}
              className="z-20 shrink-0 overflow-hidden border-r border-line bg-surface"
              aria-label="Filter"
            >
              <div className="h-full w-70">
                <FilterPanel />
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        <main id="inhalt" tabIndex={-1} className="min-w-0 flex-1">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/*
        Ein Filterklick ändert sonst nur das Bild. Wer nicht sieht, dass die
        Karte leerer wird, erfährt ohne diese Ansage gar nichts — deshalb die
        Trefferzahl, höflich und ohne Unterbrechung.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {matchCount} Ereignisse
      </p>

      <MobileTabBar />

      {/* … darunter eine Schublade, die sich über den Inhalt legt. Sie liegt
          außerhalb des Inhaltsbereichs, damit sie auch die untere Leiste
          überdeckt: Eine halb verdeckte Schublade wäre schlimmer als keine. */}
      <AnimatePresence>
        {sidebarOpen && isTablet ? (
          <>
            <motion.button
              key="backdrop"
              type="button"
              aria-label="Filter schließen"
              onClick={() => setSidebarOpen(false)}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.16 }}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.aside
              key="drawer"
              initial={reducedMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={reducedMotion ? { x: '-100%' } : { x: '-100%' }}
              transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.2, 0, 0.2, 1] }}
              drag={reducedMotion ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.4, right: 0 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                // Nach links wischen schließt — die Geste, die jede
                // Schublade auf dem Telefon versteht.
                if (info.offset.x < -70 || info.velocity.x < -500) setSidebarOpen(false);
              }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,20rem)] flex-col border-r border-line bg-surface shadow-pop"
              aria-label="Filter"
            >
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
                <h2 className="text-sm font-semibold text-ink">Filter</h2>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Filter schließen"
                  className="tap ml-auto grid size-9 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <FilterPanel />
              </div>

              {/*
                Die Schublade ist auf dem Handy zugleich das Menü: Die Reiter
                oben sind dort ausgeblendet, und in die untere Leiste passen
                nur die fünf Dinge, die man ständig braucht. „Über die Daten"
                wäre sonst von keinem Telefon aus erreichbar.
              */}
              <NavLink
                to="/info"
                onClick={() => setSidebarOpen(false)}
                className="shrink-0 border-t border-line px-3 py-3 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink pb-safe"
              >
                Über die Daten
              </NavLink>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      {helpOpen ? <ShortcutsDialog onClose={() => setHelpOpen(false)} /> : null}
      <IntroCard onShowShortcuts={() => setHelpOpen(true)} />
    </div>
  );
}
