import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { hasActiveFilters, useAtlasStore } from '@/store/useAtlasStore';
import { useUiStore, type AtlasView } from '@/store/useUiStore';
import { cn } from '@/lib/cn';

/**
 * Die untere Leiste — die Hauptnavigation auf dem Handy.
 *
 * Warum unten: Auf einem Bildschirm, den man mit einer Hand hält, ist der
 * obere Rand die am schlechtesten erreichbare Stelle. Alles, was man
 * ständig braucht, gehört in den Daumenbereich. Deshalb wandern hier die
 * Bereichswechsel hin, während oben nur Titel und Suche stehen bleiben.
 *
 * Die Leiste mischt bewusst zwei Dinge, die technisch verschieden sind:
 * „Karte" und „Zeit" schalten die Ansicht *innerhalb* des Atlas um, „Netz"
 * und „Filter" führen woandershin. Für den Bedienenden ist das derselbe
 * Handgriff — es sind fünf Orte, zwischen denen er wechselt —, und danach
 * richtet sich die Leiste, nicht nach der Technik dahinter.
 */

interface TabProps {
  label: string;
  icon: ReactNode;
  active: boolean;
  badge?: boolean;
  onClick: () => void;
}

function Tab({ label, icon, active, badge, onClick }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'tap relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors',
        active ? 'text-accent' : 'text-ink-subtle',
      )}
    >
      <span className="relative">
        <svg
          viewBox="0 0 24 24"
          className="size-5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {icon}
        </svg>
        {badge ? (
          <span
            className="absolute -right-1 -top-0.5 size-2 rounded-full bg-accent ring-2 ring-surface"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span className="text-[10px] leading-none">{label}</span>
    </button>
  );
}

export default function MobileTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const atlasView = useUiStore((s) => s.atlasView);
  const setAtlasView = useUiStore((s) => s.setAtlasView);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const filters = useAtlasStore((s) => s.filters);

  const onAtlas = pathname === '/' || pathname.startsWith('/ereignis/');
  const onGraph = pathname.startsWith('/graph');

  /** Zum Atlas wechseln und dort die gewünschte Ansicht zeigen. */
  const showAtlas = (view: AtlasView) => {
    setAtlasView(view);
    if (!onAtlas) navigate('/');
  };

  return (
    <nav
      aria-label="Hauptnavigation"
      className="z-40 shrink-0 border-t border-line bg-surface pb-safe md:hidden"
    >
      <div className="flex items-stretch gap-0.5 px-1 pt-0.5">
        <Tab
          label="Karte"
          active={onAtlas && atlasView === 'karte'}
          onClick={() => showAtlas('karte')}
          icon={
            <>
              <path d="M9 3.5 3.5 5.6v14.9L9 18.4l6 2.1 5.5-2.1V3.5L15 5.6z" />
              <path d="M9 3.5v14.9M15 5.6v14.9" />
            </>
          }
        />
        <Tab
          label="Zeit"
          active={onAtlas && atlasView === 'zeit'}
          onClick={() => showAtlas('zeit')}
          icon={
            <>
              <path d="M3 12h18" />
              <path d="M7 9v6M12 8v8M17 10v4" />
            </>
          }
        />
        <Tab
          label="Netz"
          active={onGraph}
          onClick={() => navigate('/graph')}
          icon={
            <>
              <circle cx="12" cy="6" r="2.4" />
              <circle cx="5.5" cy="17" r="2.4" />
              <circle cx="18.5" cy="17" r="2.4" />
              <path d="m10.4 8 -3.3 6.9M13.6 8l3.3 6.9M8 17h8" />
            </>
          }
        />
        <Tab
          label="Suche"
          active={false}
          onClick={() => setSearchOpen(true)}
          icon={
            <>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 4.5 4.5" />
            </>
          }
        />
        <Tab
          label="Filter"
          active={sidebarOpen}
          badge={hasActiveFilters(filters)}
          onClick={toggleSidebar}
          icon={
            <>
              <path d="M3.5 6h17M6.5 12h11M10 18h4" />
            </>
          }
        />
      </div>
    </nav>
  );
}
