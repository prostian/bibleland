import { create } from 'zustand';

/**
 * Zustand der Oberfläche selbst — nicht der Daten.
 *
 * Nötig geworden mit dem Handy-Layout: Karte und Zeitstrahl stehen dort
 * nicht mehr übereinander, sondern abwechselnd. Welche der beiden Ansichten
 * gerade vorn ist, wissen zwei Stellen gleichzeitig — die untere Leiste, die
 * umschaltet, und die Atlasseite, die zeichnet. Sie liegen im Baum
 * nebeneinander, also braucht es einen gemeinsamen Ort dafür.
 *
 * Getrennt von `useAtlasStore`, weil das dort nichts zu suchen hat: Karte,
 * Zeitstrahl und Wissensnetz teilen sich *Daten*sicht — welche davon auf
 * einem schmalen Bildschirm gerade sichtbar ist, ist eine reine
 * Darstellungsfrage.
 */

/** Die Ansichten, zwischen denen das Handy-Layout umschaltet. */
export type AtlasView = 'karte' | 'zeit';

interface UiState {
  atlasView: AtlasView;
  setAtlasView: (view: AtlasView) => void;

  /** Ist die Filterleiste offen? Auf schmalen Bildschirmen eine Überlagerung. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

/**
 * Auf breiten Bildschirmen steht die Filterleiste von Anfang an da; auf
 * schmalen wäre sie eine Überlagerung vor der Karte und bleibt zu, bis
 * jemand sie öffnet.
 */
function initialSidebar(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}

export const useUiStore = create<UiState>((set) => ({
  atlasView: 'karte',
  setAtlasView: (view) => set({ atlasView: view }),

  sidebarOpen: initialSidebar(),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
