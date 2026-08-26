import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import TopBar from '@/components/layout/TopBar';
import FilterPanel from '@/components/filters/FilterPanel';
import CommandPalette from '@/components/search/CommandPalette';
import { useIsTablet, usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * Das Grundgerüst: Kopfleiste, linke Filterleiste, Inhaltsbereich.
 *
 * Auf schmalen Bildschirmen liegt die Filterleiste als Überlagerung über
 * dem Inhalt statt daneben — bei 375 Pixeln Breite blieben sonst für die
 * Karte keine 100 Pixel übrig.
 */
export default function AppShell() {
  const isTablet = useIsTablet();
  const reducedMotion = usePrefersReducedMotion();
  const [sidebarOpen, setSidebarOpen] = useState(!isTablet);
  const [searchOpen, setSearchOpen] = useState(false);

  // Strg/Cmd + K öffnet die Suche von überall. Der Listener sitzt hier und
  // nicht in der Palette selbst, damit er auch greift, wenn sie zu ist.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-full flex-col bg-bg">
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {sidebarOpen ? (
            <motion.aside
              key="sidebar"
              initial={reducedMotion ? false : { width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={reducedMotion ? { width: 0 } : { width: 0, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.2, 0, 0.2, 1] }}
              className="z-20 shrink-0 overflow-hidden border-r border-line bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-pop"
              aria-label="Filter"
            >
              <div className="h-full w-70">
                <FilterPanel />
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        {/* Auf Tablet und Mobil verdeckt die Leiste den Inhalt — ein Klick
            daneben schließt sie wieder. */}
        {sidebarOpen && isTablet ? (
          <button
            type="button"
            aria-label="Filter schließen"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 z-10 bg-black/20"
          />
        ) : null}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
