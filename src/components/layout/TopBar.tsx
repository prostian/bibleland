import { NavLink, Link } from 'react-router-dom';

import ThemeToggle from '@/components/ui/ThemeToggle';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/cn';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-2 py-1 text-xs transition-colors',
    isActive ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
  );

/**
 * Die Kopfleiste.
 *
 * Auf dem Handy steht hier nur noch, was zum Wiedererkennen und Suchen nötig
 * ist: Name und Lupe. Bereichswechsel und Filter sind nach unten gewandert,
 * in Daumenreichweite — oben sind sie mit einer Hand kaum zu treffen. Ab
 * `md` kommen die Reiter zurück, ab `lg` zusätzlich der Knopf für die
 * Filterspalte, die es dort überhaupt erst gibt.
 */
export default function TopBar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);

  return (
    <header className="z-30 flex shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 py-1.5 inset-safe-x">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? 'Filter ausblenden' : 'Filter einblenden'}
        title={sidebarOpen ? 'Filter ausblenden' : 'Filter einblenden'}
        className="hidden size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink lg:grid"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
        </svg>
      </button>

      <Link to="/" className="flex shrink-0 items-center gap-1.5 rounded-md px-1 py-1">
        <span className="text-sm font-semibold tracking-tight text-ink">Bibleland</span>
        <span className="hidden text-[11px] text-ink-subtle sm:inline">Atlas · Zeit · Netz</span>
      </Link>

      <nav className="ml-2 hidden items-center gap-0.5 md:flex" aria-label="Hauptbereiche">
        <NavLink to="/" end className={navLinkClass}>
          Atlas
        </NavLink>
        <NavLink to="/graph" className={navLinkClass}>
          Wissensnetz
        </NavLink>
        <NavLink to="/info" className={navLinkClass}>
          Über die Daten
        </NavLink>
      </nav>

      {/* Auf dem Handy nur die Lupe — der Text daneben kostet Platz, den der
          Titel besser gebraucht. Die Suche liegt zusätzlich unten. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Suchen"
        className="tap ml-auto flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink-subtle transition-colors hover:border-line-strong hover:text-ink-muted max-md:size-9 max-md:justify-center max-md:px-0"
      >
        <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Suchen</span>
        <kbd className="hidden rounded border border-line bg-surface px-1 font-sans text-[10px] text-ink-subtle lg:inline">
          Strg K
        </kbd>
      </button>

      {/* Die Übersicht liegt auch auf `?`, aber nicht jeder probiert Tasten
          aus — und am Finger gibt es die Taste gar nicht. */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Kurzübersicht öffnen"
        title="Kurzübersicht (?)"
        className="tap grid size-9 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink md:size-8"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M6.2 6.1a1.9 1.9 0 113.1 1.6c-.6.45-1.05.8-1.05 1.6" strokeLinecap="round" />
          <path d="M8.25 11.4h.01" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </button>

      <ThemeToggle />
    </header>
  );
}
