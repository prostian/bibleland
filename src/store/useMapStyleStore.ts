import { create } from 'zustand';

import { TILE_STYLES, type TileStyle, type TileStyleId } from '@/lib/tileStyles';

const STORAGE_KEY = 'bibleland-kartenstil';
const BORDERS_KEY = 'bibleland-grenzen';

/**
 * Wie die Ebene der historischen Grenzen gewählt wird.
 *
 * `auto` folgt dem, was man gerade betrachtet — wer im Zeitstrahl in die
 * Königszeit fährt, bekommt Israel und Juda. `fest` hält eine Epoche
 * unabhängig davon, etwa um die Provinzen der Missionsreisen stehen zu
 * lassen, während man ein einzelnes Ereignis anschaut.
 */
export type BordersMode = 'aus' | 'auto' | 'fest';

interface MapStyleState {
  styleId: TileStyleId;
  setStyle: (id: TileStyleId) => void;

  bordersMode: BordersMode;
  /** Nur bei `fest` von Bedeutung. */
  bordersEraId: string;
  setBordersMode: (mode: BordersMode) => void;
  setBordersEra: (eraId: string) => void;
}

function readStored(): TileStyleId {
  if (typeof localStorage === 'undefined') return 'deutsch';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'deutsch' || raw === 'neutral' ? raw : 'deutsch';
  } catch {
    return 'deutsch';
  }
}

/**
 * Die gemerkte Grenzeinstellung.
 *
 * Voreingestellt ist `auto`: Die Ebene ist der Grund, weshalb eine
 * Bibelkarte mehr zeigt als eine heutige Landkarte — sie erst einschalten zu
 * müssen hieße, sie den meisten vorzuenthalten.
 */
function readStoredBorders(): { mode: BordersMode; eraId: string } {
  const fallback = { mode: 'auto' as BordersMode, eraId: 'herodianisch' };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(BORDERS_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const { mode, eraId } = parsed as { mode?: unknown; eraId?: unknown };
    return {
      mode: mode === 'aus' || mode === 'auto' || mode === 'fest' ? mode : fallback.mode,
      eraId: typeof eraId === 'string' && eraId ? eraId : fallback.eraId,
    };
  } catch {
    return fallback;
  }
}

const storedBorders = readStoredBorders();

function writeStoredBorders(mode: BordersMode, eraId: string): void {
  try {
    localStorage.setItem(BORDERS_KEY, JSON.stringify({ mode, eraId }));
  } catch {
    /* Privater Modus — die Wahl gilt dann nur für diese Sitzung. */
  }
}

/**
 * Der gewählte Kartenhintergrund, über Sitzungen hinweg gemerkt.
 *
 * Eigener Store statt Teil von `useAtlasStore`: Das hier ist eine dauerhafte
 * Vorliebe wie das Farbschema, kein Zustand der aktuellen Ansicht.
 */
export const useMapStyleStore = create<MapStyleState>((set, get) => ({
  styleId: readStored(),
  setStyle: (id) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* Privater Modus — die Wahl gilt dann nur für diese Sitzung. */
    }
    set({ styleId: id });
  },

  bordersMode: storedBorders.mode,
  bordersEraId: storedBorders.eraId,

  setBordersMode: (mode) => {
    writeStoredBorders(mode, get().bordersEraId);
    set({ bordersMode: mode });
  },
  setBordersEra: (eraId) => {
    writeStoredBorders('fest', eraId);
    set({ bordersMode: 'fest', bordersEraId: eraId });
  },
}));

/** Der vollständige Stil zur gemerkten Kennung. */
export function useTileStyle(): TileStyle {
  const styleId = useMapStyleStore((s) => s.styleId);
  return TILE_STYLES[styleId];
}
