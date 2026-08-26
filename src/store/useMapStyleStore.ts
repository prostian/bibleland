import { create } from 'zustand';

import { TILE_STYLES, type TileStyle, type TileStyleId } from '@/lib/tileStyles';

const STORAGE_KEY = 'bibleland-kartenstil';

interface MapStyleState {
  styleId: TileStyleId;
  setStyle: (id: TileStyleId) => void;
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
 * Der gewählte Kartenhintergrund, über Sitzungen hinweg gemerkt.
 *
 * Eigener Store statt Teil von `useAtlasStore`: Das hier ist eine dauerhafte
 * Vorliebe wie das Farbschema, kein Zustand der aktuellen Ansicht.
 */
export const useMapStyleStore = create<MapStyleState>((set) => ({
  styleId: readStored(),
  setStyle: (id) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* Privater Modus — die Wahl gilt dann nur für diese Sitzung. */
    }
    set({ styleId: id });
  },
}));

/** Der vollständige Stil zur gemerkten Kennung. */
export function useTileStyle(): TileStyle {
  const styleId = useMapStyleStore((s) => s.styleId);
  return TILE_STYLES[styleId];
}
